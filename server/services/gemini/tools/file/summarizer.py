# server/services/gemini/tools/file/file_summarizer.py

from __future__ import annotations

from google import genai
from google.genai import types  # type: ignore

from services.gemini.config import get_doc_model_name
from services.gemini.multimodal.response_parser import ExtractionError, extract_text


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

        try:
            return extract_text(response)
        except ExtractionError as exc:
            raise RuntimeError("Gemini document processing returned no summary text") from exc
