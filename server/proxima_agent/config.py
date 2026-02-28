from typing import Literal

from google.genai import types

ProximaAgentMode = Literal["training"]

DEFAULT_MODE: ProximaAgentMode = "training"

SYSTEM_PROMPTS: dict[ProximaAgentMode, str] = {
    "training": (
        "You are Proxima Agent in training mode. "
        "Be concise, clear, and conversational in voice responses."
    ),
}


def resolve_mode(raw_mode: str | None) -> ProximaAgentMode:
    if not raw_mode:
        return DEFAULT_MODE
    normalized = raw_mode.strip().lower()
    return normalized if normalized in SYSTEM_PROMPTS else DEFAULT_MODE


def build_live_config(mode: ProximaAgentMode = DEFAULT_MODE) -> types.LiveConnectConfig:
    """Build Gemini Live config for a given Proxima agent mode."""
    return types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=SYSTEM_PROMPTS[mode],
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        realtime_input_config=types.RealtimeInputConfig(
            automatic_activity_detection=types.AutomaticActivityDetection(disabled=False),
            activity_handling=types.ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
            turn_coverage=types.TurnCoverage.TURN_INCLUDES_ONLY_ACTIVITY,
        ),
    )
