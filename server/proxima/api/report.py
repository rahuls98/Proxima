# proxima/api/report.py

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore

from proxima.storage import get_storage
from proxima.session_store import get_session_store
from services.gemini.multimodal.session_report import (
    SessionReportError,
    SessionReportGenerator,
)


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
    key_moments: list[dict] | None = None
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

    Generates a report from the recorded transcript and session context
    and persists it in the report storage abstraction.
    """
    storage = get_storage()
    session_store = get_session_store()
    session = session_store.get_session(request.session_id)
    transcript_messages = None
    started_at = None
    created_at = None
    duration_seconds = None

    if session:
        transcript_messages = session.transcript
        started_at = session.started_at or session.created_at
        created_at = session.created_at
        duration_seconds = session.get_duration()
    else:
        transcript_record = storage.get_session_transcript(request.session_id)
        if transcript_record and transcript_record.get("transcript"):
            transcript_messages = transcript_record.get("transcript")
            started_at = transcript_record.get("started_at") or transcript_record.get(
                "created_at"
            )
            created_at = transcript_record.get("created_at") or started_at
            duration_seconds = transcript_record.get("duration_seconds")
        else:
            cached_report = storage.get_report(request.session_id)
            if cached_report:
                return cached_report
            raise HTTPException(status_code=404, detail="Session not found")

    context_record = storage.get_session_context(request.session_id) or {}
    session_context = context_record.get("session_context") or {}

    rep_messages = [
        msg for msg in transcript_messages if msg.get("speaker") == "rep"
    ]
    prospect_messages = [
        msg for msg in transcript_messages if msg.get("speaker") == "prospect"
    ]
    total_messages = max(1, len(rep_messages) + len(prospect_messages))
    talk_ratio_rep = len(rep_messages) / total_messages
    talk_ratio_prospect = 1.0 - talk_ratio_rep

    rep_questions = sum(msg.get("text", "").count("?") for msg in rep_messages)
    open_questions = 0
    open_starters = ("what", "why", "how", "when", "where", "who", "which")
    for msg in rep_messages:
        text = str(msg.get("text", "")).strip().lower()
        if text.startswith(open_starters):
            open_questions += 1

    objections = sum(
        1
        for msg in prospect_messages
        if " but " in f" {msg.get('text', '').lower()} "
    )

    started_at = started_at or created_at or datetime.now(timezone.utc).timestamp()

    def relative_seconds(message: dict) -> int:
        try:
            timestamp = float(message.get("timestamp", started_at))
        except (TypeError, ValueError):
            timestamp = started_at
        return max(0, int(timestamp - started_at))

    def truncate(text: str, limit: int = 180) -> str:
        cleaned = " ".join(text.split())
        return cleaned if len(cleaned) <= limit else cleaned[: limit - 3].rstrip() + "..."

    def add_moment(message: dict, title: str, speaker: str):
        key_moments.append(
            {
                "timestamp_seconds": relative_seconds(message),
                "title": title,
                "speaker": speaker,
                "utterance": truncate(str(message.get("text", ""))),
            }
        )

    key_moments: list[dict] = []
    seen = set()
    first_prospect = next(iter(prospect_messages), None)
    if first_prospect:
        add_moment(first_prospect, "Initial prospect response", "Prospect")
        seen.add(id(first_prospect))

    first_rep_question = next(
        (
            msg
            for msg in rep_messages
            if "?" in str(msg.get("text", ""))
        ),
        None,
    )
    if first_rep_question and id(first_rep_question) not in seen:
        add_moment(first_rep_question, "First discovery question", "Rep")
        seen.add(id(first_rep_question))

    coach_messages = [
        msg for msg in transcript_messages if msg.get("speaker") == "coach"
    ]
    for coach_msg in coach_messages[:3]:
        if id(coach_msg) in seen:
            continue
        hint_type = str(coach_msg.get("text", "")).split(":", 1)[0].strip()
        title = hint_type.replace("_", " ").title() if hint_type else "Coaching Hint"
        add_moment(coach_msg, title, "Coach")
        seen.add(id(coach_msg))

    last_rep = rep_messages[-1] if rep_messages else None
    if last_rep and id(last_rep) not in seen:
        add_moment(last_rep, "Closing rep prompt", "Rep")

    llm_report = None
    try:
        generator = SessionReportGenerator()
        llm_entries = []
        for message in transcript_messages:
            speaker = message.get("speaker")
            if speaker not in {"rep", "prospect"}:
                continue
            text = str(message.get("text", "")).strip()
            if not text:
                continue
            llm_entries.append(
                {
                    "speaker": speaker,
                    "text": text,
                    "timestamp": float(relative_seconds(message)),
                }
            )
        if llm_entries:
            llm_report = await generator.generate_report(llm_entries)
    except SessionReportError:
        llm_report = None
    except Exception:
        llm_report = None

    def clamp(value: float, low: float, high: float) -> float:
        return max(low, min(high, value))

    def build_session_name(context: dict, prospect: str | None) -> str:
        initiative = str(context.get("current_initiative") or "").strip()
        industry = str(context.get("industry") or "").strip()
        job_title = str(context.get("job_title") or "").strip()
        company = str(context.get("company_name") or "").strip()
        prospect_name = (prospect or "").strip()

        if initiative:
            short = initiative.split(".")[0].strip()
            if prospect_name:
                return f"{prospect_name} - {short}" if short else prospect_name
            return f"{short} Review" if short else "Initiative Review"
        if prospect_name and company:
            return f"{prospect_name} @ {company}"
        if industry and company:
            return f"{industry} Discovery at {company}"
        if industry:
            return f"{industry} Discovery Call"
        if job_title and company:
            return f"{job_title} Discovery at {company}"
        if job_title:
            return f"{job_title} Discovery"
        if prospect_name:
            return f"{prospect_name} Training Session"
        return "Training Session"

    base_score = clamp(60 + rep_questions * 2 + open_questions * 3, 45, 95)
    discovery_score = clamp(base_score + 6, 45, 100)
    objection_score = clamp(base_score - 4, 40, 95)
    value_comm_score = clamp(base_score - 2, 40, 95)
    control_score = clamp(base_score - (talk_ratio_rep - 0.6) * 20, 40, 95)
    emotional_score = clamp(base_score + 2, 40, 95)

    session_start_time = datetime.fromtimestamp(started_at, timezone.utc)
    if duration_seconds is None:
        try:
            duration_seconds = max(
                0, int(float(transcript_messages[-1]["timestamp"]) - started_at)
            )
        except Exception:
            duration_seconds = 0
    duration_seconds = int(duration_seconds)

    prospect_name = session_context.get("prospect_name") or "Prospect"
    scenario = build_session_name(session_context, prospect_name)
    difficulty = "Intermediate"

    strengths = []
    if rep_questions >= 3:
        strengths.append("Maintained a steady discovery cadence.")
    if talk_ratio_rep <= 0.65:
        strengths.append("Balanced airtime with the prospect.")
    if not strengths:
        strengths.append("Stayed engaged through the full conversation.")

    top_feedback = []
    if open_questions < 2:
        top_feedback.append("Ask more open-ended questions to deepen discovery.")
    if talk_ratio_rep > 0.7:
        top_feedback.append("Create more space for the prospect to speak.")
    if not top_feedback:
        top_feedback.append("Push for one clearer next step before closing.")

    discovery_signals = {
        "pain_identified": bool(session_context.get("current_initiative")),
        "current_tools_identified": bool(session_context.get("current_tools")),
        "budget_discussed": bool(session_context.get("budget_status")),
        "decision_process_identified": bool(
            session_context.get("decision_timeline")
        ),
        "timeline_discussed": session_context.get("decision_timeline")
        or "not_discussed",
    }

    report = {
        "session_overview": {
            "session_id": request.session_id,
            "scenario": scenario,
            "prospect_persona": prospect_name,
            "difficulty": difficulty,
            "session_duration_seconds": duration_seconds,
            "session_start_time": session_start_time.isoformat().replace(
                "+00:00", "Z"
            ),
        },
        "overall_score": {
            "score": int(base_score),
            "performance_level": "Strong" if base_score >= 75 else "Steady",
            "breakdown": {
                "discovery": int(discovery_score),
                "objection_handling": int(objection_score),
                "value_communication": int(value_comm_score),
                "conversation_control": int(control_score),
                "emotional_intelligence": int(emotional_score),
            },
        },
        "conversation_metrics": {
            "talk_ratio_rep": talk_ratio_rep,
            "talk_ratio_prospect": talk_ratio_prospect,
            "questions_asked": rep_questions,
            "open_questions": open_questions,
            "interruptions": 0,
            "avg_response_latency_seconds": 2.4,
        },
        "discovery_signals": discovery_signals,
        "objection_handling": {
            "objections_detected": objections,
            "acknowledgment_quality": "Neutral",
            "evidence_used": "Light",
            "follow_up_questions": "Moderate",
        },
        "value_communication": {
            "value_clarity": "Moderate",
            "feature_vs_benefit_balance": "Balanced",
            "roi_quantified": False,
            "personalization": "Moderate",
        },
        "emotional_intelligence": {
            "empathy": "Moderate",
            "listening_signals": "Occasional",
            "rapport_building": "Growing",
            "tone_adaptation": "Adaptive",
        },
        "prospect_engagement": {
            "trust_change": clamp((0.6 - abs(talk_ratio_rep - 0.6)), -1, 1),
            "engagement_level": "Medium",
            "objection_frequency": objections,
            "conversation_momentum": "Steady",
        },
        "deal_progression": {
            "buying_interest": "Moderate",
            "next_step_clarity": "Somewhat clear",
            "commitment_secured": rep_questions >= 3,
        },
        "key_moments": key_moments,
        "top_feedback": top_feedback,
        "strengths": strengths,
        "practice_recommendations": {
            "focus_area": "Discovery depth",
            "recommended_exercise": "Practice asking follow-up why/what questions.",
        },
    }

    if llm_report:
        llm_moments = llm_report.get("key_moments")
        if isinstance(llm_moments, list) and llm_moments:
            report["key_moments"] = llm_moments
        llm_strengths = llm_report.get("strengths")
        if isinstance(llm_strengths, list) and llm_strengths:
            report["strengths"] = llm_strengths
        llm_improvements = llm_report.get("improvements")
        if isinstance(llm_improvements, list) and llm_improvements:
            report["top_feedback"] = llm_improvements
            report["practice_recommendations"]["focus_area"] = (
                llm_improvements[0]
            )
        llm_recs = llm_report.get("recommendations")
        if isinstance(llm_recs, list) and llm_recs:
            report["practice_recommendations"]["recommended_exercise"] = (
                llm_recs[0]
            )

    storage.save_report(request.session_id, report)
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
