# server/services/gemini/tools/uploaded_file_tools.py

from __future__ import annotations

import asyncio
from typing import Any

from google.genai import types  # type: ignore

from .document_processor import GeminiDocumentProcessor
from .file_context_store import FileContextStore, UploadedFileRecord


TOOL_NAME_SUMMARIZE_UPLOADED_FILE = "summarize_uploaded_file"


class UploadedFileTools:
    """Reusable toolset for uploaded-file context extraction and access."""

    def __init__(
        self,
        store: FileContextStore | None = None,
        document_processor: GeminiDocumentProcessor | None = None,
    ):
        self.store = store or FileContextStore()
        self.document_processor = document_processor or GeminiDocumentProcessor()

    def register(self, dispatcher: Any):
        dispatcher.register(TOOL_NAME_SUMMARIZE_UPLOADED_FILE, self.summarize_uploaded_file)

    def declarations(self) -> list[types.Tool]:
        return [
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name=TOOL_NAME_SUMMARIZE_UPLOADED_FILE,
                        description=(
                            "Summarize an uploaded file and return its purpose and key points."
                        ),
                        parameters={
                            "type": "object",
                            "properties": {
                                "file_id": {
                                    "type": "string",
                                    "description": "The uploaded file identifier.",
                                }
                            },
                            "required": ["file_id"],
                        },
                    )
                ]
            )
        ]

    def add_uploaded_file(
        self,
        *,
        file_name: str,
        mime_type: str,
        data: bytes,
    ) -> UploadedFileRecord:
        return self.store.add(file_name=file_name, mime_type=mime_type, data=data)

    async def summarize_uploaded_file(self, file_id: str) -> dict[str, str]:
        record = self.store.get(file_id)
        if not record:
            return {
                "error": f"No uploaded file found for file_id={file_id}",
            }

        if not record.summary:
            record.summary = await asyncio.to_thread(
                self.document_processor.summarize_document,
                file_bytes=record.data,
                mime_type=record.mime_type,
            )

        return {
            "file_id": record.file_id,
            "file_name": record.file_name,
            "mime_type": record.mime_type,
            "summary": record.summary,
        }

