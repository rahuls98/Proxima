# server/proxima_agent/api/context.py

import random
from typing import Any, Dict, List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile  # type: ignore
from fastapi.responses import Response  # type: ignore
from pydantic import BaseModel  # type: ignore

from services.gemini.live.voice_manager import LiveVoiceManager
from services.gemini.multimodal import (
    FileContextItem,
    GeminiMultimodalClient,
    MultimodalContextError,
    TextContextItem,
)
from services.gemini.imagen import GeminiImagenClient, ImagenError

router = APIRouter(prefix="/context", tags=["context"])

REQUIRED_SESSION_CONTEXT_FIELDS = [
    "job_title",
    "company_name",
    "location",
    "industry",
    "discussion_stage",
    "discussion_intent",
    "objection_archetype",
    "skepticism_level",
    "negotiation_toughness",
    "decision_style",
    "trust_level_at_start",
]

# Lazy singleton — instantiated on first request so .env is already loaded.
_client: GeminiMultimodalClient | None = None
_imagen_client: GeminiImagenClient | None = None


def get_client() -> GeminiMultimodalClient:
    global _client
    if _client is None:
        _client = GeminiMultimodalClient()
    return _client


def get_imagen_client() -> GeminiImagenClient:
    global _imagen_client
    if _imagen_client is None:
        _imagen_client = GeminiImagenClient()
    return _imagen_client


class SessionContextInput(BaseModel):
    """Request body for persona instruction generation."""
    session_context: Dict[str, Any]


class PersonaInstructionResponse(BaseModel):
    """Response body for persona instruction generation."""
    persona_instruction: str
    source_fields_count: int
    prospect_name: str
    voice_name: str
    voice_gender: str
    voice_tone: str


@router.post("/persona", summary="Build unified persona context from arbitrary inputs")
async def build_persona_context(
    context_text_keys: List[str] = Form(default=[]),
    context_text_values: List[str] = Form(default=[]),
    context_file_keys: List[str] = Form(default=[]),
    context_files: List[UploadFile] = File(default=[]),
):
    if len(context_text_keys) != len(context_text_values):
        raise HTTPException(
            status_code=400,
            detail="context_text_keys and context_text_values must be the same length.",
        )
    if len(context_file_keys) != len(context_files):
        raise HTTPException(
            status_code=400,
            detail="context_file_keys and context_files must be the same length.",
        )

    text_items = [
        TextContextItem(key=k, value=v)
        for k, v in zip(context_text_keys, context_text_values)
    ]

    file_items = []
    for key, upload in zip(context_file_keys, context_files):
        data = await upload.read()
        file_items.append(
            FileContextItem(
                key=key,
                data=data,
                mime_type=upload.content_type or "application/octet-stream",
                filename=upload.filename or "",
            )
        )

    try:
        unified = await get_client().build_unified_context(
            text_items=text_items,
            file_items=file_items,
        )
    except MultimodalContextError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return {
        "unified_context": unified,
        "text_items_count": len(text_items),
        "file_items_count": len(file_items),
    }


def _generate_prospect_name(seed: str, gender: str | None) -> str:
    rng = random.SystemRandom()
    male_first_names = [
        "Ethan",
        "Liam",
        "Noah",
        "Mason",
        "Logan",
        "Caleb",
        "Owen",
        "Henry",
        "Grant",
        "Julian",
    ]
    female_first_names = [
        "Ava",
        "Mia",
        "Nora",
        "Lila",
        "Aria",
        "Chloe",
        "Zoe",
        "Sienna",
        "Naomi",
        "Elena",
    ]
    neutral_first_names = [
        "Avery",
        "Jordan",
        "Casey",
        "Morgan",
        "Riley",
        "Taylor",
        "Alex",
        "Cameron",
        "Drew",
        "Parker",
    ]
    last_names = [
        "Reed",
        "Hayes",
        "Blake",
        "Quinn",
        "Sawyer",
        "Sullivan",
        "Brooks",
        "Hayden",
        "Wells",
        "Monroe",
    ]

    if gender and gender.lower() == "male":
        first_names = male_first_names
    elif gender and gender.lower() == "female":
        first_names = female_first_names
    else:
        first_names = neutral_first_names

    if not seed:
        return f"{rng.choice(first_names)} {rng.choice(last_names)}"

    index = sum(ord(ch) for ch in seed)
    last_name = last_names[index % len(last_names)]
    first_name = rng.choice(first_names)
    return f"{first_name} {last_name}"


def _build_persona_instruction(
    session_context: Dict[str, Any], name: str, tone: str | None
) -> str:
    def _line(label: str, key: str) -> str | None:
        value = session_context.get(key)
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        return f"- {label}: {text}"

    lines = [
        f"Prospect name: {name}",
        "You are the prospect in this role-play.",
        "After your initial greeting, introduce yourself by name.",
        "Stay in character and use the persona details below:",
    ]

    archetype_map = {
        "skeptic": "The Skeptic",
        "visionary": "The Visionary",
        "guardian": "The Guardian",
    }
    archetype_value = str(session_context.get("objection_archetype") or "").strip()
    archetype_label = archetype_map.get(archetype_value, archetype_value)

    details = [
        _line("Job title", "job_title"),
        _line("Company", "company_name"),
        _line("Location", "location"),
        _line("Industry", "industry"),
        _line("Rep profile and typical call goals", "rep_call_context"),
        _line("Discussion stage", "discussion_stage"),
        _line("Current discussion intent", "discussion_intent"),
        f"- Persona archetype: {archetype_label}" if archetype_label else None,
        _line("Decision style", "decision_style"),
        _line("Skepticism level (1-5)", "skepticism_level"),
        _line("Negotiation toughness (1-5)", "negotiation_toughness"),
        _line("Initial trust score (1-5)", "trust_level_at_start"),
        _line("Tone", "voice_tone") if tone else None,
    ]

    for detail in details:
        if detail:
            lines.append(detail)

    return "\n".join(lines)


@router.post(
    "/persona-instruction",
    summary="Generate persona system instruction from filled session context",
    response_model=PersonaInstructionResponse,
)
async def generate_persona_instruction(req: SessionContextInput):
    """
    Takes filled session context JSON and generates a natural-language
    persona system instruction for the Gemini Live API.

    The instruction is stable, self-contained, and ready to be used as the
    system prompt throughout the training session.

    Args:
        req: SessionContextInput containing the complete filled form data.

    Returns:
        PersonaInstructionResponse with the generated persona instruction
        and metadata about the input.

    Raises:
        HTTPException 422: On Gemini API failure or invalid input.
    """
    if not req.session_context:
        raise HTTPException(
            status_code=400,
            detail="session_context cannot be empty.",
        )

    missing_required = [
        field
        for field in REQUIRED_SESSION_CONTEXT_FIELDS
        if not str(req.session_context.get(field) or "").strip()
    ]
    if missing_required:
        raise HTTPException(
            status_code=422,
            detail=(
                "Missing required session_context fields: "
                + ", ".join(missing_required)
            ),
        )

    context_name = req.session_context.get("prospect_name")
    voice_manager = LiveVoiceManager()
    selected_voice = voice_manager.get_random_voice()
    voice_name = selected_voice.name
    voice_gender = selected_voice.gender
    voice_tone = selected_voice.tone
    if isinstance(context_name, str) and context_name.strip():
        prospect_name = context_name.strip()
    else:
        seed = "|".join(
            str(req.session_context.get(key) or "")
            for key in ["job_title", "company_name", "industry", "location"]
        )
        prospect_name = _generate_prospect_name(seed, voice_gender)

    # Dummy response aligned with client UI placeholders.
    return PersonaInstructionResponse(
        persona_instruction=_build_persona_instruction(
            req.session_context, prospect_name, voice_tone
        ),
        source_fields_count=len(req.session_context),
        prospect_name=prospect_name,
        voice_name=voice_name,
        voice_gender=voice_gender,
        voice_tone=voice_tone,
    )


@router.post(
    "/persona-image",
    summary="Generate persona image from session context",
    response_class=Response,
)
async def generate_persona_image(req: SessionContextInput):
    """
    Generates a professional portrait image for the AI persona based on
    session context using Google's Imagen API.

    The image is generated based on the persona's role, industry, and
    demographic information to create a realistic professional headshot
    for display in the meeting room participant tile.

    Args:
        req: SessionContextInput containing the complete session context data.

    Returns:
        PNG image data (binary response)

    Raises:
        HTTPException 400: If session_context is empty
        HTTPException 422: On Imagen API failure
    """
    if not req.session_context:
        raise HTTPException(
            status_code=400,
            detail="session_context cannot be empty.",
        )

    try:
        image_bytes = await get_imagen_client().generate_persona_image(
            session_context=req.session_context
        )
    except ImagenError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Return the image as PNG
    return Response(
        content=image_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": "inline; filename=persona.png"
        }
    )
