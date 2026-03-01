# services/gemini/multimodal/response_parser.py

from google.genai import types # type: ignore


class ExtractionError(RuntimeError):
    """
    Raised when no usable text can be extracted from a Gemini response.
    Prevents the caller from silently receiving an empty or None result.
    """
    pass


def extract_text(response: object) -> str:
    """
    Safely extracts the first available text string from a Gemini
    generate_content response object.

    Tries response.text first (the fast path for simple responses),
    then walks candidates -> content -> parts for streamed or structured
    responses. Raises ExtractionError if no text is found in any path.

    Args:
        response: The raw response object from genai.Client.models.generate_content().

    Returns:
        Stripped text content from the model response.

    Raises:
        ExtractionError: If no text could be extracted.
    """
    # Fast path: simple .text attribute (works for most non-streamed responses)
    text = getattr(response, "text", None)
    if text:
        return text.strip()

    # Slow path: walk candidates -> content -> parts
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        if not content:
            continue
        for part in getattr(content, "parts", []) or []:
            part_text = getattr(part, "text", None)
            if part_text:
                return part_text.strip()

    raise ExtractionError(
        "Gemini returned no text content. "
        "The model may have refused the request or returned only non-text parts."
    )
