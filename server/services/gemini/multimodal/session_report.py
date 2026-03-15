# services/gemini/multimodal/session_report.py

import asyncio
import logging
from datetime import timedelta
from typing import TypedDict

from google import genai
from google.genai import types # type: ignore

from services.gemini.config import get_doc_model_name
from .response_parser import ExtractionError, extract_text


logger = logging.getLogger("session_report")


class TranscriptEntry(TypedDict):
    """Single transcript entry from a training session."""
    speaker: str  # "rep" or "prospect"
    text: str
    timestamp: float  # Seconds from session start


class SessionMetrics(TypedDict):
    """Structured metrics extracted from a training session."""
    session_total_time: str  # Formatted duration (e.g., "15m 30s")
    rep_confidence_avg: float  # 0-10 scale
    rep_confidence_trend: str  # "increasing", "decreasing", "stable"
    on_rep_confidence_avg: float  # 0-10 scale (how confident the rep appears to prospect)
    on_rep_confidence_trend: str  # "increasing", "decreasing", "stable"
    prospect_sentiment_avg: float  # 0-10 scale (0=very negative, 10=very positive)
    prospect_sentiment_trend: str  # "improving", "declining", "stable"
    key_moments: list[dict]  # Notable moments from the session
    strengths: list[str]  # What the rep did well
    improvements: list[str]  # What needs improvement
    recommendations: list[str]  # Coaching recommendations


# System prompt for session analysis
SESSION_ANALYSIS_PROMPT = """You are an expert sales training analyst for an AI-powered sales coaching platform.

Your task is to analyze a complete training session transcript and extract structured performance metrics.

The transcript contains alternating exchanges between a sales representative ("rep") and an AI prospect simulation ("prospect").

Analyze the following dimensions:

1. **Rep Confidence (Internal)**: How confident does the rep sound in their own delivery?
   - Scale: 0-10 (0=very hesitant/uncertain, 10=extremely confident)
   - Track the trend across the session (increasing, decreasing, stable)

2. **On-Rep Confidence (External)**: How confident does the rep APPEAR to the prospect based on the prospect's responses?
   - Scale: 0-10 (0=prospect clearly doubts rep, 10=prospect fully trusts rep)
   - Track the trend across the session

3. **Prospect Sentiment**: How positive/negative is the prospect's emotional state?
   - Scale: 0-10 (0=very negative/hostile, 10=very positive/enthusiastic)
   - Track the trend across the session (improving, declining, stable)

4. **Key Moments**: Identify 3-5 critical moments that impacted the session outcome.
   Each moment must include:
   - timestamp_seconds (integer seconds from session start)
   - title (short label)
   - speaker ("Rep" or "Prospect")
   - utterance (verbatim or lightly trimmed quote)

5. **Strengths**: Provide 2-4 concrete strengths with evidence from the transcript.
6. **Improvements**: Provide 2-4 concrete improvement areas with evidence.
7. **Coaching Recommendations**: Provide 3-5 specific, actionable coaching points.

**Output Format**:
Return ONLY valid JSON matching this exact structure (no markdown, no code blocks):

{
  "rep_confidence_avg": <number 0-10>,
  "rep_confidence_trend": "<increasing|decreasing|stable>",
  "on_rep_confidence_avg": <number 0-10>,
  "on_rep_confidence_trend": "<increasing|decreasing|stable>",
  "prospect_sentiment_avg": <number 0-10>,
  "prospect_sentiment_trend": "<improving|declining|stable>",
  "key_moments": [
    {
      "timestamp_seconds": 75,
      "title": "Pricing objection",
      "speaker": "Prospect",
      "utterance": "That's more than we expected this quarter."
    }
  ],
  "strengths": [
    "<strength 1>",
    "<strength 2>"
  ],
  "improvements": [
    "<improvement 1>",
    "<improvement 2>"
  ],
  "recommendations": [
    "<recommendation 1>",
    "<recommendation 2>",
    "<recommendation 3>"
  ]
}

Be precise, objective, and specific in your analysis. Base all ratings on observable evidence in the transcript.
"""


def format_transcript(entries: list[TranscriptEntry]) -> str:
    """
    Convert transcript entries to a formatted string for Gemini analysis.
    
    Args:
        entries: List of transcript entries with speaker, text, and timestamp.
    
    Returns:
        Formatted transcript string with timestamps and speaker labels.
    """
    lines = []
    for entry in entries:
        mins = int(entry["timestamp"] // 60)
        secs = int(entry["timestamp"] % 60)
        speaker = entry["speaker"].upper()
        text = entry["text"]
        lines.append(f"[{mins:02d}:{secs:02d}] {speaker}: {text}")
    
    return "\n".join(lines)


def format_duration(seconds: float) -> str:
    """
    Format duration in seconds to human-readable string.
    
    Args:
        seconds: Duration in seconds.
    
    Returns:
        Formatted string (e.g., "15m 30s" or "1h 5m 20s").
    """
    td = timedelta(seconds=int(seconds))
    hours = td.seconds // 3600
    minutes = (td.seconds % 3600) // 60
    secs = td.seconds % 60
    
    parts = []
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    if secs > 0 or not parts:
        parts.append(f"{secs}s")
    
    return " ".join(parts)


class SessionReportError(Exception):
    """
    Raised when session report generation fails.
    """
    pass


class SessionReportGenerator:
    """
    Generates structured performance reports from training session transcripts
    using the Gemini multimodal API.
    """

    def __init__(self, model: str | None = None):
        """
        Initialize the session report generator.

        Args:
            model: Optional model name override. Defaults to PROXIMA_GEMINI_DOC_MODEL.
        """
        self.model = model or get_doc_model_name()

    async def generate_report(
        self,
        transcript: list[TranscriptEntry],
    ) -> SessionMetrics:
        """
        Generate a structured performance report from a session transcript.

        Analyzes the transcript using Gemini and extracts:
        - Session duration
        - Rep confidence metrics and trends
        - On-rep confidence (how the rep appears to the prospect)
        - Prospect sentiment metrics and trends
        - Key moments and coaching recommendations

        Args:
            transcript: List of transcript entries with speaker, text, and timestamp.

        Returns:
            Structured metrics dictionary with all analysis results.

        Raises:
            SessionReportError: On validation failure, Gemini error, or parsing error.
        """
        if not transcript:
            raise SessionReportError("Cannot generate report from empty transcript")

        # Calculate session duration
        session_duration = transcript[-1]["timestamp"] if transcript else 0.0
        session_time_formatted = format_duration(session_duration)

        # Format transcript for Gemini
        formatted_transcript = format_transcript(transcript)
        
        # Build the analysis prompt
        full_prompt = (
            SESSION_ANALYSIS_PROMPT
            + "\n\n---\n\n"
            + "**SESSION TRANSCRIPT**:\n\n"
            + formatted_transcript
        )

        # Call Gemini with a fresh client instance
        client = genai.Client()
        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[types.Part(text=full_prompt)],
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=0.3,  # Lower temperature for more consistent analysis
                    response_mime_type="application/json",
                ),
            )
        except Exception as exc:
            logger.exception("Gemini session analysis failed")
            raise SessionReportError(f"Failed to analyze session: {exc}") from exc
        finally:
            # Clean up client resources
            try:
                await asyncio.to_thread(client.close)
            except Exception:
                pass  # Ignore cleanup errors

        # Extract and parse response
        try:
            response_text = extract_text(response)
        except ExtractionError as exc:
            raise SessionReportError(str(exc)) from exc

        # Parse JSON response
        import json
        try:
            metrics = json.loads(response_text)
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse Gemini response as JSON: %s", response_text)
            raise SessionReportError(
                f"Gemini returned invalid JSON: {exc}"
            ) from exc

        # Validate required fields
        required_fields = [
            "rep_confidence_avg",
            "rep_confidence_trend",
            "on_rep_confidence_avg",
            "on_rep_confidence_trend",
            "prospect_sentiment_avg",
            "prospect_sentiment_trend",
            "key_moments",
            "strengths",
            "improvements",
            "recommendations",
        ]
        
        for field in required_fields:
            if field not in metrics:
                raise SessionReportError(
                    f"Gemini response missing required field: {field}"
                )

        # Add session duration to metrics
        metrics["session_total_time"] = session_time_formatted

        return metrics
