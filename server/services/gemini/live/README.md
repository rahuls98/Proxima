`server/services/gemini/live/README.md`

# Gemini Live Service Wrapper

This package is the single place for Gemini Live SDK interaction logic.

## Purpose

`services/gemini/live` encapsulates Gemini-specific concerns so higher layers (websocket endpoints and feature handlers) work with normalized events and simple method calls.

This now includes multimodal realtime input:

- microphone PCM audio
- screen-share image frames (for visual context and analysis)
- text chat turns
- uploaded-file tool orchestration for document summarization

## Files

- `live_manager.py`: Gemini connection lifecycle, streaming input, event normalization, and optional tool-call dispatch.
- `tool_dispatcher.py`: function registration/execution for Gemini tool calls.
- `../tools/uploaded_file_tools.py`: reusable uploaded-file storage + summary tool declaration/implementation.

## Public API (`GeminiLiveManager`)

- `connect(config)`: open a live Gemini session.
- `close()`: close live Gemini session safely.
- `stream_input(pcm_data, sample_rate=16000)`: send realtime PCM audio input.
- `stream_video_input(frame_data, mime_type="image/jpeg")`: send realtime screen-share frames as visual input.
- `begin_activity()`, `end_activity()`: manual activity boundaries (optional for manual VAD flows).
- `iter_events()`: async generator that yields normalized events per Gemini turn.
- `send_text_message(text, turn_complete=True)`: send a text chat turn into the live session.
- `store_uploaded_file(file_name, mime_type, data)`: stage uploaded file bytes in session-local context.
- `request_uploaded_file_summary(file_id, file_name, mime_type)`: prompt model to call `summarize_uploaded_file`.

## Normalized event shape from `iter_events()`

- `{"type":"interruption"}`
- `{"type":"user_text","text":"..."}`
- `{"type":"text","text":"..."}`
- `{"type":"audio","data":<bytes>,"mime_type":"audio/pcm;rate=24000"}`
- `{"type":"turn_complete"}`
- `{"type":"waiting_for_input"}`

Tool-call responses are handled internally by `GeminiLiveManager` when function calls are present.
Tool execution is routed through `ToolDispatcher`, which calls registered functions and returns `FunctionResponse` payloads.

## Uploaded-file summary flow

1. Client sends `file_upload` websocket message with base64 file data.
2. Websocket handler decodes data and calls `GeminiLiveManager.store_uploaded_file(...)`.
3. Handler calls `GeminiLiveManager.request_uploaded_file_summary(...)`.
4. Model emits a tool call (`summarize_uploaded_file`).
5. `live_manager.py` forwards that call to `tool_dispatcher.py`.
6. `ToolDispatcher` invokes registered `UploadedFileTools.summarize_uploaded_file(...)`.
7. Tool uses Gemini document processing (configured by `PROXIMA_GEMINI_DOC_MODEL`) and returns summary context to the live model.

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
