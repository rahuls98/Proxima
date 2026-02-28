import asyncio
import base64
import json
import logging
from collections.abc import Callable
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from services.gemini.live import GeminiLiveManager

from .config import build_live_config, resolve_mode


class ProximaAgentWebSocketHandler:
    """Handles client<->Gemini live audio streaming for a continuous training agent."""

    def __init__(
        self,
        manager_factory: Callable[[], GeminiLiveManager] = GeminiLiveManager,
        logger: logging.Logger | None = None,
    ):
        self.manager_factory = manager_factory
        self.logger = logger or logging.getLogger("proxima_agent_ws")

    async def run(self, websocket: WebSocket):
        mode = resolve_mode(websocket.query_params.get("mode"))
        await websocket.accept()
        self.logger.info("proxima-agent websocket accepted (mode=%s)", mode)

        manager = self.manager_factory()
        live_tools = None
        if hasattr(manager, "live_tool_declarations"):
            live_tools = manager.live_tool_declarations()
        config = build_live_config(mode, tools=live_tools)

        outbound_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        audio_in_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=64)
        video_in_queue: asyncio.Queue[tuple[bytes, str]] = asyncio.Queue(maxsize=4)

        sender_task: asyncio.Task | None = None
        send_task: asyncio.Task | None = None
        receive_task: asyncio.Task | None = None
        video_send_task: asyncio.Task | None = None
        client_task: asyncio.Task | None = None

        reconnect_lock = asyncio.Lock()
        stream_enabled = True
        screen_share_enabled = False

        async def enqueue_outbound(message: dict[str, Any]):
            # Drop late audio frames when network/UI is back-pressured.
            if message.get("type") == "audio" and outbound_queue.qsize() > 256:
                return
            await outbound_queue.put(message)

        async def enqueue_audio(chunk: bytes):
            while audio_in_queue.full():
                try:
                    audio_in_queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
            await audio_in_queue.put(chunk)

        async def enqueue_video(frame_data: bytes, mime_type: str):
            while video_in_queue.full():
                try:
                    video_in_queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
            await video_in_queue.put((frame_data, mime_type))

        async def websocket_sender():
            while True:
                payload = await outbound_queue.get()
                await websocket.send_json(payload)

        async def reconnect_live_session(reason: str):
            nonlocal stream_enabled
            async with reconnect_lock:
                self.logger.warning("Restarting proxima-agent Gemini session: %s", reason)
                while not audio_in_queue.empty():
                    try:
                        audio_in_queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break
                while not video_in_queue.empty():
                    try:
                        video_in_queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break

                await manager.close()
                await manager.connect(config)
                stream_enabled = True
                await enqueue_outbound(
                    {
                        "type": "warning",
                        "message": "Live session reconnected. Audio stream continues.",
                    }
                )
                await enqueue_outbound({"type": "session_ready", "mode": mode})

        async def send_to_gemini():
            while True:
                pcm = await audio_in_queue.get()
                try:
                    await manager.stream_input(pcm, sample_rate=16000)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    self.logger.exception("stream_input failed")
                    await reconnect_live_session(f"stream_input failure: {exc}")

        async def send_video_to_gemini():
            while True:
                frame_data, mime_type = await video_in_queue.get()
                try:
                    await manager.stream_video_input(frame_data, mime_type=mime_type)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    self.logger.exception("stream_video_input failed")
                    await reconnect_live_session(f"stream_video_input failure: {exc}")

        async def receive_from_gemini():
            while True:
                try:
                    if manager.session is None:
                        await asyncio.sleep(0.05)
                        continue

                    async for event in manager.iter_events():
                        if event["type"] == "audio":
                            await enqueue_outbound(
                                {
                                    "type": "audio",
                                    "audio": base64.b64encode(event["data"]).decode("ascii"),
                                    "mimeType": event.get("mime_type", "audio/pcm;rate=24000"),
                                }
                            )
                            continue

                        if event["type"] in {
                            "interruption",
                            "turn_complete",
                            "waiting_for_input",
                        }:
                            await enqueue_outbound({"type": event["type"]})
                            continue

                        if event["type"] in {"user_text", "text"} and event.get("text"):
                            await enqueue_outbound(
                                {
                                    "type": event["type"],
                                    "text": event["text"],
                                }
                            )
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    self.logger.exception("receive_from_gemini failed")
                    await reconnect_live_session(f"receive failure: {exc}")
                    await asyncio.sleep(0.1)

        async def receive_from_client():
            nonlocal screen_share_enabled, stream_enabled
            while True:
                message = await websocket.receive()

                if message.get("type") == "websocket.disconnect":
                    raise WebSocketDisconnect

                if message.get("bytes"):
                    if stream_enabled:
                        await enqueue_audio(message["bytes"])
                    continue

                text = message.get("text")
                if not text:
                    continue

                try:
                    payload = json.loads(text)
                except json.JSONDecodeError:
                    continue

                msg_type = payload.get("type")
                if msg_type == "stream_start":
                    stream_enabled = True
                    await enqueue_outbound({"type": "stream_started"})
                elif msg_type == "stream_stop":
                    stream_enabled = False
                    await enqueue_outbound({"type": "stream_stopped"})
                elif msg_type == "screen_share_start":
                    screen_share_enabled = True
                elif msg_type == "screen_share_stop":
                    screen_share_enabled = False
                    while not video_in_queue.empty():
                        try:
                            video_in_queue.get_nowait()
                        except asyncio.QueueEmpty:
                            break
                elif msg_type == "screen_frame":
                    if not screen_share_enabled:
                        continue
                    image_b64 = payload.get("image")
                    if not image_b64:
                        continue
                    mime_type = payload.get("mimeType") or "image/jpeg"
                    try:
                        frame_data = base64.b64decode(image_b64, validate=True)
                    except Exception:
                        await enqueue_outbound(
                            {
                                "type": "warning",
                                "message": "Discarded invalid screen frame payload.",
                            }
                        )
                        continue
                    await enqueue_video(frame_data, mime_type)
                elif msg_type == "user_message":
                    text = payload.get("text")
                    if not text or not hasattr(manager, "send_text_message"):
                        continue
                    try:
                        await manager.send_text_message(text)
                    except Exception as exc:
                        self.logger.exception("Failed to send user text message")
                        await enqueue_outbound(
                            {
                                "type": "warning",
                                "message": f"Unable to send chat message: {exc}",
                            }
                        )
                elif msg_type == "file_upload":
                    if not hasattr(manager, "store_uploaded_file"):
                        await enqueue_outbound(
                            {
                                "type": "warning",
                                "message": "File upload tools are not available in this session.",
                            }
                        )
                        continue

                    file_name = (payload.get("fileName") or "uploaded-file").strip()
                    mime_type = (payload.get("mimeType") or "application/octet-stream").strip()
                    data_b64 = payload.get("data")

                    if not data_b64:
                        await enqueue_outbound(
                            {
                                "type": "warning",
                                "message": "File upload payload is missing data.",
                            }
                        )
                        continue

                    try:
                        file_bytes = base64.b64decode(data_b64, validate=True)
                    except Exception:
                        await enqueue_outbound(
                            {
                                "type": "warning",
                                "message": "Discarded invalid file upload payload.",
                            }
                        )
                        continue

                    if len(file_bytes) == 0:
                        await enqueue_outbound(
                            {
                                "type": "warning",
                                "message": "Discarded empty file upload.",
                            }
                        )
                        continue

                    max_upload_bytes = 20 * 1024 * 1024
                    if len(file_bytes) > max_upload_bytes:
                        await enqueue_outbound(
                            {
                                "type": "warning",
                                "message": "File too large. Maximum upload size is 20MB.",
                            }
                        )
                        continue

                    try:
                        file_id = manager.store_uploaded_file(
                            file_name=file_name,
                            mime_type=mime_type,
                            data=file_bytes,
                        )
                    except Exception as exc:
                        self.logger.exception("Failed to persist uploaded file")
                        await enqueue_outbound(
                            {
                                "type": "warning",
                                "message": f"Failed to process uploaded file: {exc}",
                            }
                        )
                        continue

                    await enqueue_outbound(
                        {
                            "type": "file_uploaded",
                            "fileId": file_id,
                            "fileName": file_name,
                            "mimeType": mime_type,
                        }
                    )

                    if hasattr(manager, "request_uploaded_file_summary"):
                        try:
                            await manager.request_uploaded_file_summary(
                                file_id=file_id,
                                file_name=file_name,
                                mime_type=mime_type,
                            )
                        except Exception as exc:
                            self.logger.exception("Failed to request file summary")
                            await enqueue_outbound(
                                {
                                    "type": "warning",
                                    "message": (
                                        "File uploaded, but summary request failed. "
                                        f"Error: {exc}"
                                    ),
                                }
                            )
                elif msg_type == "ping":
                    await enqueue_outbound({"type": "pong"})
                elif msg_type in {"disconnect", "end_session"}:
                    return

        try:
            await manager.connect(config)
            self.logger.info("proxima-agent Gemini session connected")
            await enqueue_outbound({"type": "session_ready", "mode": mode})

            sender_task = asyncio.create_task(websocket_sender())
            send_task = asyncio.create_task(send_to_gemini())
            video_send_task = asyncio.create_task(send_video_to_gemini())
            receive_task = asyncio.create_task(receive_from_gemini())
            client_task = asyncio.create_task(receive_from_client())

            done, pending = await asyncio.wait(
                [sender_task, send_task, video_send_task, receive_task, client_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)

            for task in done:
                exc = task.exception()
                if exc and not isinstance(exc, WebSocketDisconnect):
                    raise exc

        except WebSocketDisconnect:
            pass
        except Exception as exc:
            self.logger.exception("Unhandled error in /ws/proxima-agent")
            try:
                await websocket.send_json({"type": "error", "message": str(exc)})
            except Exception:
                pass
            try:
                await websocket.close(code=1011, reason="Server error")
            except Exception:
                pass
        finally:
            for task in [sender_task, send_task, video_send_task, receive_task, client_task]:
                if task is not None and not task.done():
                    task.cancel()
            await asyncio.gather(
                *[
                    task
                    for task in [sender_task, send_task, video_send_task, receive_task, client_task]
                    if task
                ],
                return_exceptions=True,
            )
            await manager.close()
            self.logger.info("proxima-agent websocket closed")
