import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from proxima_agent import ProximaAgentWebSocketHandler

# Load server/.env for Vertex/Gemini environment variables.
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", override=False)

logger = logging.getLogger("proxima_agent_app")
logger.setLevel(logging.INFO)

app = FastAPI(title="Proxima Agent API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

handler = ProximaAgentWebSocketHandler(logger=logging.getLogger("proxima_agent_ws"))


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/proxima-agent")
async def proxima_agent_websocket(websocket: WebSocket):
    await handler.run(websocket)
