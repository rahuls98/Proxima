# Agent Service (Client)

Location: `client/lib/proxima-agent/`

Responsibilities:

- WebSocket lifecycle (connect, reconnect, disconnect)
- Microphone capture + PCM streaming
- Speaker playback for Gemini audio
- Screen-share frame capture and upload
- Activity end detection (silence-based)

Key events:

- `stream_start` / `stream_stop` for mic control
- `activity_end` for end-of-turn signaling
- `screen_frame` for visual context
