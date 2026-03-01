# Proxima WebSocket Module

Real-time WebSocket session handler for continuous multimodal agent sessions.

## Overview

Manages client ↔ Gemini Live bidirectional streaming with concurrent tasks for audio input/output, video input, text chat, file uploads, and automatic reconnection on failures.

## Files

- **handler.py**: `ProximaAgentWebSocketHandler`
    - `run(websocket)`: Main session controller
        - Accepts WebSocket connection
        - Resolves session mode from query params
        - Creates `GeminiLiveManager` instance
        - Spawns 5 concurrent tasks to handle streams
        - Manages reconnection on stream failures

## Task Architecture

| Task                   | Direction       | Responsibility                               |
| ---------------------- | --------------- | -------------------------------------------- |
| `websocket_sender`     | Server → Client | Drains `outbound_queue`, sends JSON frames   |
| `receive_from_client`  | Client → Server | Parses incoming frames, routes to queues     |
| `send_to_gemini`       | Server → Gemini | Drains audio queue, streams PCM to Gemini    |
| `send_video_to_gemini` | Server → Gemini | Drains video queue, streams frames to Gemini |
| `receive_from_gemini`  | Gemini → Server | Iterates events, routes to outbound queue    |

## Backpressure Policy

- `audio_in_queue`: max 64 frames (auto-drop oldest on overflow)
- `video_in_queue`: max 4 frames (auto-drop oldest on overflow)
- `outbound_queue`: unlimited, but audio frames dropped if depth > 256

## Reconnection

On Gemini stream failure:

1. Flush audio and video input queues
2. Close and reopen Gemini session
3. Emit `{type: "warning"}` and `{type: "session_ready"}` to client
4. All tasks resume transparently against the new session

## Usage

```python
from proxima.websocket import ProximaAgentWebSocketHandler

handler = ProximaAgentWebSocketHandler(logger=logging.getLogger("ws"))

@app.websocket("/ws/proxima-agent")
async def proxima_agent_websocket(websocket: WebSocket):
    await handler.run(websocket)
```

## Protocol

See [WebSocket Protocol](../README.md#websocket-protocol) in the main server README.
