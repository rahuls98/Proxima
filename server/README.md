`server/README.md`

# Server: Proxima Agent WebSocket API

## Overview

The server exposes a single real-time WebSocket endpoint for continuous multimodal
AI conversation powered by the Gemini Live API:

- `ws://localhost:8000/ws/proxima-agent`

The endpoint manages:

- Continuous microphone audio input from browser (PCM16, 16kHz)
- Screen-share frame input from browser (base64 JPEG snapshots)
- Chat text turns from browser
- Chat file uploads (images, PDFs, text, etc.)
- Streaming audio output from Gemini Live
- User and model transcript streaming
- Interruption signaling
- Automatic reconnection of the Gemini Live session on stream failures

---

## Directory Structure

```
server/
|-- main.py                              # FastAPI app, CORS, route registration
|-- proxima_agent/
|   |-- __init__.py                      # Exports ProximaAgentWebSocketHandler
|   |-- config.py                        # Mode-aware Gemini Live session config and prompts
|   +-- handler.py                       # WebSocket session orchestration logic
+-- services/
    +-- gemini/
        |-- model_settings.py            # Env-var model name resolvers (leaf, no internal deps)
        |-- live/
        |   |-- __init__.py              # Exports GeminiLiveManager
        |   |-- live_manager.py          # Gemini Live API facade: connection, streaming, events
        |   +-- tool_dispatcher.py       # Tool function registry and executor
        +-- tools/
            |-- __init__.py              # Exports UploadedFileTools
            |-- uploaded_file_tools.py   # Tool declarations and file upload orchestration
            |-- file_context_store.py    # In-memory UUID-keyed file store (session-scoped)
            +-- document_processor.py   # Gemini document summarization (non-live model)
```

---

## Module Dependency Graph

```
main.py
+-- proxima_agent.ProximaAgentWebSocketHandler       [handler.py]
    |-- proxima_agent.config                          [config.py]
    |   +-- build_live_config(), resolve_mode()
    +-- services.gemini.live.GeminiLiveManager        [live_manager.py]
        |-- services.gemini.model_settings             [model_settings.py]
        |   +-- get_live_model_name()
        |-- services.gemini.tools.UploadedFileTools    [uploaded_file_tools.py]
        |   |-- file_context_store.FileContextStore    [file_context_store.py]
        |   |   +-- add(), get()
        |   +-- document_processor.GeminiDocumentProcessor  [document_processor.py]
        |       |-- services.gemini.model_settings
        |       |   +-- get_doc_model_name()
        |       +-- summarize_document()
        +-- tool_dispatcher.ToolDispatcher             [tool_dispatcher.py]
            +-- register(), execute()
```

---

## Layer Breakdown

### Transport -- main.py

Creates the FastAPI app with CORS middleware, loads `server/.env`, registers the
`/health` GET route and `/ws/proxima-agent` WebSocket route. Instantiates one shared
`ProximaAgentWebSocketHandler` for the lifetime of the process; each incoming
WebSocket connection calls `handler.run(websocket)`.

### Orchestration -- proxima_agent/

**handler.py -- ProximaAgentWebSocketHandler**

The central session controller. For each WebSocket connection, `run()` resolves the
session mode, creates a `GeminiLiveManager`, and fans out five concurrent asyncio tasks:

| Task                   | Direction        | Responsibility                                                |
| ---------------------- | ---------------- | ------------------------------------------------------------- |
| `websocket_sender`     | Server -> Client | Drains `outbound_queue`, sends JSON to browser                |
| `receive_from_client`  | Client -> Server | Parses binary/JSON frames, routes to queues or manager        |
| `send_to_gemini`       | Server -> Gemini | Drains `audio_in_queue`, calls `manager.stream_input()`       |
| `send_video_to_gemini` | Server -> Gemini | Drains `video_in_queue`, calls `manager.stream_video_input()` |
| `receive_from_gemini`  | Gemini -> Server | Iterates `manager.iter_events()`, routes to `outbound_queue`  |

Backpressure is managed via bounded queues (`audio_in_queue` max 64, `video_in_queue`
max 4, outbound audio dropped if queue depth > 256). On any Gemini stream failure,
`reconnect_live_session()` flushes input queues, closes and reopens the session, and
re-emits `session_ready` to the client.

**config.py**

Owns mode resolution and Gemini session config assembly. `resolve_mode()` normalizes
the `?mode=` query param (falls back to `"training"`). `build_live_config()` returns
a `types.LiveConnectConfig` with response modality, system prompt, voice settings
(default voice: Schedar), audio transcription, and activity detection. Accepts an
optional `tools` list injected by the handler from `manager.live_tool_declarations()`.

### Gemini Service -- services/gemini/live/

**live_manager.py -- GeminiLiveManager**

Facade over the Gemini Multimodal Live SDK. Constructed once per WebSocket session.
On init, creates a `ToolDispatcher` and `UploadedFileTools`, and immediately registers
the file tools into the dispatcher. Key responsibilities:

- `connect(config)` / `close()`: manages the SDK connection context manager
- `stream_input()` / `stream_video_input()`: forwards PCM audio and JPEG frames via `send_realtime_input()`
- `send_text_message()`: sends a text turn via `send_client_content()`
- `iter_events()`: async generator normalizing raw Gemini responses into typed event dicts
  (`audio`, `text`, `user_text`, `turn_complete`, `interruption`, `waiting_for_input`);
  intercepts `tool_call` responses and resolves them internally via `ToolDispatcher`
- `store_uploaded_file()` / `request_uploaded_file_summary()`: entry points for the file upload flow

**tool_dispatcher.py -- ToolDispatcher**

Lightweight name-to-function registry. `register(name, func)` stores the callable.
`execute(tool_call)` parses args, detects async vs sync via `inspect.iscoroutinefunction()`,
invokes the function, and returns `{result: ...}` or `{error: ...}`. No internal dependencies.

### Tools and Storage -- services/gemini/tools/

**uploaded_file_tools.py -- UploadedFileTools**

Composes `FileContextStore` and `GeminiDocumentProcessor`. `register(dispatcher)` wires
`summarize_uploaded_file` into the dispatcher. `summarize_uploaded_file(file_id)` fetches
the record, runs `document_processor.summarize_document()` via `asyncio.to_thread()`,
caches the result on the record, and returns the summary dict.

**file_context_store.py -- FileContextStore**

In-memory session-scoped store. `add()` generates a UUID hex `file_id`, creates an
`UploadedFileRecord` (dataclass: `file_id`, `file_name`, `mime_type`, `data: bytes`,
`summary: str | None`, `created_at`), and returns it. Files are never written to disk.

**document_processor.py -- GeminiDocumentProcessor**

Uses `genai.Client().models.generate_content()` with `PROXIMA_GEMINI_DOC_MODEL` to
produce a 3-6 sentence summary from raw file bytes. Raises `RuntimeError` if Gemini
returns no text.

**model_settings.py**

Pure leaf -- no internal imports. Reads `PROXIMA_GEMINI_LIVE_MODEL` and
`PROXIMA_GEMINI_DOC_MODEL` from environment; raises `RuntimeError` if either is missing.

---

## Key Data Flows

### Real-Time Audio

```
Browser mic (PCM binary) -> audio_in_queue -> stream_input() -> Gemini Live
Gemini Live -> iter_events() audio event -> outbound_queue -> websocket -> browser speaker
```

### Screen Share

```
Browser frame (base64 JPEG) -> video_in_queue -> stream_video_input() -> Gemini Live
```

### File Upload and Summarization

```
{type: "file_upload"} -> decode base64 -> store_uploaded_file() -> FileContextStore (UUID assigned)
  -> request_uploaded_file_summary() -> text prompt to Gemini
  -> Gemini emits tool_call: summarize_uploaded_file(file_id)
  -> iter_events() intercepts -> ToolDispatcher.execute()
  -> UploadedFileTools.summarize_uploaded_file()
  -> asyncio.to_thread(document_processor.summarize_document())
  -> session.send_tool_response() -> Gemini continues with file context
```

### Session Reconnect

```
Gemini stream failure -> reconnect_live_session()
  -> flush audio + video queues
  -> manager.close() -> manager.connect(config)
  -> emit {type: "warning"} + {type: "session_ready"} to client
  -> all tasks resume transparently against new session
```

---

## WebSocket Protocol

### Client -> Server

| Message                      | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| Binary frame                 | PCM16 mono audio at 16kHz                        |
| `stream_start`               | Enable mic forwarding to Gemini                  |
| `stream_stop`                | Disable mic forwarding                           |
| `screen_share_start`         | Begin accepting screen frames                    |
| `screen_share_stop`          | Stop accepting screen frames; flush video queue  |
| `screen_frame`               | `{image: base64, mimeType: "image/jpeg"}`        |
| `user_message`               | `{text: "..."}` -- text chat turn                |
| `file_upload`                | `{fileName, mimeType, data: base64}` -- max 20MB |
| `ping`                       | Keepalive; server replies with `pong`            |
| `disconnect` / `end_session` | Graceful session close                           |

Query param: `?mode=training` (invalid values fall back to `training`)

### Server -> Client

| Message                             | Description                                           |
| ----------------------------------- | ----------------------------------------------------- |
| `session_ready`                     | Gemini session open; includes `mode`                  |
| `stream_started` / `stream_stopped` | Mic state acknowledgement                             |
| `audio`                             | `{audio: base64, mimeType}` -- streamed PCM response  |
| `user_text`                         | Input transcription from Gemini                       |
| `text`                              | Output transcription from Gemini                      |
| `turn_complete`                     | Gemini finished its turn                              |
| `waiting_for_input`                 | Gemini idle, awaiting input                           |
| `interruption`                      | User interrupted the model mid-response               |
| `file_uploaded`                     | `{fileId, fileName, mimeType}` -- upload acknowledged |
| `warning`                           | Non-fatal operational message                         |
| `error`                             | Fatal error; connection closes with code 1011         |

---

## Environment Variables

| Variable                    | Used By                                  | Purpose                          |
| --------------------------- | ---------------------------------------- | -------------------------------- |
| `GOOGLE_CLOUD_PROJECT`      | Gemini SDK                               | GCP project for Vertex AI        |
| `GOOGLE_CLOUD_LOCATION`     | Gemini SDK                               | GCP region                       |
| `GOOGLE_GENAI_USE_VERTEXAI` | Gemini SDK                               | Toggle Vertex AI vs. AI Studio   |
| `PROXIMA_GEMINI_LIVE_MODEL` | `model_settings` -> `live_manager`       | Model for Gemini Live session    |
| `PROXIMA_GEMINI_DOC_MODEL`  | `model_settings` -> `document_processor` | Model for document summarization |

---

## Running the Server

```bash
cd server
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Running Tests

```bash
cd server
source venv/bin/activate
python -m unittest -v tests/test_proxima_agent_websocket.py
```

---

## Implementation Notes

- The handler uses bounded input buffering to prevent memory growth under load.
- Outbound audio frames are dropped under heavy backpressure to preserve responsiveness.
- Uploaded files are stored in-memory within the current WebSocket session (`FileContextStore`) and never written to disk.
- Files are sent to Gemini only when the `summarize_uploaded_file` tool is invoked by the model.
- `ToolDispatcher` supports both sync and async tool functions transparently.
- `GeminiLiveManager` provides both `iter_events()` (async generator, used by handler) and `listen()`
  (callback-based, available for alternative integration patterns).
