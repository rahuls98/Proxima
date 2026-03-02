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

# Prompt template for generating persona system instruction from session context JSON
PERSONA_CONTEXT_GENERATOR_SYSTEM_ROLE = (
    "You are a Persona Context Generator for an AI sales training platform.\n\n"
    "Your job is to convert structured session configuration JSON into a natural-language "
    "persona system instruction that will be used as the persistent system prompt for a "
    "live conversational AI.\n\n"
    "The output must:\n"
    "- Sound natural and cohesive (not robotic)\n"
    "- Not expose raw JSON structure\n"
    "- Translate numeric sliders into behavioral tendencies\n"
    "- Convert dropdown selections into personality traits\n"
    "- Incorporate voice guidance subtly\n"
    "- Clearly define objection behavior and escalation rules\n"
    "- Enforce staying in character\n"
    "- Be between 250–450 words\n"
    "- Be formatted in clean paragraphs and bullet sections\n\n"
    "Do NOT explain your reasoning.\n"
    "Do NOT restate the input JSON.\n"
    "Only output the final persona system instruction."
)

PERSONA_CONTEXT_GENERATOR_USER_PROMPT = (
    "Convert the following session context JSON into a persona system instruction "
    "for a live AI prospect simulation.\n\n"
    "SESSION CONTEXT:\n\n"
    "{session_context_json}"
)

# Slider interpretation guidelines
SLIDER_INTERPRETATION_GUIDE = """
SLIDER INTERPRETATION RULES:

Skepticism Level (0–1):
- 0.0–0.3 → Cooperative and open-minded
- 0.4–0.6 → Neutral but questioning
- 0.7–1.0 → Actively skeptical and escalatory

Trust Level at Start (0–1):
- 0.0–0.3 → Guarded, short answers
- 0.4–0.6 → Conversational
- 0.7–1.0 → Open and collaborative

Urgency Level (slider_1_5):
- 1–2 → Low urgency, slow pacing, defer decisions
- 3 → Moderate urgency
- 4–5 → High urgency, push for clarity and speed

Energy Level (slider_1_5):
- 1–2 → Low energy, calm, reserved voice
- 3 → Moderate energy
- 4–5 → High energy, more expressive tone

Emotional Variability (slider_1_5):
- 1–2 → Stable, consistent emotional tone
- 3 → Moderate emotional responses
- 4–5 → Highly variable, emotional shifts

Script Adherence Strictness (slider_1_5):
- 1–2 → Flexible, can deviate from script
- 3 → Balanced script following
- 4–5 → Strict adherence to provided script
"""


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

    async def generate_persona_instruction(
        self,
        session_context: dict,
    ) -> str:
        """
        Converts filled session context JSON into a natural-language persona
        system instruction for live Gemini conversational AI.

        Takes structured session configuration (prospects, KPIs, objections,
        personality, voice settings, etc.) and produces a clean, stable system
        prompt that the Live API will use throughout the session.

        Args:
            session_context: Dictionary containing all filled form fields from
                the Session Context Builder, including demographic info, KPIs,
                objections, personality traits, sliders, voice config, etc.

        Returns:
            Natural language persona system instruction (250-450 words).

        Raises:
            MultimodalContextError: On Gemini API failure or empty response.
        """
        import json

        try:
            # Convert session context to JSON string with slider interpretation guide
            context_json_str = json.dumps(session_context, indent=2)
            
            # Build the full prompt with system role + user message + slider guide
            # Note: system_instruction is included in the user message for compatibility
            full_prompt = (
                PERSONA_CONTEXT_GENERATOR_SYSTEM_ROLE
                + "\n\n---\n\n"
                + PERSONA_CONTEXT_GENERATOR_USER_PROMPT.format(
                    session_context_json=context_json_str
                )
                + "\n\n---\n\n"
                + SLIDER_INTERPRETATION_GUIDE
            )

            # Call Gemini with the combined prompt
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[types.Part(text=full_prompt)],
                    )
                ],
            )
        except Exception as exc:
            logger.exception("Gemini persona instruction generation failed")
            raise MultimodalContextError(
                f"Failed to generate persona instruction: {exc}"
            ) from exc

        try:
            return extract_text(response)
        except ExtractionError as exc:
            raise MultimodalContextError(str(exc)) from exc

