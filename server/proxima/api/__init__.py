# server/proxima_agent/api/__init__.py

from .context import router as context_router
from .report import router as report_router
from .teammate import router as teammate_router

__all__ = ["context_router", "report_router", "teammate_router"]
