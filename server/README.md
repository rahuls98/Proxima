# Server: Proxima Agent WebSocket API

## Overview

The server exposes a single real-time endpoint for continuous audio conversation:

- `ws://localhost:8000/ws/proxima-agent`

The endpoint manages:

- Continuous microphone audio input from browser
- Streaming audio output from Gemini Live
- User and model transcript streaming
- Interruption signaling
- Automatic reconnection of the Gemini Live session on stream failures

## Module Structure

- `main.py`: FastAPI app wiring, CORS, route registration
- `proxima_agent/config.py`: Mode-aware Gemini Live session configuration and prompts
- `proxima_agent/handler.py`: WebSocket session orchestration logic
- `services/gemini_live/live_manager.py`: Gemini SDK wrapper

## Protocol

### Client -> Server

- `{"type":"stream_start"}`: Enable mic forwarding to Gemini
- `{"type":"stream_stop"}`: Disable mic forwarding
- `{"type":"disconnect"}`: End websocket session
- Binary frames: PCM16 mono audio chunks at 16kHz
- Optional query param: `mode` (currently supports `training`; invalid values fall back to `training`)

### Server -> Client

- `session_ready`
- `stream_started`
- `stream_stopped`
- `user_text`
- `text`
- `audio` (base64 PCM + mimeType)
- `turn_complete`
- `waiting_for_input`
- `interruption`
- `warning`
- `error`

## Running Tests

```bash
cd server
source venv/bin/activate
python -m unittest -v tests/test_proxima_agent_websocket.py
```

## Notes

- The handler uses bounded input buffering to avoid memory growth.
- Outbound audio frames are dropped under heavy backpressure to preserve responsiveness.
