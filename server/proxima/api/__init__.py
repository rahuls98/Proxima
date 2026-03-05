# server/proxima_agent/api/__init__.py

from .context import router as context_router
from .report import router as report_router

__all__ = ["context_router", "report_router"]
