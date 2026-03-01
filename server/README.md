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
