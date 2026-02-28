from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict
from uuid import uuid4


@dataclass
class UploadedFileRecord:
    file_id: str
    file_name: str
    mime_type: str
    data: bytes
    summary: str | None = None
    created_at: datetime | None = None


class FileContextStore:
    """In-memory store for uploaded files and extracted context."""

    def __init__(self):
        self._records: Dict[str, UploadedFileRecord] = {}

    def add(self, *, file_name: str, mime_type: str, data: bytes) -> UploadedFileRecord:
        file_id = uuid4().hex
        record = UploadedFileRecord(
            file_id=file_id,
            file_name=file_name,
            mime_type=mime_type,
            data=data,
            created_at=datetime.now(timezone.utc),
        )
        self._records[file_id] = record
        return record

    def get(self, file_id: str) -> UploadedFileRecord | None:
        return self._records.get(file_id)

