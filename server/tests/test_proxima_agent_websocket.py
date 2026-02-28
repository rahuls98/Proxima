"""
High-level websocket tests for the proxima-agent endpoint.

Purpose:
- Validate server-side websocket protocol behavior for the Proxima agent.
- Verify stream control semantics (start/stop) and event forwarding contract.
- Guarantee tests are hermetic: no real Gemini API calls and no network dependency.

Approach:
- Build a local FastAPI app in test setup.
- Inject `ProximaAgentWebSocketHandler` with `FakeManager`.
- Simulate Gemini responses through scripted fake events.
"""

import base64
import logging
import sys
import time
import unittest
from pathlib import Path

from fastapi import FastAPI, WebSocket
from fastapi.testclient import TestClient

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from proxima_agent import ProximaAgentWebSocketHandler  # noqa: E402


class FakeManager:
    last_instance = None
    scripted_events = []

    def __init__(self):
        FakeManager.last_instance = self
        self.session = None
        self.streamed_audio = []
        self.streamed_video = []
        self.sent_text_messages = []
        self.uploaded_files = {}
        self.summary_requests = []
        self.connected = False
        self.last_config = None

    async def connect(self, config):
        self.last_config = config
        self.connected = True
        self.session = object()

    async def close(self):
        self.connected = False
        self.session = None

    async def stream_input(self, pcm_data: bytes, sample_rate: int = 16000):
        self.streamed_audio.append((pcm_data, sample_rate))

    async def stream_video_input(self, frame_data: bytes, mime_type: str = "image/jpeg"):
        self.streamed_video.append((frame_data, mime_type))

    def live_tool_declarations(self):
        return []

    async def send_text_message(self, text: str, turn_complete: bool = True):
        self.sent_text_messages.append((text, turn_complete))

    def store_uploaded_file(self, *, file_name: str, mime_type: str, data: bytes) -> str:
        file_id = f"file-{len(self.uploaded_files) + 1}"
        self.uploaded_files[file_id] = {
            "file_name": file_name,
            "mime_type": mime_type,
            "data": data,
        }
        return file_id

    async def request_uploaded_file_summary(self, *, file_id: str, file_name: str, mime_type: str):
        self.summary_requests.append(
            {
                "file_id": file_id,
                "file_name": file_name,
                "mime_type": mime_type,
            }
        )

    async def iter_events(self):
        if FakeManager.scripted_events:
            events = FakeManager.scripted_events.pop(0)
            for event in events:
                yield event
        else:
            while True:
                await __import__("asyncio").sleep(0.05)


class ProximaAgentWebSocketTests(unittest.TestCase):
    """
    Covers three core behaviors:
    1) Session handshake + stream toggle acknowledgements.
    2) Audio forwarding gate when stream is stopped/started.
    3) Normalized Gemini event forwarding (user text, bot text, audio, turn completion).
    """

    def setUp(self):
        self.handler = ProximaAgentWebSocketHandler(
            manager_factory=FakeManager,
            logger=logging.getLogger("proxima_agent_ws_test"),
        )
        self.app = FastAPI()

        @self.app.websocket("/ws/proxima-agent")
        async def proxima_agent_websocket(websocket: WebSocket):
            await self.handler.run(websocket)

    def tearDown(self):
        FakeManager.scripted_events = []
        FakeManager.last_instance = None

    def test_session_ready_and_stream_toggle_messages(self):
        """Ensures websocket handshake emits `session_ready` and stream toggles are acknowledged."""
        with TestClient(self.app) as client:
            with client.websocket_connect("/ws/proxima-agent") as ws:
                ready = ws.receive_json()
                self.assertEqual(ready["type"], "session_ready")
                self.assertEqual(ready["mode"], "training")

                ws.send_json({"type": "stream_stop"})
                stopped = ws.receive_json()
                self.assertEqual(stopped["type"], "stream_stopped")

                ws.send_json({"type": "stream_start"})
                started = ws.receive_json()
                self.assertEqual(started["type"], "stream_started")

                ws.send_json({"type": "disconnect"})

    def test_mode_parameter_falls_back_to_training(self):
        """Ensures unsupported websocket mode values safely fall back to `training`."""
        with TestClient(self.app) as client:
            with client.websocket_connect("/ws/proxima-agent?mode=unknown") as ws:
                ready = ws.receive_json()
                self.assertEqual(ready["type"], "session_ready")
                self.assertEqual(ready["mode"], "training")
                self.assertEqual(
                    FakeManager.last_instance.last_config.system_instruction,
                    "You are Proxima Agent in training mode. Be concise, clear, and conversational in voice responses.",
                )
                ws.send_json({"type": "disconnect"})

    def test_stream_input_respects_stream_stop(self):
        """Verifies binary audio is ignored while stopped and forwarded after stream restart."""
        with TestClient(self.app) as client:
            with client.websocket_connect("/ws/proxima-agent") as ws:
                _ = ws.receive_json()

                ws.send_json({"type": "stream_stop"})
                _ = ws.receive_json()
                ws.send_bytes(b"ignored")
                time.sleep(0.05)
                self.assertEqual(FakeManager.last_instance.streamed_audio, [])

                ws.send_json({"type": "stream_start"})
                _ = ws.receive_json()
                ws.send_bytes(b"accepted")
                time.sleep(0.05)
                self.assertEqual(len(FakeManager.last_instance.streamed_audio), 1)
                self.assertEqual(FakeManager.last_instance.streamed_audio[0][0], b"accepted")

                ws.send_json({"type": "disconnect"})

    def test_forwards_text_and_audio_from_gemini(self):
        """Checks normalized fake Gemini events are emitted to client with correct payload mapping."""
        FakeManager.scripted_events = [
            [
                {"type": "user_text", "text": "hello"},
                {"type": "text", "text": "Hi there"},
                {"type": "audio", "data": b"\x00\x01", "mime_type": "audio/pcm;rate=24000"},
                {"type": "turn_complete"},
            ]
        ]

        with TestClient(self.app) as client:
            with client.websocket_connect("/ws/proxima-agent") as ws:
                # Session ready is always first.
                self.assertEqual(ws.receive_json()["type"], "session_ready")

                user_text = ws.receive_json()
                bot_text = ws.receive_json()
                audio = ws.receive_json()
                turn_complete = ws.receive_json()

                self.assertEqual(user_text, {"type": "user_text", "text": "hello"})
                self.assertEqual(bot_text, {"type": "text", "text": "Hi there"})
                self.assertEqual(audio["type"], "audio")
                self.assertEqual(audio["mimeType"], "audio/pcm;rate=24000")
                self.assertEqual(base64.b64decode(audio["audio"]), b"\x00\x01")
                self.assertEqual(turn_complete["type"], "turn_complete")

                ws.send_json({"type": "disconnect"})

    def test_streams_screen_frames_when_screen_share_enabled(self):
        """Ensures screen frame payloads are forwarded to Gemini only after start signal."""
        with TestClient(self.app) as client:
            with client.websocket_connect("/ws/proxima-agent") as ws:
                _ = ws.receive_json()

                ws.send_json(
                    {
                        "type": "screen_frame",
                        "image": base64.b64encode(b"frame-before-start").decode("ascii"),
                        "mimeType": "image/jpeg",
                    }
                )
                time.sleep(0.05)
                self.assertEqual(FakeManager.last_instance.streamed_video, [])

                ws.send_json({"type": "screen_share_start"})
                ws.send_json(
                    {
                        "type": "screen_frame",
                        "image": base64.b64encode(b"frame-after-start").decode("ascii"),
                        "mimeType": "image/jpeg",
                    }
                )
                time.sleep(0.05)
                self.assertEqual(len(FakeManager.last_instance.streamed_video), 1)
                self.assertEqual(
                    FakeManager.last_instance.streamed_video[0],
                    (b"frame-after-start", "image/jpeg"),
                )

                ws.send_json({"type": "screen_share_stop"})
                ws.send_json(
                    {
                        "type": "screen_frame",
                        "image": base64.b64encode(b"frame-after-stop").decode("ascii"),
                        "mimeType": "image/jpeg",
                    }
                )
                time.sleep(0.05)
                self.assertEqual(len(FakeManager.last_instance.streamed_video), 1)

                ws.send_json({"type": "disconnect"})

    def test_forwards_user_chat_messages_to_manager(self):
        """Ensures text chat messages are forwarded as live user turns."""
        with TestClient(self.app) as client:
            with client.websocket_connect("/ws/proxima-agent") as ws:
                _ = ws.receive_json()

                ws.send_json({"type": "user_message", "text": "Summarize the last upload"})
                time.sleep(0.05)

                self.assertEqual(len(FakeManager.last_instance.sent_text_messages), 1)
                self.assertEqual(
                    FakeManager.last_instance.sent_text_messages[0][0],
                    "Summarize the last upload",
                )

                ws.send_json({"type": "disconnect"})

    def test_file_upload_persists_payload_and_requests_summary(self):
        """Verifies file uploads are stored and trigger summary request workflow."""
        with TestClient(self.app) as client:
            with client.websocket_connect("/ws/proxima-agent") as ws:
                _ = ws.receive_json()

                ws.send_json(
                    {
                        "type": "file_upload",
                        "fileName": "agenda.pdf",
                        "mimeType": "application/pdf",
                        "data": base64.b64encode(b"pdf-bytes").decode("ascii"),
                    }
                )

                uploaded = ws.receive_json()
                self.assertEqual(uploaded["type"], "file_uploaded")
                self.assertEqual(uploaded["fileName"], "agenda.pdf")

                self.assertEqual(len(FakeManager.last_instance.uploaded_files), 1)
                stored = FakeManager.last_instance.uploaded_files[uploaded["fileId"]]
                self.assertEqual(stored["file_name"], "agenda.pdf")
                self.assertEqual(stored["mime_type"], "application/pdf")
                self.assertEqual(stored["data"], b"pdf-bytes")

                self.assertEqual(len(FakeManager.last_instance.summary_requests), 1)
                self.assertEqual(
                    FakeManager.last_instance.summary_requests[0],
                    {
                        "file_id": uploaded["fileId"],
                        "file_name": "agenda.pdf",
                        "mime_type": "application/pdf",
                    },
                )

                ws.send_json({"type": "disconnect"})


if __name__ == "__main__":
    unittest.main()
