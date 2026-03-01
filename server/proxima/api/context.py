# server/proxima_agent/api/context.py

from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile  # type: ignore

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
