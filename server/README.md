# Proxima Server

FastAPI backend that orchestrates Gemini Live sessions, persona generation, and report creation.

## Key Endpoints

- WebSocket: `ws://localhost:8000/ws/proxima-agent?mode=training`
- Persona generation: `POST /context/persona-instruction`
- Persona image: `POST /context/persona-image`
- Report generation: `POST /report/generate`
- Health check: `GET /health`

## Core Flows

### Persona Build

1. Client sends structured context to `/context/persona-instruction`.
2. Server generates a persona instruction via Gemini multimodal.
3. Session context + persona instruction are stored for later use.

### Live Session

1. Client connects to `/ws/proxima-agent`.
2. Server selects voice, applies system instruction, and starts Gemini Live.
3. Audio/video/text streams are proxied; coaching hints are emitted as UI events.
4. Transcript is persisted when the session ends.

### Report Generation

1. Client calls `/report/generate`.
2. Server loads the transcript (in-memory or Firestore).
3. LLM analysis populates key moments + insights.
4. Deterministic metrics are combined with LLM insights.
5. Report is saved and returned.

## Storage

When `FIRESTORE_DATABASE` is set, Firestore is used to persist:

- `session_contexts` (persona instructions + context)
- `reports` (session reports)
- `metrics` (aggregated metrics)
- `session_transcripts` (raw transcript for regeneration)

## Directory Structure

```
server/
├── main.py
├── proxima/
│   ├── api/            # REST endpoints
│   ├── websocket/      # Live session handler
│   ├── config/         # Prompts + Gemini Live config
│   └── storage/        # Firestore/dummy persistence
└── services/
    └── gemini/         # Live + multimodal integration
```

## Environment

Required for Gemini:

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_GENAI_USE_VERTEXAI`
- `PROXIMA_GEMINI_LIVE_MODEL`
- `PROXIMA_GEMINI_DOC_MODEL`

Enable Firestore:

- `FIRESTORE_DATABASE`
