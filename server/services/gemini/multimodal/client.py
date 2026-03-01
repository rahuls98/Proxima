# services/gemini/multimodal/client.py

import asyncio
import logging

from google import genai
from google.genai import types # type: ignore

from services.gemini.config import get_doc_model_name
from .content_builder import (
    TextContextItem,
    FileContextItem,
    PartBuildError,
    build_parts,
)
from .response_parser import ExtractionError, extract_text

logger = logging.getLogger("gemini_multimodal")

# Prompt instructing Gemini how to unify heterogeneous context items
# into a single structured persona model for training sessions.
UNIFIED_CONTEXT_PROMPT = (
    "You are Proxima's training context builder.\n"
    "You will receive multiple labeled context items about a prospect, account, "
    "product, and sales methodology. Each item has a key (what kind of context it is) "
    "and a value (text content or the contents of a file).\n\n"
    "Your task:\n"
    "1) Read and integrate all items.\n"
    "2) Build a single unified context summary that can be used to drive a live "
    "sales rehearsal simulation with this prospect.\n"
    "3) Focus on: persona (role, seniority, KPIs, pains), account context, "
    "relevant product angles, and any constraints (budget, timing, incumbent tools).\n"
    "4) Output a concise but information-dense summary in 6-12 bullet points.\n"
    "5) Do NOT restate raw content — synthesize and extract signal.\n"
)


class MultimodalContextError(Exception):
    """
    Public-facing error raised by GeminiMultimodalClient.
    Wraps internal PartBuildError, ExtractionError, and unexpected failures
    into a single exception type so the API route only handles one error surface.
    """
    pass


class GeminiMultimodalClient:
    """
    Facade for multimodal (non-live) Gemini content generation.

    Handles part assembly, inline file validation, Gemini API interaction,
    and response extraction. Callers receive either a result string or a
    MultimodalContextError — no Gemini internals leak upward.
    """

    def __init__(self, model: str | None = None):
        """
        Initializes the Gemini client and resolves the model name.

        Args:
            model: Optional model name override. Defaults to PROXIMA_GEMINI_DOC_MODEL.
        """
        self.client = genai.Client()
        self.model = model or get_doc_model_name()

    async def build_unified_context(
        self,
        text_items: list[TextContextItem],
        file_items: list[FileContextItem],
        instruction: str = UNIFIED_CONTEXT_PROMPT,
    ) -> str:
        """
        Accepts heterogeneous context items (text and files) and returns a
        single unified persona context summary from Gemini.

        Validates all inputs before calling Gemini. Wraps all internal errors
        into MultimodalContextError so the caller has a clean error surface.

        Args:
            text_items: Named plain-text context items.
            file_items: Named file context items (PDF, images, etc.).
            instruction: System-level framing prompt. Defaults to the persona builder prompt.

        Returns:
            Unified context string synthesized by Gemini.

        Raises:
            MultimodalContextError: On validation failure, Gemini error, or empty response.
        """
        try:
            parts = build_parts(
                instruction=instruction,
                text_items=text_items,
                file_items=file_items,
            )
        except (PartBuildError, ValueError) as exc:
            raise MultimodalContextError(str(exc)) from exc

        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model,
                contents=[types.Content(role="user", parts=parts)],
            )
        except Exception as exc:
            logger.exception("Gemini generate_content call failed")
            raise MultimodalContextError(
                f"Gemini API call failed: {exc}"
            ) from exc

        try:
            return extract_text(response)
        except ExtractionError as exc:
            raise MultimodalContextError(str(exc)) from exc
