# Gemini Live Service

Real-time streaming integration with Gemini Live for continuous conversations.

## Overview

Provides a high-level facade over the Gemini Multimodal Live API. Manages session lifecycle, concurrent audio/video/text streaming, tool orchestration, and event normalization.

## Modules

### manager.py - GeminiLiveManager

Main session manager.

- `connect(config)` / `close()`: Manages SDK connection context manager
- `stream_input(pcm, sample_rate)`: Streams PCM audio data to Gemini
- `stream_video_input(frame_data, mime_type)`: Streams video frames (JPEG/PNG)
- `send_text_message(text)`: Sends text turns (user chat input)
- `iter_events()`: Async generator yielding normalized event dicts
    - Intercepts `tool_call` responses
    - Resolves tools via `ToolDispatcher`
    - Sends tool responses back to Gemini
    - Yields normalized events: `audio`, `text`, `user_text`, `turn_complete`, `waiting_for_input`, `interruption`
- `store_uploaded_file(file_name, mime_type, data)` / `request_uploaded_file_summary(file_id, file_name, mime_type)`: File upload entry points
- `live_tool_declarations()`: Returns list of registered tools for config assembly

### dispatcher.py - ToolDispatcher

Tool registry and executor.

- `register(name, func)`: Registers a tool function (sync or async)
- `execute(tool_call)`: Executes registered tool
    - Parses args from tool call
    - Detects if async via `inspect.iscoroutinefunction()`
    - Invokes function and returns `{result: ...}` or `{error: ...}`

## Event Flow

```
iter_events() loop:
  for each SDK event:
    if type == "audio":
      normalize and yield {type, audio, mimeType}
    elif type == "tool_call":
      dispatcher.execute(tool_call)
      session.send_tool_response()
    elif type in {text, user_text, interruption, turn_complete, waiting_for_input}:
      normalize and yield event
```

## Tool Integration

Tools are registered at construction via `UploadedFileTools`:

```python
manager = GeminiLiveManager()
# manager._tool_dispatcher has summarize_uploaded_file registered
config = build_live_config(..., tools=manager.live_tool_declarations())
```

When Gemini calls a tool, `iter_events()` intercepts, executes via dispatcher, and resumes the session.

## Usage

```python
from services.gemini.live import GeminiLiveManager
from proxima.config import build_live_config, resolve_mode

manager = GeminiLiveManager()
config = build_live_config("training", tools=manager.live_tool_declarations())
await manager.connect(config)

# Stream audio to Gemini
await manager.stream_input(pcm_bytes, sample_rate=16000)

# Receive normalized events
async for event in manager.iter_events():
    if event["type"] == "audio":
        send_to_client(event["audio"])
    elif event["type"] == "text":
        send_to_client(event["text"])

await manager.close()
```

## Environment

Uses model from `services.gemini.config.get_live_model_name()` — set `PROXIMA_GEMINI_LIVE_MODEL`. 2. Websocket handler decodes data and calls `GeminiLiveManager.store_uploaded_file(...)`. 3. Handler calls `GeminiLiveManager.request_uploaded_file_summary(...)`. 4. Model emits a tool call (`summarize_uploaded_file`). 5. `live_manager.py` forwards that call to `tool_dispatcher.py`. 6. `ToolDispatcher` invokes registered `UploadedFileTools.summarize_uploaded_file(...)`. 7. Tool uses Gemini document processing (configured by `PROXIMA_GEMINI_DOC_MODEL`) and returns summary context to the live model.

## Example Usage

```python
from google.genai import types
from services.gemini.live import GeminiLiveManager

manager = GeminiLiveManager()
config = types.LiveConnectConfig(response_modalities=["AUDIO"])

await manager.connect(config)

async for event in manager.iter_events():
    if event["type"] == "text":
        print(event["text"])

await manager.close()
```

## Design Notes

- Keep feature/websocket layers focused on transport and session behavior.
- Keep Gemini response parsing and tool-call handling in this package.
- Keep callbacks/non-Gemini orchestration non-blocking to avoid websocket timeouts.
