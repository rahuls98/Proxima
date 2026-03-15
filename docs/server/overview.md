# Server Overview

The server is a FastAPI application that orchestrates Gemini Live sessions, persona generation, and report creation.

## Key Endpoints

- WebSocket: `ws://localhost:8000/ws/proxima-agent?mode=training`
- Persona generation: `POST /context/persona-instruction`
- Report generation: `POST /report/generate`
- Health check: `GET /health`

## Architecture

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

## Core Flows

### Persona Build

1. Client sends structured context to `/context/persona-instruction`.
2. Server generates persona instruction via Gemini multimodal.
3. Session context + persona instruction are stored for later use.

### Live Session

1. Client connects to `/ws/proxima-agent`.
2. Server selects voice, applies system instruction, starts Gemini Live.
3. Audio/video/text streams are proxied; coaching hints are emitted as UI events.
4. Transcript is persisted at session end.

### Report Generation

1. Client calls `/report/generate`.
2. Server loads transcript (in-memory or Firestore).
3. LLM analysis produces key moments + insights.
4. Deterministic metrics are combined with LLM insights.
5. Report is saved and returned.

## Storage

When `FIRESTORE_DATABASE` is set, Firestore is used to persist:

- `session_contexts` (persona instructions + context)
- `reports` (session reports)
- `metrics` (aggregated metrics)
- `session_transcripts` (raw transcript for regeneration)

## Environment

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_GENAI_USE_VERTEXAI`
- `PROXIMA_GEMINI_LIVE_MODEL`
- `PROXIMA_GEMINI_DOC_MODEL`
- `FIRESTORE_DATABASE`
