from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class VoiceMetadata:
    """Stores the specific characteristics of a Gemini Live voice."""

    name: str
    gender: str
    tone: str


class LiveVoiceManager:
    """
    A utility wrapper to manage and rotate through Gemini Live API voices.

    This class is decoupled from specific API transport logic, allowing it
    to be used across different service implementations.
    """

    def __init__(self) -> None:
        self._voices: List[VoiceMetadata] = [
            VoiceMetadata("Enceladus", "Male", "Breathy"),
            VoiceMetadata("Aoede", "Female", "Breezy"),
            VoiceMetadata("Zephyr", "Female", "Bright"),
            VoiceMetadata("Autonoe", "Female", "Bright"),
            VoiceMetadata("Zubenelgenubi", "Male", "Casual"),
            VoiceMetadata("Erinome", "Female", "Clear"),
            VoiceMetadata("Iapetus", "Male", "Clear"),
            VoiceMetadata("Umbriel", "Male", "Easy-going"),
            VoiceMetadata("Callirrhoe", "Female", "Easy-going"),
            VoiceMetadata("Schedar", "Male", "Even"),
            VoiceMetadata("Fenrir", "Male", "Excitable"),
            VoiceMetadata("Kore", "Female", "Firm"),
            VoiceMetadata("Orus", "Male", "Firm"),
            VoiceMetadata("Alnilam", "Male", "Firm"),
            VoiceMetadata("Pulcherrima", "Female", "Forward"),
            VoiceMetadata("Achird", "Male", "Friendly"),
            VoiceMetadata("Vindemiatrix", "Female", "Gentle"),
            VoiceMetadata("Algenib", "Male", "Gravelly"),
            VoiceMetadata("Charon", "Male", "Informative"),
            VoiceMetadata("Rasalgethi", "Male", "Informative"),
            VoiceMetadata("Sadaltager", "Male", "Knowledgeable"),
            VoiceMetadata("Sadachbia", "Male", "Lively"),
            VoiceMetadata("Gacrux", "Female", "Mature"),
            VoiceMetadata("Algieba", "Male", "Smooth"),
            VoiceMetadata("Despina", "Female", "Smooth"),
            VoiceMetadata("Achernar", "Female", "Soft"),
            VoiceMetadata("Laomedeia", "Female", "Upbeat"),
            VoiceMetadata("Puck", "Male", "Upbeat"),
            VoiceMetadata("Sulafat", "Female", "Warm"),
            VoiceMetadata("Leda", "Female", "Youthful"),
        ]

    def get_random_voice(
        self,
        gender_filter: Optional[str] = None,
        tone_filter: Optional[str] = None,
    ) -> VoiceMetadata:
        pool = self._voices
        if gender_filter:
            pool = [
                voice
                for voice in pool
                if voice.gender.lower() == gender_filter.lower()
            ]
        if tone_filter:
            pool = [
                voice
                for voice in pool
                if voice.tone.lower() == tone_filter.lower()
            ]
        if not pool:
            raise ValueError(
                "No voices found for the requested filters."
            )
        return random.choice(pool)

    def get_voice_by_name(self, name: str) -> VoiceMetadata | None:
        target = name.strip().lower()
        for voice in self._voices:
            if voice.name.lower() == target:
                return voice
        return None

    def get_all_by_tone(self, tone: str) -> List[VoiceMetadata]:
        return [voice for voice in self._voices if voice.tone.lower() == tone.lower()]
