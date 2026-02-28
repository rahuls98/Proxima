# Server: Proxima Agent WebSocket API

## Overview

The server exposes a single real-time endpoint for continuous audio + screen-share conversation:

- `ws://localhost:8000/ws/proxima-agent`

The endpoint manages:

- Continuous microphone audio input from browser
- Screen-share frame input from browser (base64 JPEG snapshots)
- Chat text turns from browser
- Chat file uploads (images, PDFs, text, etc.)
- Streaming audio output from Gemini Live
- User and model transcript streaming
- Interruption signaling
- Automatic reconnection of the Gemini Live session on stream failures

## Module Structure

- `main.py`: FastAPI app wiring, CORS, route registration
- `proxima_agent/config.py`: Mode-aware Gemini Live session configuration and prompts
- `proxima_agent/handler.py`: WebSocket session orchestration logic
- `services/gemini/live/live_manager.py`: Gemini SDK wrapper
- `services/gemini/tools/*`: reusable uploaded-file context + Gemini document summarization tools

## Protocol

### Client -> Server

- `{"type":"stream_start"}`: Enable mic forwarding to Gemini
- `{"type":"stream_stop"}`: Disable mic forwarding
- `{"type":"screen_share_start"}`: Start accepting screen-share frames
- `{"type":"screen_share_stop"}`: Stop accepting screen-share frames
- `{"type":"screen_frame","image":"<base64>","mimeType":"image/jpeg"}`: Send one screen frame for Gemini visual analysis
- `{"type":"user_message","text":"..."}`: Send one text chat turn to Gemini
- `{"type":"file_upload","fileName":"report.pdf","mimeType":"application/pdf","data":"<base64>"}`: Upload one file for Gemini document context extraction
- `{"type":"disconnect"}`: End websocket session
- Binary frames: PCM16 mono audio chunks at 16kHz
- Optional query param: `mode` (currently supports `training`; invalid values fall back to `training`)

### Server -> Client

- `session_ready`
- `stream_started`
- `stream_stopped`
- `user_text`
- `text`
- `file_uploaded` (contains `fileId`, `fileName`, `mimeType`)
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
- Uploaded files are decoded and stored in-memory in the current websocket session (`FileContextStore`), not written to disk by default.
- Files are sent to Gemini only when the `summarize_uploaded_file` tool executes.
- Model names are configured via environment variables (in `server/.env`):
  - `PROXIMA_GEMINI_LIVE_MODEL`
  - `PROXIMA_GEMINI_DOC_MODEL`
