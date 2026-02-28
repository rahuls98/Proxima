# Gemini Live Service Wrapper

This package is the single place for Gemini Live SDK interaction logic.

## Purpose

`services/gemini_live` encapsulates Gemini-specific concerns so higher layers (websocket endpoints and feature handlers) work with normalized events and simple method calls.

## Files

- `live_manager.py`: Gemini connection lifecycle, streaming input, event normalization, and optional tool-call dispatch.
- `tool_dispatcher.py`: function registration/execution for Gemini tool calls.

## Public API (`GeminiLiveManager`)

- `connect(config)`: open a live Gemini session.
- `close()`: close live Gemini session safely.
- `stream_input(pcm_data, sample_rate=16000)`: send realtime PCM audio input.
- `begin_activity()`, `end_activity()`: manual activity boundaries (optional for manual VAD flows).
- `iter_events()`: async generator that yields normalized events per Gemini turn.

## Normalized event shape from `iter_events()`

- `{"type":"interruption"}`
- `{"type":"user_text","text":"..."}`
- `{"type":"text","text":"..."}`
- `{"type":"audio","data":<bytes>,"mime_type":"audio/pcm;rate=24000"}`
- `{"type":"turn_complete"}`
- `{"type":"waiting_for_input"}`

Tool-call responses are handled internally by `GeminiLiveManager` when function calls are present.

## Example Usage

```python
from google.genai import types
from services.gemini_live import GeminiLiveManager

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
