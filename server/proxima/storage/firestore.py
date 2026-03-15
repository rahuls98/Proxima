from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Iterable

from google.cloud import firestore  # type: ignore


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _project_id() -> str | None:
    return os.getenv("GOOGLE_CLOUD_PROJECT")


def _database_id() -> str | None:
    return os.getenv("FIRESTORE_DATABASE")


def _client() -> firestore.Client:
    return firestore.Client(project=_project_id(), database=_database_id())


class FirestoreStorage:
    def __init__(self) -> None:
        self.client = _client()
        self.personas = self.client.collection("personas")
        self.sessions = self.client.collection("sessions")
        self.reports = self.client.collection("reports")
        self.metrics = self.client.collection("metrics")
        self.drafts = self.client.collection("drafts")

    # Personas
    def list_personas(self) -> list[dict[str, Any]]:
        docs = self.personas.stream()
        return [self._doc_to_dict(doc) for doc in docs if not self._is_system_doc(doc)]

    def get_persona(self, persona_id: str) -> dict[str, Any] | None:
        doc = self.personas.document(persona_id).get()
        return self._doc_to_dict(doc) if doc.exists else None

    def create_persona(self, payload: dict[str, Any]) -> dict[str, Any]:
        persona_id = payload.get("id") or self.personas.document().id
        created_at = payload.get("createdAt") or _now_iso()
        data = {**payload, "id": persona_id, "createdAt": created_at}
        self.personas.document(persona_id).set(data)
        return data

    def update_persona(
        self, persona_id: str, payload: dict[str, Any]
    ) -> dict[str, Any] | None:
        doc_ref = self.personas.document(persona_id)
        if not doc_ref.get().exists:
            return None
        data = {**payload, "id": persona_id}
        doc_ref.set(data, merge=True)
        return self._doc_to_dict(doc_ref.get())

    def delete_persona(self, persona_id: str) -> bool:
        doc_ref = self.personas.document(persona_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        return True

    # Sessions
    def list_sessions(self) -> list[dict[str, Any]]:
        docs = self.sessions.order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
        return [self._doc_to_dict(doc) for doc in docs if not self._is_system_doc(doc)]

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        doc = self.sessions.document(session_id).get()
        return self._doc_to_dict(doc) if doc.exists else None

    def create_session(self, payload: dict[str, Any]) -> dict[str, Any]:
        session_id = payload.get("id") or self.sessions.document().id
        data = {**payload, "id": session_id}
        self.sessions.document(session_id).set(data)
        return data

    def delete_session(self, session_id: str) -> bool:
        doc_ref = self.sessions.document(session_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        return True

    # Reports
    def list_report_ids(self) -> list[str]:
        docs = self.reports.stream()
        return [doc.id for doc in docs if not self._is_system_doc(doc)]

    def get_report(self, session_id: str) -> dict[str, Any] | None:
        doc = self.reports.document(session_id).get()
        return self._doc_to_dict(doc) if doc.exists else None

    def save_report(self, session_id: str, payload: dict[str, Any]) -> None:
        data = {**payload}
        if "session_overview" in data:
            data["session_overview"]["session_id"] = session_id
        self.reports.document(session_id).set(data)

    def delete_report(self, session_id: str) -> bool:
        doc_ref = self.reports.document(session_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        return True

    def clear_reports(self) -> None:
        for doc in self.reports.stream():
            doc.reference.delete()

    # Metrics
    def list_metrics(self) -> list[dict[str, Any]]:
        docs = self.metrics.order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
        return [self._doc_to_dict(doc) for doc in docs if not self._is_system_doc(doc)]

    def get_metric(self, session_id: str) -> dict[str, Any] | None:
        doc = self.metrics.document(session_id).get()
        return self._doc_to_dict(doc) if doc.exists else None

    def save_metric(self, payload: dict[str, Any]) -> None:
        session_id = payload.get("session_id")
        if not session_id:
            return
        self.metrics.document(session_id).set(payload)

    def delete_metric(self, session_id: str) -> bool:
        doc_ref = self.metrics.document(session_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        return True

    def clear_metrics(self) -> None:
        for doc in self.metrics.stream():
            doc.reference.delete()

    def list_metrics_in_range(
        self, start_iso: str | None, end_iso: str | None
    ) -> list[dict[str, Any]]:
        query = self.metrics
        if start_iso:
            query = query.where("timestamp", ">=", start_iso)
        if end_iso:
            query = query.where("timestamp", "<=", end_iso)
        query = query.order_by("timestamp", direction=firestore.Query.DESCENDING)
        return [self._doc_to_dict(doc) for doc in query.stream() if not self._is_system_doc(doc)]

    def get_aggregate(self) -> dict[str, Any]:
        metrics = self.list_metrics()
        if not metrics:
            return {
                "total_sessions": 0,
                "avg_overall_score": 0,
                "avg_discovery_score": 0,
                "avg_objection_score": 0,
                "avg_value_comm_score": 0,
                "avg_conversation_control": 0,
                "avg_emotional_intelligence": 0,
                "avg_duration_seconds": 0,
                "avg_questions_asked": 0,
                "avg_talk_ratio_rep": 0,
                "performance_distribution": {
                    "excellent": 0,
                    "good": 0,
                    "needs_improvement": 0,
                },
                "most_common_strengths": [],
                "most_common_feedback": [],
            }

        def _get(metric: dict[str, Any], key: str, default: float = 0) -> float:
            value = metric.get(key)
            return float(value) if value is not None else default

        total = len(metrics)
        sums = {
            "overall_score": 0.0,
            "discovery_score": 0.0,
            "objection_handling_score": 0.0,
            "value_communication_score": 0.0,
            "conversation_control_score": 0.0,
            "emotional_intelligence_score": 0.0,
            "duration_seconds": 0.0,
            "questions_asked": 0.0,
            "talk_ratio_rep": 0.0,
        }
        distribution = {"excellent": 0, "good": 0, "needs_improvement": 0}

        for metric in metrics:
            overall = _get(metric, "overall_score")
            if overall >= 80:
                distribution["excellent"] += 1
            elif overall >= 60:
                distribution["good"] += 1
            else:
                distribution["needs_improvement"] += 1

            for key in sums:
                sums[key] += _get(metric, key)

        avg = {
            "total_sessions": total,
            "avg_overall_score": round(sums["overall_score"] / total),
            "avg_discovery_score": round(sums["discovery_score"] / total),
            "avg_objection_score": round(
                sums["objection_handling_score"] / total
            ),
            "avg_value_comm_score": round(
                sums["value_communication_score"] / total
            ),
            "avg_conversation_control": round(
                sums["conversation_control_score"] / total
            ),
            "avg_emotional_intelligence": round(
                sums["emotional_intelligence_score"] / total
            ),
            "avg_duration_seconds": round(sums["duration_seconds"] / total),
            "avg_questions_asked": round(sums["questions_asked"] / total),
            "avg_talk_ratio_rep": round(
                (sums["talk_ratio_rep"] / total) * 100
            )
            / 100,
            "performance_distribution": distribution,
            "most_common_strengths": self._most_common(
                metrics, "strengths", limit=5
            ),
            "most_common_feedback": self._most_common(
                metrics, "top_feedback", limit=5
            ),
        }

        return avg

    # Drafts
    def create_draft(self, payload: dict[str, Any]) -> dict[str, Any]:
        draft_id = payload.get("id") or self.drafts.document().id
        now = _now_iso()
        data = {
            **payload,
            "id": draft_id,
            "created_at": payload.get("created_at") or now,
            "updated_at": now,
        }
        self.drafts.document(draft_id).set(data)
        return data

    def get_latest_draft(self) -> dict[str, Any] | None:
        docs = self.drafts.order_by("updated_at", direction=firestore.Query.DESCENDING).stream()
        for doc in docs:
            if self._is_system_doc(doc):
                continue
            return self._doc_to_dict(doc)
        return None

    def update_draft(self, draft_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        doc_ref = self.drafts.document(draft_id)
        if not doc_ref.get().exists:
            return None
        data = {**payload, "id": draft_id, "updated_at": _now_iso()}
        doc_ref.set(data, merge=True)
        return self._doc_to_dict(doc_ref.get())

    def delete_draft(self, draft_id: str) -> bool:
        doc_ref = self.drafts.document(draft_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        return True

    @staticmethod
    def _doc_to_dict(doc: firestore.DocumentSnapshot | None) -> dict[str, Any]:
        if not doc:
            return {}
        data = doc.to_dict() or {}
        data.setdefault("id", doc.id)
        return data

    @staticmethod
    def _is_system_doc(doc: firestore.DocumentSnapshot) -> bool:
        return doc.id in {"_init"}

    @staticmethod
    def _most_common(
        metrics: Iterable[dict[str, Any]], key: str, limit: int = 5
    ) -> list[str]:
        counts: dict[str, int] = {}
        for metric in metrics:
            items = metric.get(key) or []
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, str):
                    continue
                counts[item] = counts.get(item, 0) + 1
        return [
            item
            for item, _ in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
        ][:limit]
