import asyncio
import base64
import json
import logging
from collections.abc import Callable
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from services.gemini_live import GeminiLiveManager

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
        config = build_live_config(mode)

        outbound_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        audio_in_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=64)

        sender_task: asyncio.Task | None = None
        send_task: asyncio.Task | None = None
        receive_task: asyncio.Task | None = None
        client_task: asyncio.Task | None = None

        reconnect_lock = asyncio.Lock()
        stream_enabled = True

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
            nonlocal stream_enabled
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
            receive_task = asyncio.create_task(receive_from_gemini())
            client_task = asyncio.create_task(receive_from_client())

            done, pending = await asyncio.wait(
                [sender_task, send_task, receive_task, client_task],
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
            for task in [sender_task, send_task, receive_task, client_task]:
                if task is not None and not task.done():
                    task.cancel()
            await asyncio.gather(
                *[task for task in [sender_task, send_task, receive_task, client_task] if task],
                return_exceptions=True,
            )
            await manager.close()
            self.logger.info("proxima-agent websocket closed")
