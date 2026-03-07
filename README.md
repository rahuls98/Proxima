# Proxima

## Apps

- Client (Next.js): `/client`
- Server (FastAPI): `/server`

## Routes

### UI Pages

- Training Hub: `http://localhost:3000/training`
- Context Builder: `http://localhost:3000/training/context-builder`
- Live Session: `http://localhost:3000/training/session`
- Session Report: `http://localhost:3000/training/session-report`
- Persona Library: `http://localhost:3000/personas`
- Training History: `http://localhost:3000/history`

### API Endpoints

- WebSocket: `ws://localhost:8000/ws/proxima-agent?mode=training`
- Persona Generation: `POST http://localhost:8000/context/persona-instruction`
- Report Generation: `POST http://localhost:8000/report/generate`
- Health Check: `GET http://localhost:8000/health`

## Current Capabilities

### Training Features

- **Persona creation** via structured context builder (prospect details, KPIs, objections, voice settings)
- **AI-generated instructions** from persona context (250-450 word system prompts)
- **Persona library** for saving and reusing training personas
- **Training history** with cached performance reports

### Live Session Features

- **Real-time voice conversation** (mic → Gemini Live → streamed audio response)
- **Screen sharing** with visual analysis via periodic frame streaming
- **Live coaching** hints and interventions based on conversation analysis
- **Chat messaging** and file uploads during sessions
- **Session transcripts** with real-time updates

### Analytics Features

- **Performance reports** with confidence metrics, sentiment analysis, and trends
- **Key moments** identification in training sessions
- **Coaching recommendations** based on session performance
- **Report caching** for instant access to past session reports

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
cd**Server architecture and APIs**: [`server/README.md`](./server/README.md)
- **Client architecture and features**: [`client/README.md`](./client/README.md)
- **LocalStorage migration plan**: [`client/LOCALSTORAGE_MIGRATION.md`](./client/LOCALSTORAGE_MIGRATION.md)

## Data Storage

Current implementation uses browser localStorage for rapid prototyping. Features include:
- Persona library management
- Training session history
- Cached performance reports

See [`client/LOCALSTORAGE_MIGRATION.md`](./client/LOCALSTORAGE_MIGRATION.md) for detailed migration plan to server-side storage with database backing.
npm run dev
```

## Environment Variables (server/.env)

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_GENAI_USE_VERTEXAI`
- `PROXIMA_GEMINI_LIVE_MODEL`
- `PROXIMA_GEMINI_DOC_MODEL`

## Documentation

- Server architecture and tests: [`server/README.md`](./server/README.md)
- Client architecture and component structure: [`client/README.md`](./client/README.md)
