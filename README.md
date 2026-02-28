# Proxima

## Apps

- Client (Next.js): `/client`
- Server (FastAPI): `/server`

## Routes

- UI: `http://localhost:3000/training`
- WebSocket API: `ws://localhost:8000/ws/proxima-agent?mode=training`
- Health: `http://localhost:8000/health`

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

## Environment Variables (server/.env)

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_GENAI_USE_VERTEXAI`

## Documentation

- Server architecture and tests: [`server/README.md`](./server/README.md)
- Client architecture and component structure: [`client/README.md`](./client/README.md)
