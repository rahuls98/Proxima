# server/proxima_agent/api/context.py

from typing import List, Dict, Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile  # type: ignore
from pydantic import BaseModel  # type: ignore

from services.gemini.multimodal import (
    FileContextItem,
    GeminiMultimodalClient,
    MultimodalContextError,
    TextContextItem,
)

router = APIRouter(prefix="/context", tags=["context"])

# Lazy singleton — instantiated on first request so .env is already loaded.
_client: GeminiMultimodalClient | None = None


def get_client() -> GeminiMultimodalClient:
    global _client
    if _client is None:
        _client = GeminiMultimodalClient()
    return _client


class SessionContextInput(BaseModel):
    """Request body for persona instruction generation."""
    session_context: Dict[str, Any]


class PersonaInstructionResponse(BaseModel):
    """Response body for persona instruction generation."""
    persona_instruction: str
    source_fields_count: int
    prospect_name: str


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


def _generate_prospect_name(seed: str) -> str:
    first_names = [
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
    if not seed:
        return "Alex Rivera"
    index = sum(ord(ch) for ch in seed)
    return f"{first_names[index % len(first_names)]} {last_names[index % len(last_names)]}"


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

    context_name = req.session_context.get("prospect_name")
    if isinstance(context_name, str) and context_name.strip():
        prospect_name = context_name.strip()
    else:
        seed = "|".join(
            str(req.session_context.get(key) or "")
            for key in ["job_title", "company_name", "industry", "department"]
        )
        prospect_name = _generate_prospect_name(seed)

    # Dummy response aligned with client UI placeholders.
    return PersonaInstructionResponse(
        persona_instruction=f"Demo persona instruction for {prospect_name}.",
        source_fields_count=len(req.session_context),
        prospect_name=prospect_name,
    )
