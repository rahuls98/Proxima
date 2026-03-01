# server/proxima_agent/config/prompts.py

from enum import Enum


class ProximaAgentPrompt(str, Enum):
    """
    Enumeration of system prompts for each Proxima agent mode.

    Inherits from str to allow direct use as a string value wherever
    a plain string system prompt is expected (e.g. Gemini Live config),
    without needing to access .value explicitly.

    Usage:
        ProximaAgentPrompt.TRAINING
        str(ProximaAgentPrompt.TRAINING)  # same result
    """

    TRAINING = (
        "You are a conversational training assistant. "
        "Help the user learn and understand topics through dialogue. "
        "Ask clarifying questions, provide explanations, and adapt your teaching style to the user's needs."
    )
