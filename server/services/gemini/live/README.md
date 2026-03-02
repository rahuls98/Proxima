# Gemini Live Service

Facade over Gemini Multimodal Live API for real-time bidirectional streaming conversations.

## What It Does

`GeminiLiveManager` handles:

- WebSocket connection lifecycle with Gemini Live API
- Streaming audio/video input to Gemini
- Receiving and normalizing events (audio, text, transcriptions, state changes)
- Intercepting and executing tool calls (file summarization, etc.)

## Key Methods

**Connection:**

- `await manager.connect(config)` - Start session
- `await manager.close()` - End session

**Streaming Input:**

- `await manager.stream_input(pcm_bytes, sample_rate)` - Send audio
- `await manager.stream_video_input(frame_data, mime_type)` - Send video frames
- `await manager.send_text_message(text)` - Send text turn

**Receiving Output:**

- `async for event in manager.iter_events()` - Stream normalized events

**File Uploads:**

- `manager.store_uploaded_file(name, mime_type, data)` - Store file
- `manager.request_uploaded_file_summary(file_id, name, mime_type)` - Request summary

**Tools:**

- `manager.live_tool_declarations()` - Get registered tools

## How to Use

```python
from services.gemini.live import GeminiLiveManager
from proxima.config import build_live_config

manager = GeminiLiveManager()
config = build_live_config("Custom persona...", "training",
                           tools=manager.live_tool_declarations())
await manager.connect(config)

await manager.stream_input(pcm_bytes, sample_rate=16000)

async for event in manager.iter_events():
    if event["type"] == "audio":
        # Send to client
    elif event["type"] == "text":
        # Send to client

await manager.close()
```

## Tool Integration

Tools like file summarization are registered automatically via `UploadedFileTools`. When Gemini emits a tool call, the manager intercepts, executes it via `ToolDispatcher`, and returns the result.

## Modules

**manager.py** - Main `GeminiLiveManager` class

**dispatcher.py** - Tool registry and execution

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
