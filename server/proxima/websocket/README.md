# WebSocket Module

Handles real-time bidirectional streaming for training sessions: audio, screen share, text messages, and file uploads.

## What It Does

`ProximaAgentWebSocketHandler` orchestrates a live training session by:

- Receiving audio frames from client microphone and forwarding to Gemini Live
- Receiving screen share frames (JPEG) for visual context
- Sending back generated audio and transcriptions
- Managing file uploads with summarization
- Handling reconnection automatically on transport errors

## Key Points

**Client → Server Messages:**

- `stream_start` / `stream_stop` - Enable/disable mic
- `screen_share_start` / `screen_frame` / `screen_share_stop` - Screen sharing
- `user_message` - Text input
- `file_upload` - Upload a file (max 20 MB)
- `set_system_instruction` - Change persona mid-session
- `ping` - Health check

**Server → Client Events:**

- `session_ready` - Session initialized and ready
- `stream_started` / `stream_stopped` - Mic state
- `audio` - Generated audio frames (base64, 24 kHz PCM)
- `text` / `user_text` - Transcriptions
- `turn_complete` / `waiting_for_input` / `interruption` - Conversation state
- `warning` / `error` - Notifications

## How to Use

```python
from proxima.websocket.handler import ProximaAgentWebSocketHandler

handler = ProximaAgentWebSocketHandler()

@app.websocket("/ws/proxima-agent")
async def websocket_endpoint(websocket: WebSocket):
    await handler.run(websocket)
```

The handler automatically manages:

- 5 concurrent async tasks for bidirectional streaming
- Queues with backpressure (drops old frames if network is slow)
- Reconnection on errors without losing session state
- File storage and summarization

## URL Format

```
ws://localhost:8000/ws/proxima-agent?mode=training
```

The mode parameter determines the default system prompt. Custom personas are applied via `set_system_instruction` message after connection.

### Connection Status Codes

| Code                | Handling         | Behavior                                                         |
| ------------------- | ---------------- | ---------------------------------------------------------------- |
| 1000 (OK)           | Normal close     | Sleep 100ms and retry (manager already reconnecting elsewhere)   |
| 1011 (Server Error) | Transport error  | Log and trigger full reconnection via `reconnect_live_session()` |
| Other               | Unexpected close | Log and trigger full reconnection                                |

### Reconnection Flow

Triggered by:

- `send_to_gemini` transport failure
- `send_video_to_gemini` transport failure
- `receive_from_gemini` transport failure
- Client message `set_system_instruction`

Process:

```python
async def reconnect_live_session(reason: str):
    1. Acquire reconnect_lock (atomic operation)
    2. Log warning with reason
    3. Flush audio_in_queue (drop ~64 stale frames)
    4. Flush video_in_queue (drop ~4 stale frames)
    5. await manager.close()
    6. await manager.connect(new_config)
    7. Reset stream_enabled = True
    8. Send warning + session_ready to client
```

### Backpressure Handling

**Outbound to client:**

- Audio events dropped if `outbound_queue.size() > 256`
- Prevents memory growth on slow clients
- Other events always queued

**Inbound from client:**

- Audio frames: Max 64 in queue; oldest dropped on overflow
- Video frames: Max 4 in queue; oldest dropped on overflow
- Maintains low latency on high-speed input

## Features

### System Instruction Initialization

#### Initial Setup (via URL Parameter)

System instruction is passed via query parameter during WebSocket connection for efficient initialization:

```
ws://localhost:8000/ws/proxima-agent?mode=training&system_instruction=You%20are%20a%20sales%20trainer...
```

Flow:

1. Client generates persona instruction (e.g., from ContextBuilderForm)
2. Client passes it in WebSocket URL (URL-encoded)
3. Server receives from query params during handshake
4. Server initializes Gemini Live session **with instruction already set**
5. No reconnection needed - agent starts with correct persona immediately

**Benefit**: Eliminates reconnection delay on initial session creation

#### Dynamic Updates (via WebSocket Message)

Change persona mid-session without losing conversation:

```json
{ "type": "set_system_instruction", "instruction": "New system prompt..." }
```

Flow:

1. Server receives message
2. Checks if instruction differs from current
3. Updates `system_instruction` variable
4. Rebuilds `config` with new instruction
5. Calls `reconnect_live_session("system instruction update")`
6. Gemini Live session transparently reconnects with new persona
7. Client receives reconnection acknowledgment

**Use case**: Switching agent personality during an active training session (not typical in current UI)

### Screen Sharing with Validation

```json
{
    "type": "screen_frame",
    "image": "base64-encoded-jpeg-or-png",
    "mimeType": "image/jpeg"
}
```

Validation:

- MIME type checked against `image/jpeg`, `image/png`
- Base64 decoded with strict validation
- Invalid frames dropped with warning sent to client
- Frames dropped on pause (`screen_share_stop`)

### File Upload with Persistence

```json
{
    "type": "file_upload",
    "fileName": "document.pdf",
    "mimeType": "application/pdf",
    "data": "base64-encoded-file"
}
```

Validation & Limits:

- Maximum file size: 20 MB
- Base64 decoding with strict validation
- Empty files rejected
- Invalid base64 caught with warning

Process:

1. Decode and validate file
2. Call `manager.store_uploaded_file(name, mime_type, bytes)`
3. Send `file_uploaded` confirmation to client
4. Request file summary if supported: `manager.request_uploaded_file_summary(...)`

### Health Monitoring

```json
{ "type": "ping" }    →    { "type": "pong" }
```

Useful for detecting stale connections on low-bandwidth networks.

## Integration with Configuration Module

- **Configuration**: `../config/config.py` builds Gemini Live config from instruction, mode, tools
- **Mode Resolution**: `resolve_mode()` validates and normalizes mode from query params
- **System Prompts**: `SYSTEM_PROMPTS` mapping mode → system instruction

## Logging

Logger: `proxima_agent_ws`

- INFO: Connection lifecycle events
- WARNING: Reconnection events with reason
- ERROR: Stream failures and exceptions

## Performance

- **Audio latency**: ~100ms (16 kHz, 64-frame queue)
- **Video latency**: ~30ms (4-frame queue)
- **Memory**: ~5 MB per session
- **CPU**: 5-10% per session

## Usage

```python
from proxima.websocket.handler import ProximaAgentWebSocketHandler

handler = ProximaAgentWebSocketHandler()

@app.websocket("/ws/proxima-agent")
async def websocket_endpoint(websocket: WebSocket):
    await handler.run(websocket)
```
