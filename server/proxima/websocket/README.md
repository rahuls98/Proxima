# WebSocket Module: Real-Time Training Sessions

Real-time bidirectional streaming for training sessions with Gemini Live API.

## Overview

`ProximaAgentWebSocketHandler` manages the complete lifecycle of a live training session with automatic reconnection, backpressure handling, and support for:

- **Audio streaming**: 16 kHz PCM format with low-latency transmission
- **Video streaming**: Screen share capability with frame validation
- **Text messaging**: User messages and file uploads with validation
- **Dynamic updates**: Persona/system instruction changes without session interruption

## Architecture

### Task Orchestration

The handler orchestrates 5 concurrent async tasks communicating through queues:

```
┌─────────────────────────────────────────────────────────────┐
│ Client WebSocket Connection                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                    TASK 5
              receive_from_client
                         │
        ┌────────────────┼────────────────┬──────────────┐
        ▼                ▼                ▼              ▼
   audio_in_queue  video_in_queue  (user_message)  (ping/pong)
        │                │           (file_upload)
   TASK 2           TASK 3
send_to_gemini  send_video_to_gemini
        │                │
        └────────────────┴──────────────┬──────────────────┐
                                        ▼                  ▼
                              Gemini Live API ◄──────► config rebuild
                                        │
                                   TASK 4
                             receive_from_gemini
                                        │
                    ┌───────────────────┼────────────────┐
                    ▼                   ▼                ▼
              audio_frames         transcriptions   state_events
                    │                   │                │
                    └───────────────────┴────────────────┘
                              │
                        outbound_queue
                              │
                           TASK 1
                      websocket_sender
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              Client Audio Events  (session messages)
```

### Message Queues

| Queue            | Direction       | Capacity  | Overflow Behavior               |
| ---------------- | --------------- | --------- | ------------------------------- |
| `outbound_queue` | Server → Client | Unlimited | Drop audio frames if size > 256 |
| `audio_in_queue` | Client → Gemini | 64 frames | Drop oldest frame               |
| `video_in_queue` | Client → Gemini | 4 frames  | Drop oldest frame               |

### State & Synchronization

```python
reconnect_lock       # Prevents concurrent reconnections
stream_enabled       # Audio input on/off flag
screen_share_enabled # Video input on/off flag
system_instruction   # Current persona prompt
config               # Gemini Live configuration
```

## Message Protocol

### Client → Server Messages

#### Audio Control

```json
{ "type": "stream_start" }  // Enable audio input streaming
{ "type": "stream_stop" }   // Disable audio input streaming
```

#### Screen Share

```json
{ "type": "screen_share_start" }
{ "type": "screen_frame", "image": "base64...", "mimeType": "image/jpeg" }
{ "type": "screen_share_stop" }
```

#### User Interaction

```json
{ "type": "user_message", "text": "Hello agent" }
{ "type": "file_upload", "fileName": "doc.pdf", "mimeType": "application/pdf", "data": "base64..." }
```

#### Session Control

```json
{ "type": "ping" }                                                    // Health check
{ "type": "set_system_instruction", "instruction": "new prompt..." } // Change persona
{ "type": "disconnect" }                                             // End session
{ "type": "end_session" }                                            // End session
```

### Server → Client Events

#### Audio

```json
{
    "type": "audio",
    "audio": "base64-pcm-frames",
    "mimeType": "audio/pcm;rate=24000"
}
```

#### State

```json
{ "type": "stream_started" }      // Audio streaming enabled
{ "type": "stream_stopped" }      // Audio streaming disabled
{ "type": "interruption" }        // User interrupted agent
{ "type": "turn_complete" }       // Agent finished turn
{ "type": "waiting_for_input" }   // Agent waiting for user
```

#### Transcriptions

```json
{ "type": "text", "text": "Agent speech..." }      // Agent transcription
{ "type": "user_text", "text": "User speech..." }  // User transcription
```

#### System Events

```json
{ "type": "session_ready", "mode": "training" }              // Initial ready signal
{ "type": "pong" }                                           // Response to ping
{ "type": "file_uploaded", "fileId": "...", "fileName": "..." } // File confirmation
{ "type": "warning", "message": "..." }                      // Non-fatal notification
{ "type": "error", "message": "..." }                        // Fatal error
```

## Error Handling & Reconnection

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
