# server/proxima_agent/api/context.py

from typing import List, Dict, Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile  # type: ignore
from fastapi.responses import Response  # type: ignore
from pydantic import BaseModel  # type: ignore

from services.gemini.multimodal import (
    FileContextItem,
    GeminiMultimodalClient,
    MultimodalContextError,
    TextContextItem,
)
from services.gemini.imagen import GeminiImagenClient, ImagenError

router = APIRouter(prefix="/context", tags=["context"])

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

    try:
        instruction = await get_client().generate_persona_instruction(
            session_context=req.session_context
        )
    except MultimodalContextError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return PersonaInstructionResponse(
        persona_instruction=instruction,
        source_fields_count=len(req.session_context),
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

