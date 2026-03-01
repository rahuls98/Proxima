# services/gemini/multimodal/part_builder.py

from dataclasses import dataclass
from google.genai import types # type: ignore


MAX_FILE_BYTES = 20 * 1024 * 1024

SUPPORTED_MIME_PREFIXES = (
    "text/",
    "image/",
    "application/pdf",
    "audio/",
    "video/",
)


@dataclass
class TextContextItem:
    """
    A named text context item for a multimodal prompt.

    Attributes:
        key: Human-readable identifier (e.g. prospect_linkedin).
        value: Plain text content.
    """

    key: str
    value: str


@dataclass
class FileContextItem:
    """
    A named file context item for a multimodal prompt.

    Attributes:
        key: Human-readable identifier (e.g. product_battlecard).
        data: Raw file bytes.
        mime_type: MIME type of the file.
        filename: Original filename, used for labeling.
    """

    key: str
    data: bytes
    mime_type: str
    filename: str = ""


class PartBuildError(ValueError):
    """
    Raised when a context item fails validation before any Gemini API call.
    Signals MIME type or file size violations to the caller.
    """

    pass


def _validate_file_item(key, mime, data):
    """
    Validates a file item against Gemini inline content constraints.

    Checks MIME type support and enforces the maximum inline file size.

    Args:
        key: Context key used in error messages.
        mime: MIME type string to validate.
        data: Raw file bytes to size-check.

    Raises:
        PartBuildError: On unsupported MIME type or oversized file.
    """
    supported = any(mime.startswith(prefix) for prefix in SUPPORTED_MIME_PREFIXES)
    if not supported:
        raise PartBuildError(
            "Unsupported MIME type for context key '"
            + key
            + "': "
            + mime
            + ". Supported prefixes: "
            + ", ".join(SUPPORTED_MIME_PREFIXES)
        )

    size = len(data)
    if size > MAX_FILE_BYTES:
        limit_mb = str(MAX_FILE_BYTES // (1024 * 1024))
        raise PartBuildError(
            "File for context key '"
            + key
            + "' exceeds the maximum inline size of "
            + limit_mb
            + "MB (got "
            + str(size)
            + " bytes)."
        )


def build_parts(instruction, text_items, file_items):
    """
    Assembles an ordered list of Gemini Parts from an instruction prompt
    and heterogeneous context items (text and files).

    The instruction is always prepended as the first part. Text items are
    wrapped in labeled tags so the model can associate content with its key.
    File items are validated, labeled, and appended as inline blobs.

    Args:
        instruction: Framing prompt prepended to all context.
        text_items: List of TextContextItem instances.
        file_items: List of FileContextItem instances.

    Returns:
        Ordered list of types.Part objects ready for types.Content.

    Raises:
        PartBuildError: If any file item fails MIME or size validation.
        ValueError: If no usable context items exist beyond the instruction.
    """
    parts = []

    parts.append(types.Part(text=instruction))

    newline = chr(10)

    for item in text_items:
        key = item.key.strip() if item.key else "unnamed_text_context"
        value = item.value.strip() if item.value else ""
        if not value:
            continue
        tag = "[CONTEXT key=" + key + "]" + newline + value + newline + "[/CONTEXT]"
        parts.append(types.Part(text=tag))

    for item in file_items:
        raw_key = item.key or ""
        key = raw_key.strip() if raw_key.strip() else (item.filename or "unnamed_file_context")

        raw_mime = item.mime_type or ""
        mime = raw_mime.strip() if raw_mime.strip() else "application/octet-stream"

        data = item.data
        if not data:
            continue

        _validate_file_item(key, mime, data)

        label = (
            "[FILE_CONTEXT key="
            + key
            + " mime="
            + mime
            + " filename="
            + (item.filename or "")
            + "]"
        )
        parts.append(types.Part(text=label))
        parts.append(types.Part(inline_data=types.Blob(data=data, mime_type=mime)))

    if len(parts) <= 1:
        raise ValueError("No context items provided.")

    return parts