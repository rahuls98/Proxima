from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query  # type: ignore
from pydantic import BaseModel, Field  # type: ignore

from proxima.dummy_data import DUMMY_SESSION_REPORT
from proxima.storage import get_storage


router = APIRouter(prefix="/api", tags=["storage"])


class PersonaPayload(BaseModel):
    id: str | None = None
    name: str
    createdAt: str | None = None
    personaInstruction: str
    sessionContext: dict[str, Any]
    jobTitle: str | None = None
    department: str | None = None
    prospectName: str | None = None
    isPriority: bool | None = None


class PersonaUpdatePayload(BaseModel):
    name: str | None = None
    personaInstruction: str | None = None
    sessionContext: dict[str, Any] | None = None
    jobTitle: str | None = None
    department: str | None = None
    prospectName: str | None = None
    isPriority: bool | None = None


class TrainingSessionPayload(BaseModel):
    id: str | None = None
    timestamp: str
    transcriptLength: int
    personaName: str | None = None
    jobTitle: str | None = None
    duration: str | None = None
    scenario: str | None = None


class TrainingMetricPayload(BaseModel):
    session_id: str
    timestamp: str
    scenario: str
    difficulty: str
    duration_seconds: int
    overall_score: int
    discovery_score: int
    objection_handling_score: int
    value_communication_score: int
    conversation_control_score: int
    emotional_intelligence_score: int
    talk_ratio_rep: float
    questions_asked: int
    open_questions: int
    interruptions: int
    discovery_completeness: int
    trust_change: float
    commitment_secured: bool


class ReportPayload(BaseModel):
    session_overview: dict[str, Any]
    overall_score: dict[str, Any]
    conversation_metrics: dict[str, Any]
    discovery_signals: dict[str, Any]
    objection_handling: dict[str, Any]
    value_communication: dict[str, Any]
    emotional_intelligence: dict[str, Any]
    prospect_engagement: dict[str, Any]
    deal_progression: dict[str, Any]
    top_feedback: list[str]
    strengths: list[str]
    practice_recommendations: dict[str, Any]


class DraftPayload(BaseModel):
    id: str | None = None
    persona_instruction: str | None = None
    session_context: dict[str, Any] | None = None
    created_at: str | None = None
    updated_at: str | None = None


@router.get("/personas")
async def list_personas():
    return get_storage().list_personas()


@router.post("/personas")
async def create_persona(payload: PersonaPayload):
    return get_storage().create_persona(payload.model_dump())


@router.get("/personas/{persona_id}")
async def get_persona(persona_id: str):
    persona = get_storage().get_persona(persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


@router.put("/personas/{persona_id}")
async def update_persona(persona_id: str, payload: PersonaUpdatePayload):
    updated = get_storage().update_persona(
        persona_id, payload.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Persona not found")
    return updated


@router.delete("/personas/{persona_id}")
async def delete_persona(persona_id: str):
    if not get_storage().delete_persona(persona_id):
        raise HTTPException(status_code=404, detail="Persona not found")
    return {"status": "deleted", "id": persona_id}


@router.post("/personas/{persona_id}/priority")
async def toggle_persona_priority(persona_id: str):
    persona = get_storage().get_persona(persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    next_priority = not bool(persona.get("isPriority"))
    updated = get_storage().update_persona(persona_id, {"isPriority": next_priority})
    return updated


@router.get("/sessions")
async def list_sessions():
    return get_storage().list_sessions()


@router.post("/sessions")
async def create_session(payload: TrainingSessionPayload):
    return get_storage().create_session(payload.model_dump())


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = get_storage().get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    if not get_storage().delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted", "id": session_id}


@router.get("/sessions/{session_id}/report")
async def get_session_report(session_id: str):
    report = get_storage().get_report(session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/reports")
async def list_report_ids():
    return {"ids": get_storage().list_report_ids()}


@router.get("/reports/{session_id}")
async def get_report(session_id: str):
    report = get_storage().get_report(session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.put("/reports/{session_id}")
async def save_report(session_id: str, payload: ReportPayload):
    data = payload.model_dump()
    if not data.get("session_overview"):
        data["session_overview"] = {}
    data["session_overview"]["session_id"] = session_id
    get_storage().save_report(session_id, data)
    return data


@router.delete("/reports/{session_id}")
async def delete_report(session_id: str):
    if not get_storage().delete_report(session_id):
        raise HTTPException(status_code=404, detail="Report not found")
    return {"status": "deleted", "id": session_id}


@router.delete("/reports")
async def clear_reports():
    get_storage().clear_reports()
    return {"status": "cleared"}


@router.get("/metrics")
async def list_metrics(
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
):
    return get_storage().list_metrics_in_range(start, end)


@router.post("/metrics")
async def save_metric(payload: TrainingMetricPayload):
    get_storage().save_metric(payload.model_dump())
    return {"status": "saved", "session_id": payload.session_id}


@router.get("/metrics/aggregate")
async def get_metrics_aggregate():
    return get_storage().get_aggregate()


@router.get("/metrics/{session_id}")
async def get_metric(session_id: str):
    metric = get_storage().get_metric(session_id)
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    return metric


@router.delete("/metrics/{session_id}")
async def delete_metric(session_id: str):
    if not get_storage().delete_metric(session_id):
        raise HTTPException(status_code=404, detail="Metric not found")
    return {"status": "deleted", "id": session_id}


@router.delete("/metrics")
async def clear_metrics():
    get_storage().clear_metrics()
    return {"status": "cleared"}


@router.post("/sessions/draft")
async def create_draft(payload: DraftPayload):
    return get_storage().create_draft(payload.model_dump(exclude_none=True))


@router.get("/sessions/draft/latest")
async def get_latest_draft():
    draft = get_storage().get_latest_draft()
    if not draft:
        return {"status": "empty"}
    return draft


@router.put("/sessions/draft/{draft_id}")
async def update_draft(draft_id: str, payload: DraftPayload):
    updated = get_storage().update_draft(
        draft_id, payload.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Draft not found")
    return updated


@router.delete("/sessions/draft/{draft_id}")
async def delete_draft(draft_id: str):
    if not get_storage().delete_draft(draft_id):
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"status": "deleted", "id": draft_id}


@router.post("/sessions/draft/{draft_id}/start")
async def start_draft(draft_id: str):
    draft = get_storage().get_latest_draft()
    if not draft or draft.get("id") != draft_id:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"status": "started", "draft_id": draft_id}


@router.get("/reports/dummy")
async def get_dummy_report():
    return DUMMY_SESSION_REPORT

