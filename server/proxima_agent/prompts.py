# server/proxima_agent/prompts.py

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

    TRAINING = ()
