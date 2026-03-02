# Proxima Agent (Orchestration Layer)

Core orchestration for real-time training sessions: WebSocket handling, REST APIs, and configuration.

## Modules

**config/** - Session configuration and system prompts

- Mode resolution (?mode=training)
- Gemini Live config assembly
- System prompts per mode

**websocket/** - Real-time bidirectional streaming

- Audio, video, text, file upload handling
- Automatic reconnection on errors
- 5 concurrent tasks for streaming

**api/** - REST endpoints

- POST /context/persona-instruction - Generate persona from session context

## How It Fits Together

Client connects to WebSocket → mode is validated and system instruction (from URL param) is loaded → Gemini Live session initialized → bidirectional audio/video/text streaming begins.

Before session, client calls REST API to generate persona instruction, stores in localStorage, passes in WebSocket URL.
