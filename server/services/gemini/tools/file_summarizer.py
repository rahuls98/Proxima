# server/services/gemini/tools/document_processor.py

from __future__ import annotations

from google import genai
from google.genai import types  # type: ignore

from services.gemini.model_settings import get_doc_model_name


SUMMARY_PROMPT = (
    "Summarize this uploaded file for a live conversation agent. "
    "Focus on the file's purpose, major points, and any key entities. "
    "Keep it concise (3-6 sentences)."
)


class GeminiDocumentProcessor:
    """Handles Gemini document processing for uploaded files."""

    def __init__(self, model: str | None = None):
        self.client = genai.Client()
        self.model = model or get_doc_model_name()

    def summarize_document(self, *, file_bytes: bytes, mime_type: str) -> str:
        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part(text=SUMMARY_PROMPT),
                        types.Part(
                            inline_data=types.Blob(
                                data=file_bytes,
                                mime_type=mime_type,
                            )
                        ),
                    ],
                )
            ],
        )

        text = getattr(response, "text", None)
        if text:
            return text.strip()

        candidates = getattr(response, "candidates", None) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            if not content:
                continue
            for part in getattr(content, "parts", []) or []:
                part_text = getattr(part, "text", None)
                if part_text:
                    return part_text.strip()

        raise RuntimeError("Gemini document processing returned no summary text")
