# server/main.py

import logging
from pathlib import Path

from dotenv import load_dotenv  # type: ignore
from fastapi import FastAPI, WebSocket  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore

from proxima import (
    ProximaAgentWebSocketHandler,
    context_router,
    report_router,
    storage_router,
)

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

app.include_router(context_router)  
app.include_router(report_router)  
app.include_router(storage_router)

handler = ProximaAgentWebSocketHandler(logger=logging.getLogger("proxima_agent_ws"))


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/proxima-agent")
async def proxima_agent_websocket(websocket: WebSocket):
    await handler.run(websocket)
