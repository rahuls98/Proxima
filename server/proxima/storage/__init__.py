from __future__ import annotations

import os

from proxima.storage.dummy import DummyStorage
from proxima.storage.firestore import FirestoreStorage

_storage: DummyStorage | FirestoreStorage | None = None


def get_storage() -> DummyStorage | FirestoreStorage:
    global _storage
    if _storage is None:
        if os.getenv("FIRESTORE_DATABASE"):
            _storage = FirestoreStorage()
        else:
            _storage = DummyStorage()
    return _storage
