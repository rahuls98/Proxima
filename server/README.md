# Server: Proxima Agent WebSocket API

## Overview

The server exposes real-time and REST endpoints for the Proxima sales training platform:

- `ws://localhost:8000/ws/proxima-agent` -- Live multimodal training agent session
- `POST http://localhost:8000/context/persona` -- Pre-session prospect context builder
- `GET http://localhost:8000/health` -- Health check

The WebSocket endpoint manages:

- Continuous microphone audio input from browser (PCM16, 16kHz)
- Screen-share frame input from browser (base64 JPEG snapshots)
- Chat text turns from browser
- Chat file uploads (images, PDFs, text, etc.)
- Streaming audio output from Gemini Live
- User and model transcript streaming
- Interruption signaling
- Automatic reconnection of the Gemini Live session on stream failures

The context endpoint manages:

- Accepting any number of named text and file context items
- Validating MIME types and file sizes before any Gemini call
- Synthesizing a unified prospect persona via a single multimodal Gemini call
- Returning a structured persona summary for use before a training session

---

## Directory Structure

```
server/
|-- main.py                              # FastAPI app, CORS, route registration
|-- proxima_agent/
|   |-- __init__.py                      # Exports ProximaAgentWebSocketHandler
|   |-- config.py                        # Mode-aware Gemini Live session config and prompts
|   |-- prompts.py                       # ProximaAgentPrompt str enum -- one member per agent mode
|   |-- context_api.py                   # POST /context/persona route -- prospect context builder
|   +-- handler.py                       # WebSocket session orchestration logic
+-- services/
    +-- gemini/
        |-- model_settings.py            # Env-var model name resolvers (leaf, no internal deps)
        |-- live/
        |   |-- __init__.py              # Exports GeminiLiveManager
        |   |-- live_manager.py          # Gemini Live API facade: connection, streaming, events
        |   +-- tool_dispatcher.py       # Tool function registry and executor
        |-- multimodal/
        |   |-- __init__.py              # Exports GeminiMultimodalClient, dataclasses, errors
        |   |-- multimodal_client.py     # Facade for non-live Gemini generate_content calls
        |   |-- part_builder.py          # Assembles and validates typed Part lists from inputs
        |   +-- response_extractor.py    # Safely extracts text from any Gemini response shape
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
|-- proxima_agent.ProximaAgentWebSocketHandler       [handler.py]
|   |-- proxima_agent.config                          [config.py]
|   |   |-- build_live_config(), resolve_mode()
|   |   +-- proxima_agent.prompts.ProximaAgentPrompt  [prompts.py]
|   |       +-- TRAINING (str Enum member per mode)
|   +-- services.gemini.live.GeminiLiveManager        [live_manager.py]
|       |-- services.gemini.model_settings             [model_settings.py]
|       |   +-- get_live_model_name()
|       |-- services.gemini.tools.UploadedFileTools    [uploaded_file_tools.py]
|       |   |-- file_context_store.FileContextStore    [file_context_store.py]
|       |   |   +-- add(), get()
|       |   +-- document_processor.GeminiDocumentProcessor  [document_processor.py]
|       |       |-- services.gemini.model_settings
|       |       |   +-- get_doc_model_name()
|       |       +-- summarize_document()
|       +-- tool_dispatcher.ToolDispatcher             [tool_dispatcher.py]
|           +-- register(), execute()
+-- proxima_agent.context_api.router                  [context_api.py]
    +-- services.gemini.multimodal.GeminiMultimodalClient  [multimodal_client.py]
        |-- services.gemini.model_settings
        |   +-- get_doc_model_name()
        |-- part_builder.build_parts()                 [part_builder.py]
        |   +-- TextContextItem, FileContextItem, PartBuildError
        +-- response_extractor.extract_text()          [response_extractor.py]
            +-- ExtractionError
```

---

## Layer Breakdown

### Transport -- main.py

Creates the FastAPI app with CORS middleware. Calls `load_dotenv` before any service
import so environment variables are available at module load time. Registers the
`/health` GET route, mounts the `context_api` router, and binds the WebSocket route.
Instantiates one shared `ProximaAgentWebSocketHandler` for the process lifetime.

### Orchestration -- proxima_agent/

**handler.py -- ProximaAgentWebSocketHandler**

The central WebSocket session controller. For each connection, `run()` resolves the
session mode, creates a `GeminiLiveManager`, and fans out five concurrent asyncio tasks:

| Task                   | Direction        | Responsibility                                                |
| ---------------------- | ---------------- | ------------------------------------------------------------- |
| `websocket_sender`     | Server -> Client | Drains `outbound_queue`, sends JSON to browser                |
| `receive_from_client`  | Client -> Server | Parses binary/JSON frames, routes to queues or manager        |
| `send_to_gemini`       | Server -> Gemini | Drains `audio_in_queue`, calls `manager.stream_input()`       |
| `send_video_to_gemini` | Server -> Gemini | Drains `video_in_queue`, calls `manager.stream_video_input()` |
| `receive_from_gemini`  | Gemini -> Server | Iterates `manager.iter_events()`, routes to `outbound_queue`  |

Backpressure: `audio_in_queue` max 64, `video_in_queue` max 4, outbound audio dropped
if queue depth > 256. On Gemini stream failure, `reconnect_live_session()` flushes
queues, closes and reopens the session, and re-emits `session_ready` to the client.

**config.py**

Owns mode resolution and Gemini session config assembly. `resolve_mode()` normalizes
the `?mode=` query param (falls back to `training`). `build_live_config()` assembles
`types.LiveConnectConfig` with response modality, system prompt (from `ProximaAgentPrompt`),
voice settings (default: Schedar), audio transcription, and activity detection.

**prompts.py -- ProximaAgentPrompt**

A `str` Enum where each member is the full system prompt for one agent mode. Inherits
from `str` so members pass directly into `types.LiveConnectConfig` without `.value`.
To add a new mode: add a member to `ProximaAgentPrompt`, map it in `SYSTEM_PROMPTS`,
and extend `ProximaAgentMode` in `config.py`.

**context_api.py -- POST /context/persona**

Accepts `multipart/form-data` with parallel arrays of text and file context items.
Each item has a key (human-readable identifier) and a value (text or file). Uses a
lazy singleton `GeminiMultimodalClient` (instantiated on first request, not at import,
to avoid env var race conditions at startup). Delegates all Gemini interaction to
`GeminiMultimodalClient` and only handles HTTP request/response concerns.

### Gemini Live Service -- services/gemini/live/

**live_manager.py -- GeminiLiveManager**

Facade over the Gemini Multimodal Live SDK. Constructed once per WebSocket session.
On init, creates a `ToolDispatcher` and `UploadedFileTools` and wires them together.

- `connect(config)` / `close()`: manages SDK connection context manager
- `stream_input()` / `stream_video_input()`: forwards PCM audio and JPEG frames
- `send_text_message()`: sends a text turn via `send_client_content()`
- `iter_events()`: async generator yielding normalized event dicts; intercepts
  `tool_call` responses and resolves them via `ToolDispatcher` internally
- `store_uploaded_file()` / `request_uploaded_file_summary()`: file upload entry points

**tool_dispatcher.py -- ToolDispatcher**

Name-to-function registry. `register(name, func)` stores the callable. `execute(tool_call)`
parses args, detects async vs sync via `inspect.iscoroutinefunction()`, invokes the
function, and returns `{result: ...}` or `{error: ...}`. No internal dependencies.

### Gemini Multimodal Service -- services/gemini/multimodal/

**multimodal_client.py -- GeminiMultimodalClient**

Facade for non-live (request/response) Gemini content generation. Accepts lists of
`TextContextItem` and `FileContextItem`, delegates part assembly to `part_builder`,
calls `genai.Client().models.generate_content()` in a thread via `asyncio.to_thread()`,
and extracts text via `response_extractor`. All internal errors are wrapped into
`MultimodalContextError` so the API route handles one error type only.

**part_builder.py**

Validates and assembles `types.Part` lists from raw inputs. Enforces MIME type
support and 20MB inline size limit per file before any API call is made. Raises
`PartBuildError` on violations and `ValueError` if no content is provided.

**response_extractor.py**

Safely extracts text from any Gemini response shape. Tries `response.text` first,
then walks `candidates -> content -> parts`. Raises `ExtractionError` if no text
is found, preventing silent empty results.

### Tools and Storage -- services/gemini/tools/

**uploaded_file_tools.py -- UploadedFileTools**

Composes `FileContextStore` and `GeminiDocumentProcessor`. Registers `summarize_uploaded_file`
into `ToolDispatcher` at construction. On tool invocation, fetches the file record,
runs summarization via `asyncio.to_thread()`, caches on record, and returns summary dict.

**file_context_store.py -- FileContextStore**

In-memory session-scoped store. `add()` generates a UUID hex `file_id` and stores an
`UploadedFileRecord` (dataclass: `file_id`, `file_name`, `mime_type`, `data: bytes`,
`summary: str | None`, `created_at`). Files are never written to disk.

**document_processor.py -- GeminiDocumentProcessor**

Uses `genai.Client().models.generate_content()` with `PROXIMA_GEMINI_DOC_MODEL` to
produce a 3-6 sentence summary from raw file bytes. Raises `RuntimeError` if no text.

**model_settings.py**

Pure leaf -- no internal imports. Reads `PROXIMA_GEMINI_LIVE_MODEL` and
`PROXIMA_GEMINI_DOC_MODEL` from environment; raises `RuntimeError` if either is missing.

---

## Key Data Flows

### Prospect Context Build (REST)

```
POST /context/persona (multipart/form-data)
  -> context_api: decode text + file items
  -> GeminiMultimodalClient.build_unified_context()
      -> part_builder.build_parts(): validate + assemble Parts
      -> asyncio.to_thread(genai.generate_content): single multimodal call
      -> response_extractor.extract_text(): safe text extraction
  <- {unified_context, text_items_count, file_items_count}
```

### Real-Time Audio (WebSocket)

```
Browser mic (PCM binary) -> audio_in_queue -> stream_input() -> Gemini Live
Gemini Live -> iter_events() audio event -> outbound_queue -> websocket -> browser speaker
```

### Screen Share (WebSocket)

```
Browser frame (base64 JPEG) -> video_in_queue -> stream_video_input() -> Gemini Live
```

### In-Session File Upload and Summarization (WebSocket)

```
{type: file_upload} -> decode base64 -> store_uploaded_file() -> FileContextStore
  -> request_uploaded_file_summary() -> text prompt to Gemini Live
  -> Gemini emits tool_call: summarize_uploaded_file(file_id)
  -> iter_events() intercepts -> ToolDispatcher.execute()
  -> UploadedFileTools.summarize_uploaded_file()
  -> asyncio.to_thread(document_processor.summarize_document())
  -> session.send_tool_response() -> Gemini continues with file context
```

### Session Reconnect (WebSocket)

```
Gemini stream failure -> reconnect_live_session()
  -> flush audio + video queues
  -> manager.close() -> manager.connect(config)
  -> emit {type: warning} + {type: session_ready} to client
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
| `screen_frame`               | `{image: base64, mimeType: image/jpeg}`          |
| `user_message`               | `{text: ...}` -- text chat turn                  |
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

## Context API Protocol

### POST /context/persona

Content-Type: `multipart/form-data`

| Field                   | Type              | Description                              |
| ----------------------- | ----------------- | ---------------------------------------- |
| `context_text_keys[]`   | string (repeated) | Key for each text item                   |
| `context_text_values[]` | string (repeated) | Value for each text item                 |
| `context_file_keys[]`   | string (repeated) | Key for each file item                   |
| `context_files[]`       | file (repeated)   | File for each file item -- max 20MB each |

Supported file MIME types: `text/*`, `image/*`, `application/pdf`, `audio/*`, `video/*`

Response:

```json
{
    "unified_context": "...",
    "text_items_count": 2,
    "file_items_count": 1
}
```

---

## Environment Variables

| Variable                    | Used By                                                       | Purpose                                      |
| --------------------------- | ------------------------------------------------------------- | -------------------------------------------- |
| `GOOGLE_CLOUD_PROJECT`      | Gemini SDK                                                    | GCP project for Vertex AI                    |
| `GOOGLE_CLOUD_LOCATION`     | Gemini SDK                                                    | GCP region                                   |
| `GOOGLE_GENAI_USE_VERTEXAI` | Gemini SDK                                                    | Toggle Vertex AI vs. AI Studio               |
| `PROXIMA_GEMINI_LIVE_MODEL` | `model_settings` -> `live_manager`                            | Model for Gemini Live session                |
| `PROXIMA_GEMINI_DOC_MODEL`  | `model_settings` -> `document_processor`, `multimodal_client` | Model for summarization and context building |

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

- `load_dotenv` runs before all service imports in `main.py` to prevent env var race
  conditions -- `GeminiMultimodalClient` uses a lazy singleton for the same reason.
- The handler uses bounded input buffering to prevent memory growth under load.
- Outbound audio frames are dropped under heavy backpressure to preserve responsiveness.
- In-session uploaded files are stored in-memory in `FileContextStore` and never written to disk.
- Files are sent to Gemini only when the `summarize_uploaded_file` tool is invoked by the model.
- `ToolDispatcher` supports both sync and async tool functions transparently.
- `GeminiLiveManager` provides both `iter_events()` (used by handler) and `listen()`
  (callback-based, available for alternative integration patterns).
- To add a new agent mode: add a member to `ProximaAgentPrompt`, map it in `SYSTEM_PROMPTS`,
  and extend `ProximaAgentMode` in `config.py`.
