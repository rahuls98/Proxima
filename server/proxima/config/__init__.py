# server/proxima_agent/config/__init__.py

from .config import (
    DEFAULT_MODE,
    DEFAULT_VOICE_NAME,
    SYSTEM_PROMPTS,
    ProximaAgentMode,
    build_live_config,
    resolve_mode,
)
from .prompts import ProximaAgentPrompt

__all__ = [
    "ProximaAgentMode",
    "ProximaAgentPrompt",
    "DEFAULT_MODE",
    "DEFAULT_VOICE_NAME",
    "SYSTEM_PROMPTS",
    "build_live_config",
    "resolve_mode",
]
