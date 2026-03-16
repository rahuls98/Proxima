# server/proxima/websocket/handler.py
"""
WebSocket handler for real-time training sessions with Gemini Live API.

This module manages the complete lifecycle of a training session:
1. Accepts WebSocket connection from client
2. Initializes Gemini Live session with system instruction and configuration
3. Orchestrates bidirectional streaming of audio, video, and text
4. Handles real-time reconnection on errors without losing state
5. Supports dynamic system instruction updates (e.g., persona changes mid-session)

Architecture:
    The handler runs 5 concurrent async tasks that communicate through queues:
    - websocket_sender: Sends events from outbound_queue to client
    - receive_from_client: Receives messages from client WebSocket
    - send_to_gemini: Streams audio frames to Gemini Live API
    - send_video_to_gemini: Streams video frames to Gemini Live API
    - receive_from_gemini: Receives events from Gemini Live API

    All tasks are orchestrated with proper error handling, backpressure management,
    and automatic reconnection on transport failures.

Key Features:
    - Automatic reconnection on errors (maintains session state)
    - Graceful handling of normal closes (code 1000) vs errors
    - Backpressure handling (drops old frames when network is slow)
    - Dynamic system instruction updates via client message
    - Screen share support with frame validation
    - File upload support with size limits
    - Health checks via ping/pong mechanism
"""

import asyncio
import base64
import json
import logging
from collections.abc import Callable
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect  # type: ignore

from services.gemini.live import GeminiLiveManager
from services.gemini.live.multi_participant_manager import MultiParticipantManager
from services.gemini.live.voice_manager import LiveVoiceManager

from ..config import build_live_config, resolve_mode, SYSTEM_PROMPTS
from ..storage import get_storage
from ..session_store import get_session_store


class ProximaAgentWebSocketHandler:
    """
    Handles client<->Gemini Live bidirectional streaming for training sessions.

    This handler manages the complete session lifecycle including connection setup,
    stream orchestration, error recovery, and graceful shutdown.
    """

    def __init__(
        self,
        manager_factory: Callable[[], GeminiLiveManager] = GeminiLiveManager,
        logger: logging.Logger | None = None,
    ):
        """
        Initialize the WebSocket handler.

        Args:
            manager_factory: Callable that creates GeminiLiveManager instances.
                Defaults to GeminiLiveManager class constructor.
            logger: Optional logger instance. If None, creates a new logger.
        """
        self.manager_factory = manager_factory
        self.logger = logger or logging.getLogger("proxima_agent_ws")

    async def run(self, websocket: WebSocket):
        """
        Main handler for a WebSocket connection.

        Lifecycle:
        1. Resolves mode from query params (defaults to "training")
        2. Accepts WebSocket connection
        3. Initializes Gemini Live manager and configuration
        4. Launches 5 concurrent tasks for streaming and orchestration
        5. Waits for first task to complete (triggers cleanup)
        6. Cancels remaining tasks and closes gracefully

        Args:
            websocket: FastAPI WebSocket connection from client.

        Message Types from Client:
            - stream_start: Enable audio input streaming
            - stream_stop: Disable audio input streaming
            - screen_share_start: Enable screen share (expects frames)
            - screen_share_stop: Disable screen share
            - screen_frame: Video frame (base64 encoded)
            - user_message: Text message from user
            - file_upload: File upload with validation
            - ping: Health check (responds with pong)
            - set_system_instruction: Dynamic persona update
            - disconnect/end_session: Close connection

        Event Types to Client:
            - stream_started/stream_stopped: Audio state
            - audio: PCM audio frames (base64 encoded)
            - interruption: User interrupted agent
            - turn_complete: Agent finished speaking turn
            - waiting_for_input: Agent waiting for user
            - user_text/text: Transcription of user/agent speech
            - pong: Response to ping
            - session_ready: Initial ready signal
            - warning: Non-fatal error notification
            - error: Fatal error notification
            - file_uploaded: File upload confirmation
        """
        mode = resolve_mode(websocket.query_params.get("mode"))
        base_instruction = str(SYSTEM_PROMPTS[mode])
        system_instruction = base_instruction
        voice_manager = LiveVoiceManager()
        voice_name = None
        await websocket.accept()
        self.logger.info("proxima-agent websocket accepted (mode=%s)", mode)

        # Initialize session storage
        session_store = get_session_store()
        session_id = websocket.query_params.get("session_id")
        
        # Check for teammate config in query params (base64-encoded JSON)
        teammate_config_b64 = websocket.query_params.get("teammate_config")
        teammate_config = None
        if teammate_config_b64:
            try:
                teammate_config_json = base64.b64decode(teammate_config_b64).decode("utf-8")
                teammate_config = json.loads(teammate_config_json)
                self.logger.info("Received teammate config: %s", teammate_config.get("teammate_name"))
            except Exception as exc:
                self.logger.warning("Failed to decode teammate_config: %s", exc)
        
        if not session_id:
            session_id = session_store.create_session(mode=mode, teammate_config=teammate_config)
        session_store.start_session(session_id)
        self.logger.info("Session tracking enabled (session_id=%s)", session_id)

        selected_voice = None
        try:
            context_record = get_storage().get_session_context(session_id) or {}
            session_context = context_record.get("session_context") or {}
            stored_voice_name = session_context.get("voice_name")
            stored_voice_gender = session_context.get("voice_gender")
            stored_voice_tone = session_context.get("voice_tone")

            if isinstance(stored_voice_name, str) and stored_voice_name.strip():
                selected_voice = voice_manager.get_voice_by_name(
                    stored_voice_name
                )

            if not selected_voice:
                selected_voice = voice_manager.get_random_voice(
                    gender_filter=stored_voice_gender
                    if isinstance(stored_voice_gender, str)
                    else None,
                    tone_filter=stored_voice_tone
                    if isinstance(stored_voice_tone, str)
                    else None,
                )

            voice_name = selected_voice.name

            # Ensure stored session context reflects the actual voice metadata.
            if session_context:
                updated_context = {
                    **session_context,
                    "voice_name": selected_voice.name,
                    "voice_gender": selected_voice.gender,
                    "voice_tone": selected_voice.tone,
                    "prospect_gender": session_context.get("prospect_gender")
                    or selected_voice.gender,
                }
                if updated_context != session_context:
                    get_storage().set_session_context(
                        session_id,
                        {
                            "persona_instruction": context_record.get(
                                "persona_instruction"
                            ),
                            "session_context": updated_context,
                        },
                    )
        except Exception:
            selected_voice = voice_manager.get_random_voice()
            voice_name = selected_voice.name

        if not voice_name:
            voice_name = voice_manager.get_random_voice().name

        # Initialize Gemini manager (single-participant by default, or
        # multi-participant when teammate config is provided by the client).
        is_multi_participant = bool(
            isinstance(teammate_config, dict)
            and teammate_config.get("teammate_enabled") is True
        )

        manager: GeminiLiveManager | MultiParticipantManager
        config = None
        live_tools = None

        if is_multi_participant:
            self.logger.info(
                "Initializing multi-participant session (teammate=%s, archetype=%s)",
                teammate_config.get("teammate_name"),
                teammate_config.get("behavior_archetype"),
            )

            temp_manager = self.manager_factory()
            if hasattr(temp_manager, "live_tool_declarations"):
                live_tools = temp_manager.live_tool_declarations()

            prospect_config = build_live_config(
                system_instruction,
                mode,
                voice_name=voice_name,
                tools=live_tools,
            )
            manager = MultiParticipantManager(
                teammate_config=teammate_config,
                prospect_config=prospect_config,
            )
        else:
            manager = self.manager_factory()
            if hasattr(manager, "live_tool_declarations"):
                live_tools = manager.live_tool_declarations()
            config = build_live_config(
                system_instruction,
                mode,
                voice_name=voice_name,
                tools=live_tools,
            )

        # Communication queues for inter-task messaging
        outbound_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        audio_in_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=64)
        video_in_queue: asyncio.Queue[tuple[bytes, str]] = asyncio.Queue(maxsize=4)

        # Task references for lifecycle management
        sender_task: asyncio.Task | None = None
        send_task: asyncio.Task | None = None
        receive_task: asyncio.Task | None = None
        video_send_task: asyncio.Task | None = None
        client_task: asyncio.Task | None = None

        # Synchronization and state
        reconnect_lock = asyncio.Lock()
        stream_enabled = True
        screen_share_enabled = False

        # ============================================================================
        # Task 1: websocket_sender
        # ============================================================================
        async def enqueue_outbound(message: dict[str, Any]):
            """Queue outbound message for sending to client.
            
            Drops late audio frames on backpressure (queue size > 256) to maintain
            responsiveness when network is slow.
            """
            if message.get("type") == "audio" and outbound_queue.qsize() > 256:
                return
            await outbound_queue.put(message)

        async def enqueue_audio(chunk: bytes):
            """Queue audio chunk for sending to Gemini.
            
            Drops oldest frames if queue is full (maxsize=64) to maintain low latency.
            """
            while audio_in_queue.full():
                try:
                    audio_in_queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
            await audio_in_queue.put(chunk)

        async def enqueue_video(frame_data: bytes, mime_type: str):
            """Queue video frame for sending to Gemini.
            
            Drops oldest frames if queue is full (maxsize=4) to maintain freshness.
            """
            while video_in_queue.full():
                try:
                    video_in_queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
            await video_in_queue.put((frame_data, mime_type))

        async def websocket_sender():
            """Send all outbound messages to client WebSocket."""
            while True:
                payload = await outbound_queue.get()
                await websocket.send_json(payload)

        # ============================================================================
        # Reconnection Logic
        # ============================================================================
        async def reconnect_live_session(reason: str):
            """Close and reconnect Gemini Live session.
            
            This is used when:
            - System instruction is updated (persona change)
            - Transport error occurs and we need to reset
            
            The manager.connect/close cycle resets the underlying WebSocket while
            maintaining all application-level state.
            
            Args:
                reason: Human-readable reason for reconnection (for logging)
            """
            nonlocal stream_enabled
            async with reconnect_lock:
                self.logger.warning("Restarting proxima-agent Gemini session: %s", reason)
                # Clear input queues to prevent stale frames from being sent
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
                # Connect based on manager type
                if is_multi_participant:
                    await manager.connect()  # MultiParticipantManager doesn't need config arg
                else:
                    if config is None:
                        self.logger.error("Cannot reconnect: config is None for single-participant session")
                        raise RuntimeError("Configuration not initialized for single-participant session")
                    await manager.connect(config)
                stream_enabled = True
                await enqueue_outbound(
                    {
                        "type": "warning",
                        "message": "Live session reconnected. Audio stream continues.",
                    }
                )
                await enqueue_outbound({
                    "type": "session_ready",
                    "mode": mode,
                    "session_id": session_id,
                })

        # ============================================================================
        # Task 2: send_to_gemini
        # ============================================================================
        async def send_to_gemini():
            """Stream audio frames from audio_in_queue to Gemini Live API.
            
            Gracefully handles:
            - Connection close code 1000 (normal, from reconnect elsewhere)
            - Connection close code 1011 or other errors (triggers reconnect)
            """
            while True:
                pcm = await audio_in_queue.get()
                try:
                    await manager.stream_input(pcm, sample_rate=16000)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    exc_str = str(exc)
                    if "1000" not in exc_str:
                        self.logger.exception("stream_input failed")
                        await reconnect_live_session(f"stream_input failure: {exc}")

        # ============================================================================
        # Task 3: send_video_to_gemini
        # ============================================================================
        async def send_video_to_gemini():
            """Stream video frames from video_in_queue to Gemini Live API.
            
            Gracefully handles:
            - Connection close code 1000 (normal, from reconnect elsewhere)
            - Connection close code 1011 or other errors (triggers reconnect)
            """
            while True:
                frame_data, mime_type = await video_in_queue.get()
                try:
                    await manager.stream_video_input(frame_data, mime_type=mime_type)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    exc_str = str(exc)
                    if "1000" not in exc_str:
                        self.logger.exception("stream_video_input failed")
                        await reconnect_live_session(f"stream_video_input failure: {exc}")

        # ============================================================================
        # Task 4: receive_from_gemini
        # ============================================================================
        async def receive_from_gemini():
            """Receive events from Gemini Live API and forward to client.
            
            Event types handled:
            - audio: PCM frames (base64 encoded and sent to client)
            - interruption/turn_complete/waiting_for_input: State change notifications
            - user_text/text: Transcription of user/agent speech
            
            Error handling:
            - Normal close (1000): Sleep and retry (manager reconnected elsewhere)
            - Other errors: Log and trigger full reconnection
            """
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
                            # Store transcript message
                            # For multi-participant sessions, use the speaker tag from the event
                            if "speaker" in event:
                                speaker = event["speaker"]
                            else:
                                speaker = "rep" if event["type"] == "user_text" else "prospect"
                            
                            session_store.add_message(
                                session_id=session_id,
                                speaker=speaker,
                                text=event["text"],
                            )
                            
                            await enqueue_outbound(
                                {
                                    "type": event["type"],
                                    "text": event["text"],
                                    "speaker": speaker,  # Include speaker in outbound event
                                }
                            )
                            continue

                        # Handle coaching UI events
                        if event["type"] == "ui_event" and event.get("sub_type") == "coaching":
                            coaching_data = event.get("data", {})
                            session_store.add_message(
                                session_id=session_id,
                                speaker="coach",
                                text=(
                                    f"{coaching_data.get('intervention_type', 'COACHING')}: "
                                    f"{coaching_data.get('suggested_action', '')}".strip()
                                ),
                            )
                            await enqueue_outbound(
                                {
                                    "type": "coach_intervention",
                                    "payload": {
                                        "category": coaching_data.get("intervention_type"),
                                        "hint": coaching_data.get("suggested_action"),
                                    },
                                }
                            )
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    exc_str = str(exc)
                    # Normal close from reconnect (code 1000) or stream-end
                    # during a reconnect that was already handled elsewhere.
                    # Just sleep and retry — do NOT trigger another reconnect.
                    if "1000" in exc_str or "stream ended" in exc_str.lower():
                        await asyncio.sleep(0.2)
                        continue
                    self.logger.exception("receive_from_gemini failed")
                    await reconnect_live_session(f"receive failure: {exc}")
                    await asyncio.sleep(0.2)

        # ============================================================================
        # Task 5: receive_from_client
        # ============================================================================
        async def receive_from_client():
            """Receive and process messages from client WebSocket.
            
            Common message types:
            - stream_start/stop: Control audio input
            - screen_frame: Screen share video frame (base64)
            - user_message: Text input from user
            - file_upload: File upload with content and validation
            - set_system_instruction: Update persona mid-session
            
            Complex message handling includes:
            - Base64 decoding with validation
            - File size limits (max 20MB)
            - Screen frame MIME type handling
            - File upload persistence and summary requests
            """
            nonlocal screen_share_enabled, stream_enabled, system_instruction, config
            while True:
                message = await websocket.receive()

                if message.get("type") == "websocket.disconnect":
                    raise WebSocketDisconnect

                if message.get("bytes"):
                    if stream_enabled:
                        # ---- Global Interruption (Doc 2, §1-2) ----
                        # On every audio frame from the user, immediately:
                        #   1. Drain any pending agent audio from outbound_queue so
                        #      the user's speaker is cleared (Server-Side Audio Muting).
                        #   2. Signal the manager to seize the floor, which explicitly
                        #      interrupts the teammate session if it is mid-speech.
                        #      (Prospect interruption is handled by its own VAD.)
                        if is_multi_participant and isinstance(manager, MultiParticipantManager):
                            # Drain audio chunks from outbound_queue, keeping
                            # non-audio events (text, interruption, etc.) intact.
                            _drained: list[dict] = []
                            while not outbound_queue.empty():
                                try:
                                    _item = outbound_queue.get_nowait()
                                    if _item.get("type") != "audio":
                                        _drained.append(_item)
                                except asyncio.QueueEmpty:
                                    break
                            for _item in _drained:
                                outbound_queue.put_nowait(_item)

                            # Signal agents (teammate needs explicit interrupt).
                            try:
                                await manager.user_interrupt_agents()
                            except Exception:
                                pass  # non-fatal; user audio still forwarded below

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
                elif msg_type == "activity_end":
                    if hasattr(manager, "send_activity_end"):
                        try:
                            await manager.send_activity_end()
                        except Exception:
                            self.logger.exception(
                                "Failed to send activity end to Gemini"
                            )
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
                elif msg_type == "set_system_instruction":
                    # Receive dynamic system instruction from client
                    new_instruction = payload.get("instruction")
                    if new_instruction:
                        combined_instruction = (
                            f"{base_instruction}\n\n# Persona\n{new_instruction}"
                        )
                        if combined_instruction != system_instruction:
                            system_instruction = combined_instruction
                            if is_multi_participant and isinstance(
                                manager, MultiParticipantManager
                            ):
                                manager.prospect_config = build_live_config(
                                    system_instruction,
                                    mode,
                                    voice_name=voice_name,
                                    tools=live_tools,
                                )
                            else:
                                config = build_live_config(
                                    system_instruction,
                                    mode,
                                    voice_name=voice_name,
                                    tools=live_tools,
                                )
                        self.logger.info("System instruction updated from client")
                        # Reconnect with new system instruction
                        await reconnect_live_session("system instruction update")
                elif msg_type in {"disconnect", "end_session"}:
                    return

        try:
            # Connect based on manager type
            if is_multi_participant:
                await manager.connect()  # MultiParticipantManager doesn't need config arg
            else:
                if config is None:
                    self.logger.error("Cannot initialize: config is None for single-participant session")
                    raise RuntimeError("Configuration not initialized for single-participant session")
                await manager.connect(config)
            self.logger.info("proxima-agent Gemini session connected")
            await enqueue_outbound({
                "type": "session_ready",
                "mode": mode,
                "session_id": session_id,
            })

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
            # Mark session as ended
            session_store.end_session(session_id)
            try:
                session = session_store.get_session(session_id)
                if session:
                    get_storage().set_session_transcript(
                        session_id,
                        {
                            "transcript": session.transcript,
                            "created_at": session.created_at,
                            "started_at": session.started_at,
                            "ended_at": session.ended_at,
                            "duration_seconds": session.get_duration(),
                            "mode": session.mode,
                        },
                    )
            except Exception:
                self.logger.exception("Failed to persist session transcript")
            
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
            self.logger.info("proxima-agent websocket closed (session_id=%s)", session_id)
