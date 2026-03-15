# Prompts & Config

## Live Session Config

`server/proxima/config/config.py` builds the Gemini Live config:

- Audio-only response mode
- Voice configured via `voice_name`
- Input/output transcription enabled
- Activity detection enabled

## System Prompts

`server/proxima/config/prompts.py` contains:

- Training persona prompt
- Tool execution rules (silent tool turns, avoid prefill text)

## Voice Selection

Voice is selected in `server/proxima/websocket/handler.py`:

- Prefer stored `voice_name` from session context
- Fallback to tone/gender filters
- Persist normalized `voice_name`, `voice_gender`, `voice_tone` in session context
