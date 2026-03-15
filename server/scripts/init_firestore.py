from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv  # type: ignore
from google.cloud import firestore  # type: ignore


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _load_env() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(dotenv_path=env_path, override=False)


def _client() -> firestore.Client:
    return firestore.Client(
        project=os.getenv("GOOGLE_CLOUD_PROJECT"),
        database=os.getenv("FIRESTORE_DATABASE"),
    )


def main() -> None:
    _load_env()
    client = _client()
    collections = [
        "personas",
        "sessions",
        "reports",
        "metrics",
        "drafts",
        "session_contexts",
    ]

    for name in collections:
        doc_ref = client.collection(name).document("_init")
        doc_ref.set({"initialized_at": _now_iso()})
        print(f"Initialized collection: {name}")


if __name__ == "__main__":
    main()
