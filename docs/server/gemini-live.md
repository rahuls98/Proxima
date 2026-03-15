# Gemini Live Integration

Location: `server/services/gemini/live/`

Key responsibilities:

- Open/close live Gemini sessions
- Stream audio frames and handle responses
- Dispatch tool calls
- Emit UI events (coaching hints)

Ghost prevention:

- Text is suppressed when tool calls are present in a response packet.
- Audio is suppressed in the same packet to avoid double-intent audio.

Activity handling:

- `activity_end` is forwarded to Gemini to close user turns.
