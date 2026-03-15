# proxima/api/report.py

from fastapi import APIRouter, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore

from proxima.dummy_data import DUMMY_SESSION_REPORT
from proxima.storage import get_storage
from proxima.session_store import get_session_store


router = APIRouter(prefix="/report", tags=["report"])


class GenerateReportRequest(BaseModel):
    """Request body for report generation."""
    session_id: str


class GenerateReportResponse(BaseModel):
    """Response body for report generation."""
    session_overview: dict
    overall_score: dict
    conversation_metrics: dict
    discovery_signals: dict
    objection_handling: dict
    value_communication: dict
    emotional_intelligence: dict
    prospect_engagement: dict
    deal_progression: dict
    top_feedback: list[str]
    strengths: list[str]
    practice_recommendations: dict


@router.post(
    "/generate",
    response_model=GenerateReportResponse,
    summary="Generate session performance report",
)
async def generate_session_report(request: GenerateReportRequest):
    """
    Generate a structured performance report for a session.

    For now, returns the UI dummy report structure and persists it in the
    report storage abstraction.
    """
    report = {
        **DUMMY_SESSION_REPORT,
        "session_overview": {
            **DUMMY_SESSION_REPORT["session_overview"],
            "session_id": request.session_id,
        },
    }
    get_storage().save_report(request.session_id, report)
    return GenerateReportResponse(**report)


@router.get(
    "/session/{session_id}/transcript",
    summary="Get session transcript",
)
async def get_session_transcript(session_id: str):
    """
    Retrieve the raw transcript for a session.
    
    Returns the full transcript with absolute timestamps and message count.
    
    Args:
        session_id: Session identifier.
    
    Returns:
        Session transcript and metadata.
    
    Raises:
        404: Session not found.
    """
    session_store = get_session_store()
    session = session_store.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found",
        )
    
    return {
        "session_id": session_id,
        "mode": session.mode,
        "created_at": session.created_at,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "duration_seconds": session.get_duration(),
        "message_count": len(session.transcript),
        "transcript": session.transcript,
    }


@router.delete(
    "/session/{session_id}",
    summary="Delete session data",
)
async def delete_session(session_id: str):
    """
    Delete a session and its transcript from storage.
    
    Args:
        session_id: Session identifier.
    
    Returns:
        Confirmation message.
    """
    session_store = get_session_store()
    session = session_store.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found",
        )
    
    session_store.delete_session(session_id)
    
    return {
        "session_id": session_id,
        "status": "deleted",
    }
