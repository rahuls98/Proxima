# server/proxima_agent/config.py

from typing import Literal

from google.genai import types # type: ignore

from .prompts import ProximaAgentPrompt

ProximaAgentMode = Literal["training"]

DEFAULT_MODE: ProximaAgentMode = "training"
DEFAULT_VOICE_NAME: str = "Schedar"

SYSTEM_PROMPTS: dict[ProximaAgentMode, ProximaAgentPrompt] = {
    "training": ProximaAgentPrompt.TRAINING,
}


def resolve_mode(raw_mode: str | None) -> ProximaAgentMode:
    if not raw_mode:
        return DEFAULT_MODE
    normalized = raw_mode.strip().lower()
    return normalized if normalized in SYSTEM_PROMPTS else DEFAULT_MODE


def build_live_config(
    mode: ProximaAgentMode = DEFAULT_MODE,
    voice_name: str = DEFAULT_VOICE_NAME,
    tools: list[types.Tool] | None = None,
) -> types.LiveConnectConfig:
    """Build Gemini Live config for a given Proxima agent mode and voice settings.
    
    Args:
        mode: Agent mode (e.g., "training")
        voice_name: Specific voice name (e.g., "Schedar", "Zephyr", "Kore")
        tools: Optional list of tools for the agent
    """
    kwargs: dict[str, object] = {
        "response_modalities": ["AUDIO"],
        "system_instruction": SYSTEM_PROMPTS[mode],
        "speech_config": types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=voice_name,
                )
            ),
            language_code="en-US",
        ),
        "input_audio_transcription": types.AudioTranscriptionConfig(),
        "output_audio_transcription": types.AudioTranscriptionConfig(),
        "realtime_input_config": types.RealtimeInputConfig(
            automatic_activity_detection=types.AutomaticActivityDetection(disabled=False),
            activity_handling=types.ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
            turn_coverage=types.TurnCoverage.TURN_INCLUDES_ONLY_ACTIVITY,
        ),
    }

    if tools:
        kwargs["tools"] = tools

    return types.LiveConnectConfig(**kwargs)
