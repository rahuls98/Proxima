# Proxima Agent

Core orchestration layer for real-time conversational training sessions via Gemini Live.

## Structure

```
proxima/
├── __init__.py              # Exports ProximaAgentWebSocketHandler and context_router
├── config/                  # Configuration, modes, and system prompts
│   ├── config.py           # Mode resolution and Gemini Live config builder
│   └── prompts.py          # System prompts for each agent mode
├── websocket/              # Real-time session orchestration
│   └── handler.py          # WebSocket handler: audio/video/chat stream management
└── api/                    # REST endpoints
    └── context.py          # POST /context/persona: prospect context builder
```

## Modules

### config/

Owns session configuration and mode resolution.

- **config.py**: `build_live_config()` assembles `types.LiveConnectConfig` with voice settings, system prompts, and Gemini Live parameters. `resolve_mode()` normalizes query parameters.
- **prompts.py**: `ProximaAgentPrompt` enum defines system instructions for each agent mode (currently: `TRAINING`).

### websocket/

Manages real-time WebSocket sessions with bidirectional audio, video, and chat.

- **handler.py**: `ProximaAgentWebSocketHandler` orchestrates five concurrent tasks: `websocket_sender`, `receive_from_client`, `send_to_gemini`, `send_video_to_gemini`, and `receive_from_gemini`. Handles backpressure, automatic reconnection, and file uploads.

### api/

REST endpoints for session preparation.

- **context.py**: `POST /context/persona` accepts named text and file context items, synthesizes a unified prospect persona via multimodal Gemini call, and returns a summary.

## Protocol

See [WebSocket Protocol](../README.md#websocket-protocol) and [Context API Protocol](../README.md#context-api-protocol) in the main server README.
