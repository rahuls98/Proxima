# proxima/api/report.py

import logging

from fastapi import APIRouter, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore

from services.gemini.multimodal import (
    SessionReportGenerator,
    SessionReportError,
    SessionMetrics,
    TranscriptEntry,
)
from proxima.session_store import get_session_store


logger = logging.getLogger("report_api")
router = APIRouter(prefix="/report", tags=["report"])

# Lazy singleton for report generator
_generator: SessionReportGenerator | None = None


def get_generator() -> SessionReportGenerator:
    """Get or create the session report generator."""
    global _generator
    if _generator is None:
        _generator = SessionReportGenerator()
    return _generator


class GenerateReportRequest(BaseModel):
    """Request body for report generation."""
    session_id: str


class GenerateReportResponse(BaseModel):
    """Response body for report generation."""
    session_id: str
    session_total_time: str
    rep_confidence_avg: float
    rep_confidence_trend: str
    on_rep_confidence_avg: float
    on_rep_confidence_trend: str
    prospect_sentiment_avg: float
    prospect_sentiment_trend: str
    key_moments: list[str]
    recommendations: list[str]
    transcript_length: int
    # Multi-participant session fields (optional)
    call_leadership_score: float | None = None
    delegation_skill: float | None = None
    interruption_handling: float | None = None
    collaboration_score: float | None = None
    peer_leadership: float | None = None
    teammate_archetype: str | None = None


@router.post(
    "/generate",
    response_model=GenerateReportResponse,
    summary="Generate session performance report",
)
async def generate_session_report(request: GenerateReportRequest):
    """
    Generate a structured performance report from a training session transcript.
    
    This endpoint analyzes the session transcript using Gemini and extracts:
    - Session total time
    - Rep confidence metrics (internal self-confidence)
    - On-rep confidence (how the rep appears to the prospect)
    - Prospect sentiment across the session
    - Key moments and coaching recommendations
    
    Args:
        request: Contains session_id to generate report for.
    
    Returns:
        Structured performance metrics and coaching insights.
    
    Raises:
        404: Session not found.
        422: Transcript is empty or invalid.
        500: Gemini API error or analysis failure.
    """
    session_store = get_session_store()
    session = session_store.get_session(request.session_id)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {request.session_id} not found",
        )
    
    # Get relative transcript (timestamps from session start)
    transcript = session.get_relative_transcript()
    
    if not transcript:
        raise HTTPException(
            status_code=422,
            detail="Session transcript is empty. Cannot generate report.",
        )
    
    # Convert to the format expected by the report generator
    transcript_entries: list[TranscriptEntry] = []
    for msg in transcript:
        transcript_entries.append({
            "speaker": msg["speaker"],
            "text": msg["text"],
            "timestamp": msg["timestamp"],
        })
    
    # Generate report using Gemini
    generator = get_generator()
    try:
        # Get teammate archetype from session config if available
        teammate_archetype = None
        if session.teammate_config:
            teammate_archetype = session.teammate_config.get("behavior_archetype")
        
        metrics = await generator.generate_report(transcript_entries, teammate_archetype)
    except SessionReportError as exc:
        logger.exception("Failed to generate session report")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report: {str(exc)}",
        ) from exc
    
    # Return structured response
    return GenerateReportResponse(
        session_id=request.session_id,
        session_total_time=metrics["session_total_time"],
        rep_confidence_avg=metrics["rep_confidence_avg"],
        rep_confidence_trend=metrics["rep_confidence_trend"],
        on_rep_confidence_avg=metrics["on_rep_confidence_avg"],
        on_rep_confidence_trend=metrics["on_rep_confidence_trend"],
        prospect_sentiment_avg=metrics["prospect_sentiment_avg"],
        prospect_sentiment_trend=metrics["prospect_sentiment_trend"],
        key_moments=metrics["key_moments"],
        recommendations=metrics["recommendations"],
        transcript_length=len(transcript),
        call_leadership_score=metrics.get("call_leadership_score"),
        delegation_skill=metrics.get("delegation_skill"),
        interruption_handling=metrics.get("interruption_handling"),
        collaboration_score=metrics.get("collaboration_score"),
        peer_leadership=metrics.get("peer_leadership"),
        teammate_archetype=metrics.get("teammate_archetype"),
    )


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
