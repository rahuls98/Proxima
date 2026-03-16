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
from .teammate_personas import (
    TeammateArchetype,
    TeammateConfig,
    generate_teammate_config,
    get_archetype_description,
    ARCHETYPE_DEFINITIONS,
)
from .teammate_prompts import build_teammate_system_prompt

__all__ = [
    "ProximaAgentMode",
    "ProximaAgentPrompt",
    "DEFAULT_MODE",
    "DEFAULT_VOICE_NAME",
    "SYSTEM_PROMPTS",
    "build_live_config",
    "resolve_mode",
    "TeammateArchetype",
    "TeammateConfig",
    "generate_teammate_config",
    "get_archetype_description",
    "ARCHETYPE_DEFINITIONS",
    "build_teammate_system_prompt",
]
