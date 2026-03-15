# WebSocket Protocol

Endpoint: `ws://localhost:8000/ws/proxima-agent?mode=training`

## Client → Server

| Message                      | Description                             |
| ---------------------------- | --------------------------------------- |
| Binary frame                 | PCM16 mono audio at 16kHz               |
| `stream_start`               | Enable mic forwarding to Gemini         |
| `stream_stop`                | Disable mic forwarding                  |
| `activity_end`               | Signal end of user speech               |
| `screen_share_start`         | Begin accepting screen frames           |
| `screen_share_stop`          | Stop accepting screen frames            |
| `screen_frame`               | `{image: base64, mimeType: image/jpeg}` |
| `user_message`               | `{text: ...}` – text chat turn          |
| `file_upload`                | `{fileName, mimeType, data: base64}`    |
| `ping`                       | Keepalive; server replies with `pong`   |
| `disconnect` / `end_session` | Graceful session close                  |

Query param: `?mode=training` (invalid values fall back to training)

## Server → Client

| Message                             | Description                                  |
| ----------------------------------- | -------------------------------------------- |
| `session_ready`                     | Gemini session open; includes `mode`         |
| `stream_started` / `stream_stopped` | Mic state acknowledgement                    |
| `audio`                             | `{audio: base64, mimeType}` – streamed audio |
| `user_text`                         | Input transcription from Gemini              |
| `text`                              | Output transcription from Gemini             |
| `turn_complete`                     | Gemini finished its turn                     |
| `waiting_for_input`                 | Gemini idle, awaiting input                  |
| `interruption`                      | User interrupted the model                   |
| `file_uploaded`                     | `{fileId, fileName, mimeType}`               |
| `warning`                           | Non-fatal operational message                |
| `error`                             | Fatal error; connection closes with 1011     |
| `coach_intervention`                | `{payload: {category, hint}}`                |

## Notes

- Tool calls silence text and audio in the same response packet to prevent ghost utterances.
- `activity_end` is forwarded to Gemini Live to close user turns reliably.
