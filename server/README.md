# Proxima Server

Real-time conversational training platform via Gemini Live with prospect context synthesis.

## Quick Links

- **[proxima/](proxima/README.md)** - Agent orchestration, config, WebSocket, and REST APIs
    - [config/](proxima/config/README.md) - Mode resolution and system prompts
    - [websocket/](proxima/websocket/README.md) - Real-time session handler
    - [api/](proxima/api/README.md) - REST context builder endpoint
- **[services/gemini/](services/gemini/README.md)** - Gemini SDK integration
    - [live/](services/gemini/live/README.md) - Streaming session management
    - [multimodal/](services/gemini/multimodal/README.md) - Context building generation
    - [tools/](services/gemini/tools/README.md) - File upload and summarization
        - [tools/file/](services/gemini/tools/file/README.md) - File storage and processing

## Endpoints

- `ws://localhost:8000/ws/proxima-agent` - Live multimodal training agent (see [WebSocket Protocol](#websocket-protocol))
- `POST http://localhost:8000/context/persona` - Prospect context builder (see [Context API Protocol](#context-api-protocol))
- `GET http://localhost:8000/health` - Health check

## Directory Structure

```
server/
├── main.py                              # FastAPI app, CORS, route registration
├── proxima/                             # Agent orchestration
│   ├── __init__.py
│   ├── README.md
│   ├── config/
│   │   ├── config.py
│   │   ├── prompts.py
│   │   └── README.md
│   ├── websocket/
│   │   ├── handler.py
│   │   └── README.md
│   └── api/
│       ├── context.py
│       └── README.md
└── services/                            # Gemini services
    └── gemini/
        ├── config.py
        ├── README.md
        ├── live/
        │   ├── manager.py
        │   ├── dispatcher.py
        │   └── README.md
        ├── multimodal/
        │   ├── client.py
        │   ├── content_builder.py
        │   ├── response_parser.py
        │   └── README.md
        └── tools/
            ├── README.md
            └── file/
                ├── store.py
                ├── summarizer.py
                ├── tools.py
                └── README.md
```

## Architecture Overview

The server separates concerns into two main layers:

### Orchestration (proxima/)

- **Config**: Mode resolution and Gemini Live session configuration per agent mode
- **WebSocket**: Real-time bidirectional streaming (audio, video, text, files) with automatic reconnection
- **API**: REST endpoint for pre-session prospect context synthesis

See [proxima/README.md](proxima/README.md) for full details.

### Services (services/gemini/)

- **Live**: Facade over Gemini Live SDK with session lifecycle, streaming, and tool orchestration
- **Multimodal**: Request/response Gemini calls for context building and summarization
- **Tools**: Reusable Gemini Live extensions (file upload, summarization)

See [services/gemini/README.md](services/gemini/README.md) for full details.

## Complete Backend Data Flows

### Session Initialization Flow

#### Optimized Path (System Instruction via URL)

```
CLIENT                    BACKEND                  GEMINI LIVE

                  ws://localhost:8000
                  /ws/proxima-agent?mode=training
                  &system_instruction=You%20are%20...
  ────────────────→
              ├─ WebSocket connection established
              ├─ run(websocket)
              │  ├─ resolve_mode("training")
              │  ├─ Parse system_instruction from query param ✓ (NEW: SKIP default)
              │  ├─ build_live_config(...) {system_instruction AS PROVIDED, voice, ...}
              │  ├─ Create GeminiLiveManager()
              │  └─ manager.connect(config) ──→ Initialized WITH custom persona
              │     ├─ Gemini Live session created
              │     └─ Agent ready with provided instruction (no reconnect needed)
              │
              ├─ Send {type: "session_ready", mode: "training"}
  ←──────────────────
     Agent is ready
     to interact
     (system instruction already set)
```

#### Legacy Path (Backward Compatible)

If no system_instruction in URL, server uses mode default:

```
CLIENT                    BACKEND                  GEMINI LIVE

  ────────────→
              ├─ WebSocket connection established
              ├─ Get SYSTEM_PROMPTS["training"] (default)
              ├─ build_live_config(DEFAULT, ...)
              ├─ manager.connect(config) ──→ Initialize with default persona
              │
              ├─ Send {type: "session_ready"}
  ←────────────
     session_ready

              (Optional: Client can send set_system_instruction message to change)
              ├─ Receive {type: "set_system_instruction", instruction: "..."}
              ├─ reconnect_live_session(new_instruction)
              │  ├─ manager.close()
              │  ├─ manager.connect(new_config) ──→ Reconnect with new persona
              │
              ├─ Send {type: "warning", message: "..."}
  ←────────────
     (Session restored with new persona)
```

**Key Improvement**: System instruction is now passed in URL for faster initialization without reconnection delay

### Audio Streaming Flow (Real-Time)

**Browser → Backend:** Microphone captures PCM audio at native sample rate → client downsamples to 16kHz → enqueues to `audio_in_queue` → `send_to_gemini()` streams to Gemini Live API

**Gemini Live → Backend:** API processes audio, transcribes, generates response → `iter_events()` receives audio frames (24kHz), user_text, text, turn_complete, interruption events

**Backend → Browser:** Events enqueued to `outbound_queue` → sent as WebSocket messages → base64 audio decoded, resampled to native rate → played through speaker

### Screen Share Flow

**Browser → Backend:** Screen capture frames (JPEG) sent via `screen_frame` message → enqueued to `video_in_queue` → validated (MIME type, base64 decode) → `stream_video_input()` sends to Gemini Live

**Gemini Live → Backend:** Processes video frames as context in conversation → `iter_events()` continues to receive text/audio responses with visual understanding applied

### File Upload Flow

**Browser → Backend:** File selected → `uploadFile()` base64 encodes → validates size/type → `store_uploaded_file()` persists in-memory with fileId

**Backend → Gemini:** Request Gemini to summarize file via tool declaration

**Gemini → Backend:** Emits `tool_call: summarize_uploaded_file(fileId)` event → backend intercepts with `ToolDispatcher.execute()` → `GeminiDocumentProcessor.summarize()` processes file → `send_tool_response(summary)` returns to Gemini

**Gemini → Backend → Browser:** Gemini continues conversation with file context embedded → sends text response → enqueued to `outbound_queue` → client receives transcription + response

### Persona Instruction Generation Flow

**Client → POST /context/persona-instruction:** Sends session context (shapes, styles, fields) in request body

**Backend Processing:** Creates `GeminiMultimodalClient` → calls `genai.generate_content()` with system role (persona generator) and user prompt (interpret form fields, generate 250-450 word instruction)

**Gemini API:** Processes request (2-5 seconds) → returns natural-language persona instruction

**Backend → Client:** Returns `{persona_instruction: "...", source_fields_count: 42}`

**Client:** Stores instruction in `localStorage` under key `proxima_persona_instruction` → instruction passed in WebSocket URL on session connect

### Dynamic Reconnection Flow (Persona Change)

**Trigger:** Client sends `{type: "set_system_instruction", instruction: "new prompt"}` message during active session

**Backend Processing:** `receive_from_client()` receives message → updates `system_instruction` variable → rebuilds `config` with new instruction → calls `reconnect_live_session("system instruction update")`

**Reconnection Process:** Acquires atomic `reconnect_lock` → flushes audio/video queues (drops stale frames) → closes old manager session (receives 1000 OK) → creates new manager session with updated config → resets `stream_enabled = True` → sends `{type: "warning"}` and `{type: "session_ready"}` to client

**Transparent Recovery:** Background tasks resume against new session. If `receive_from_gemini` or `send_to_gemini` see code 1000 in old session, they sleep 100ms and retry against new session. User can continue speaking during transition (no audio loss)

### Error Recovery Flow

**send_to_gemini() / send_video_to_gemini() / receive_from_gemini() failures:** Catch exception → check if error contains code 1000 (normal close) → if code 1000, sleep 100ms and retry (session already reconnecting elsewhere); otherwise call `reconnect_live_session()` to trigger full reconnection

**receive_from_client() disconnect:** Client WebSocket closes → entire session terminates gracefully (all background tasks canceled, Gemini session closed)

## WebSocket Protocol

See [proxima/websocket/README.md](proxima/websocket/README.md#protocol) for framing details.

### Client → Server

| Message                      | Description                             |
| ---------------------------- | --------------------------------------- |
| Binary frame                 | PCM16 mono audio at 16kHz               |
| `stream_start`               | Enable mic forwarding to Gemini         |
| `stream_stop`                | Disable mic forwarding                  |
| `screen_share_start`         | Begin accepting screen frames           |
| `screen_share_stop`          | Stop accepting screen frames            |
| `screen_frame`               | `{image: base64, mimeType: image/jpeg}` |
| `user_message`               | `{text: ...}` – text chat turn          |
| `file_upload`                | `{fileName, mimeType, data: base64}`    |
| `ping`                       | Keepalive; server replies with `pong`   |
| `disconnect` / `end_session` | Graceful session close                  |

Query param: `?mode=training` (invalid values fall back to training)

### Server → Client

| Message                             | Description                                  |
| ----------------------------------- | -------------------------------------------- |
| `session_ready`                     | Gemini session open; includes `mode`         |
| `stream_started` / `stream_stopped` | Mic state acknowledgement                    |
| `audio`                             | `{audio: base64, mimeType}` – streamed audio |
| `user_text`                         | Input transcription from Gemini              |
| `text`                              | Output transcription from Gemini             |
| `turn_complete`                     | Gemini finished its turn                     |
| `waiting_for_input`                 | Gemini idle, awaiting input                  |
| `interruption`                      | User interrupted the model                   |
| `file_uploaded`                     | `{fileId, fileName, mimeType}`               |
| `warning`                           | Non-fatal operational message                |
| `error`                             | Fatal error; connection closes with 1011     |

## Context API Protocol

See [proxima/api/README.md](proxima/api/README.md#endpoint) for details.

### POST /context/persona

Content-Type: `multipart/form-data`

| Field                   | Type              | Description              |
| ----------------------- | ----------------- | ------------------------ |
| `context_text_keys[]`   | string (repeated) | Key for each text item   |
| `context_text_values[]` | string (repeated) | Value for each text item |
| `context_file_keys[]`   | string (repeated) | Key for each file item   |
| `context_files[]`       | file (repeated)   | File for each file item  |

Supported file MIME types: `text/*`, `image/*`, `application/pdf`, `audio/*`, `video/*`

Response: `{unified_context: str, text_items_count: int, file_items_count: int}`

## Data Flows

### Real-Time Audio (WebSocket)

```
Browser mic (PCM binary)
  → audio_in_queue
  → stream_input()
  → Gemini Live
Gemini Live
  → iter_events() audio event
  → outbound_queue
  → websocket
  → browser speaker
```

### Screen Share (WebSocket)

```
Browser frame (base64 JPEG)
  → video_in_queue
  → stream_video_input()
  → Gemini Live
```

### File Upload & Summarization (WebSocket)

```
{type: file_upload}
  → decode base64
  → store_uploaded_file()
  → FileContextStore
  → request_uploaded_file_summary()
  → text prompt to Gemini Live
  → Gemini emits tool_call: summarize_uploaded_file(file_id)
  → iter_events() intercepts
  → ToolDispatcher.execute()
  → UploadedFileTools.summarize_uploaded_file()
  → asyncio.to_thread(GeminiDocumentProcessor.summarize_document())
  → session.send_tool_response()
  → Gemini continues with file context
```

### Prospect Context Build (REST)

```
POST /context/persona (multipart/form-data)
  → context_api: decode text + file items
  → GeminiMultimodalClient.build_unified_context()
    → content_builder.build_parts(): validate + assemble Parts
    → asyncio.to_thread(genai.generate_content): single multimodal call
    → response_parser.extract_text(): safe text extraction
  ← {unified_context, text_items_count, file_items_count}
```

### Session Reconnect (WebSocket)

```
Gemini stream failure
  → reconnect_live_session()
  → flush audio + video queues
  → manager.close() → manager.connect(config)
  → emit {type: "warning"} + {type: "session_ready"} to client
  → all tasks resume transparently against new session
```

## Running the Server

```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables (e.g., in .env)
export GOOGLE_CLOUD_PROJECT=your-project
export PROXIMA_GEMINI_LIVE_MODEL=models/gemini-2.0-flash-exp
export PROXIMA_GEMINI_DOC_MODEL=models/gemini-2.0-flash-exp

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Running Tests

```bash
source venv/bin/activate
python -m unittest -v tests/test_proxima_agent_websocket.py
```

## Environment Variables

| Variable                    | Purpose                           |
| --------------------------- | --------------------------------- |
| `GOOGLE_CLOUD_PROJECT`      | GCP project for Vertex AI         |
| `GOOGLE_CLOUD_LOCATION`     | GCP region (e.g., `us-central1`)  |
| `GOOGLE_GENAI_USE_VERTEXAI` | Set to `true` for Vertex AI       |
| `PROXIMA_GEMINI_LIVE_MODEL` | Model for Gemini Live sessions    |
| `PROXIMA_GEMINI_DOC_MODEL`  | Model for summarization + context |

## Implementation Notes

- All subdirectories have their own README files describing modules, usage, and data flows.
- Configuration is loaded via `load_dotenv` before service imports in `main.py`.
- WebSocket handler manages bounded input buffering to prevent memory growth under load.
- Outbound audio frames are dropped under backpressure to preserve responsiveness.
- In-session uploaded files are stored in-memory and never written to disk.
- To add a new agent mode, extend `ProximaAgentPrompt` and `ProximaAgentMode` in `proxima/config/`.
