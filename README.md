# Proxima

Sales training platform with a Next.js client and a FastAPI + Gemini Live backend.

## Apps

- Client (Next.js): `/client`
- Server (FastAPI): `/server`

## Quick Start

### 1) Server

```bash
cd server
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Client

```bash
cd client
npm install
npm run dev
```

## Common URLs

### UI Pages

- Training Hub: `http://localhost:3000/training`
- Context Builder: `http://localhost:3000/training/context-builder`
- Live Session: `http://localhost:3000/training/session`
- Session Report: `http://localhost:3000/training/session-report`
- Persona Library: `http://localhost:3000/personas`
- Sessions: `http://localhost:3000/sessions`

### API Endpoints

- WebSocket: `ws://localhost:8000/ws/proxima-agent?mode=training`
- Persona Generation: `POST http://localhost:8000/context/persona-instruction`
- Report Generation: `POST http://localhost:8000/report/generate`
- Health Check: `GET http://localhost:8000/health`

## Data Storage

Server-side storage uses Firestore when `FIRESTORE_DATABASE` is set. The server persists:

- Session contexts and persona instructions
- Training sessions and reports
- Aggregated metrics
- Session transcripts for report regeneration

## Environment Variables (server/.env)

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_GENAI_USE_VERTEXAI`
- `PROXIMA_GEMINI_LIVE_MODEL`
- `PROXIMA_GEMINI_DOC_MODEL`
- `FIRESTORE_DATABASE`

## Documentation

- Full docs: [`docs/README.md`](./docs/README.md)
- Server overview: [`server/README.md`](./server/README.md)
- Client overview: [`client/README.md`](./client/README.md)
- Feature → API map: [`docs/API_FEATURE_MAP.md`](./docs/API_FEATURE_MAP.md)
