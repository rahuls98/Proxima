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


if __name__ == "__main__":
    unittest.main()
