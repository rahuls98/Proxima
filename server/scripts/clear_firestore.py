from __future__ import annotations

import argparse
import os
from pathlib import Path

from dotenv import load_dotenv  # type: ignore
from google.cloud import firestore  # type: ignore


PROTECTED_COLLECTIONS = {"app_settings"}


def _load_env() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(dotenv_path=env_path, override=False)


def _client() -> firestore.Client:
    return firestore.Client(
        project=os.getenv("GOOGLE_CLOUD_PROJECT"),
        database=os.getenv("FIRESTORE_DATABASE"),
    )


def _delete_document_recursive(doc_ref: firestore.DocumentReference) -> int:
    deleted = 0

    for subcollection in doc_ref.collections():
        deleted += _delete_collection_recursive(subcollection)

    doc_ref.delete()
    return deleted + 1


def _delete_collection_recursive(col_ref: firestore.CollectionReference) -> int:
    deleted = 0
    for doc in col_ref.stream():
        deleted += _delete_document_recursive(doc.reference)
    return deleted


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Delete documents (and nested subcollection documents) from Firestore. "
            "This script does not call any collection-delete operation."
        )
    )
    parser.add_argument(
        "--collections",
        nargs="+",
        default=None,
        help=(
            "Optional list of top-level collections whose documents should be deleted. "
            "If omitted, documents are deleted from all top-level collections (except protected ones)."
        ),
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip confirmation prompt.",
    )
    return parser.parse_args()


def _confirm() -> bool:
    answer = input(
        "This will permanently delete Firestore data for configured collections. Type 'delete' to continue: "
    ).strip()
    return answer == "delete"


def main() -> None:
    _load_env()
    args = _parse_args()

    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    database = os.getenv("FIRESTORE_DATABASE")

    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is not set.")
    if not database:
        raise RuntimeError("FIRESTORE_DATABASE is not set.")

    client = _client()

    if args.collections:
        collection_names = args.collections
    else:
        collection_names = [
            col.id
            for col in client.collections()
            if col.id not in PROTECTED_COLLECTIONS
        ]

    if not collection_names:
        print("No collections found. Nothing to delete.")
        return

    print(f"Project: {project}")
    print(f"Database: {database}")
    print("Collections to process (documents only):")
    for name in collection_names:
        print(f"- {name}")

    if not args.yes and not _confirm():
        print("Aborted.")
        return

    total_deleted = 0
    for name in collection_names:
        deleted = _delete_collection_recursive(client.collection(name))
        total_deleted += deleted
        print(f"Cleared {name}: {deleted} document(s) deleted")

    print(f"Done. Total deleted documents: {total_deleted}")


if __name__ == "__main__":
    main()
