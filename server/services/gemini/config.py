# server/services/gemini/config.py

from __future__ import annotations

import os


LIVE_MODEL_ENV_VAR = "PROXIMA_GEMINI_LIVE_MODEL"
DOC_MODEL_ENV_VAR = "PROXIMA_GEMINI_DOC_MODEL"


def _required_env(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_live_model_name() -> str:
    return _required_env(LIVE_MODEL_ENV_VAR)


def get_doc_model_name() -> str:
    return _required_env(DOC_MODEL_ENV_VAR)

