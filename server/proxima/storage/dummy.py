from __future__ import annotations

import copy
import uuid
from datetime import datetime, timezone
from typing import Any

from proxima.dummy_data import (
    DUMMY_METRICS_AGGREGATE,
    DUMMY_PERSONAS,
    DUMMY_SESSION_REPORT,
    DUMMY_TRAINING_HISTORY,
    DUMMY_TRAINING_METRICS,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class DummyStorage:
    def __init__(self) -> None:
        self._personas = {p["id"]: copy.deepcopy(p) for p in DUMMY_PERSONAS}
        self._sessions = {s["id"]: copy.deepcopy(s) for s in DUMMY_TRAINING_HISTORY}
        self._reports = {
            DUMMY_SESSION_REPORT["session_overview"]["session_id"]: copy.deepcopy(
                DUMMY_SESSION_REPORT
            )
        }
        self._metrics = {m["session_id"]: copy.deepcopy(m) for m in DUMMY_TRAINING_METRICS}
        self._aggregate = copy.deepcopy(DUMMY_METRICS_AGGREGATE)
        self._drafts: dict[str, dict[str, Any]] = {}
        self._draft_order: list[str] = []
        self._session_contexts: dict[str, dict[str, Any]] = {}
        self._session_transcripts: dict[str, dict[str, Any]] = {}
        self._ai_feature_settings: dict[str, Any] = {
            "id": "global",
            "avatarGenerationEnabled": True,
            "updated_at": _now_iso(),
        }

    # Personas
    def list_personas(self) -> list[dict[str, Any]]:
        return list(self._personas.values())

    def get_persona(self, persona_id: str) -> dict[str, Any] | None:
        return self._personas.get(persona_id)

    def create_persona(self, payload: dict[str, Any]) -> dict[str, Any]:
        persona_id = payload.get("id") or f"persona_{uuid.uuid4().hex[:12]}"
        created_at = payload.get("createdAt") or _now_iso()
        persona = {**payload, "id": persona_id, "createdAt": created_at}
        self._personas[persona_id] = persona
        return persona

    def update_persona(self, persona_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        existing = self._personas.get(persona_id)
        if not existing:
            return None
        updated = {**existing, **payload, "id": persona_id}
        self._personas[persona_id] = updated
        return updated

    def delete_persona(self, persona_id: str) -> bool:
        return self._personas.pop(persona_id, None) is not None

    # Sessions
    def list_sessions(self) -> list[dict[str, Any]]:
        return list(self._sessions.values())

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        return self._sessions.get(session_id)

    def create_session(self, payload: dict[str, Any]) -> dict[str, Any]:
        session_id = payload.get("id") or f"sess_{uuid.uuid4().hex[:10]}"
        session = {**payload, "id": session_id}
        self._sessions[session_id] = session
        return session

    def delete_session(self, session_id: str) -> bool:
        return self._sessions.pop(session_id, None) is not None

    # Reports
    def list_report_ids(self) -> list[str]:
        return list(self._reports.keys())

    def get_report(self, session_id: str) -> dict[str, Any] | None:
        return self._reports.get(session_id)

    def save_report(self, session_id: str, payload: dict[str, Any]) -> None:
        self._reports[session_id] = payload

    def delete_report(self, session_id: str) -> bool:
        return self._reports.pop(session_id, None) is not None

    def clear_reports(self) -> None:
        self._reports = {}

    # Metrics
    def list_metrics(self) -> list[dict[str, Any]]:
        return list(self._metrics.values())

    def get_metric(self, session_id: str) -> dict[str, Any] | None:
        return self._metrics.get(session_id)

    def save_metric(self, payload: dict[str, Any]) -> None:
        session_id = payload.get("session_id")
        if session_id:
            self._metrics[session_id] = payload

    def delete_metric(self, session_id: str) -> bool:
        return self._metrics.pop(session_id, None) is not None

    def clear_metrics(self) -> None:
        self._metrics = {}

    def get_aggregate(self) -> dict[str, Any]:
        return copy.deepcopy(self._aggregate)

    def list_metrics_in_range(
        self, start_iso: str | None, end_iso: str | None
    ) -> list[dict[str, Any]]:
        if not start_iso and not end_iso:
            return self.list_metrics()

        def _in_range(entry: dict[str, Any]) -> bool:
            timestamp = entry.get("timestamp")
            if not timestamp:
                return False
            if start_iso and timestamp < start_iso:
                return False
            if end_iso and timestamp > end_iso:
                return False
            return True

        return [m for m in self.list_metrics() if _in_range(m)]

    # Drafts
    def create_draft(self, payload: dict[str, Any]) -> dict[str, Any]:
        draft_id = payload.get("id") or f"draft_{uuid.uuid4().hex[:12]}"
        now = _now_iso()
        draft = {
            **payload,
            "id": draft_id,
            "created_at": payload.get("created_at") or now,
            "updated_at": now,
        }
        self._drafts[draft_id] = draft
        self._draft_order = [draft_id] + [
            entry for entry in self._draft_order if entry != draft_id
        ]
        return draft

    def get_latest_draft(self) -> dict[str, Any] | None:
        if not self._draft_order:
            return None
        latest_id = self._draft_order[0]
        return self._drafts.get(latest_id)

    def update_draft(self, draft_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        existing = self._drafts.get(draft_id)
        if not existing:
            return None
        updated = {**existing, **payload, "id": draft_id, "updated_at": _now_iso()}
        self._drafts[draft_id] = updated
        self._draft_order = [draft_id] + [
            entry for entry in self._draft_order if entry != draft_id
        ]
        return updated

    def delete_draft(self, draft_id: str) -> bool:
        removed = self._drafts.pop(draft_id, None) is not None
        if removed:
            self._draft_order = [entry for entry in self._draft_order if entry != draft_id]
        return removed

    # Session Contexts
    def set_session_context(
        self, session_id: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        now = _now_iso()
        data = {
            **payload,
            "session_id": session_id,
            "created_at": payload.get("created_at") or now,
            "updated_at": now,
        }
        self._session_contexts[session_id] = data
        return data

    def get_session_context(self, session_id: str) -> dict[str, Any] | None:
        return self._session_contexts.get(session_id)

    # Session Transcripts
    def set_session_transcript(self, session_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        record = {**payload, "session_id": session_id}
        self._session_transcripts[session_id] = record
        return record

    def get_session_transcript(self, session_id: str) -> dict[str, Any] | None:
        return self._session_transcripts.get(session_id)

    # Global Settings
    def get_ai_feature_settings(self) -> dict[str, Any]:
        return copy.deepcopy(self._ai_feature_settings)

    def set_ai_feature_settings(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._ai_feature_settings = {
            **self._ai_feature_settings,
            "avatarGenerationEnabled": bool(
                payload.get("avatarGenerationEnabled", True)
            ),
            "updated_at": _now_iso(),
        }
        return copy.deepcopy(self._ai_feature_settings)
