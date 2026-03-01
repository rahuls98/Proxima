# Gemini Multimodal Service

Non-live request/response integration with Gemini for context building and content generation.

## Overview

Provides a facade for multimodal Gemini content generation. Validates inputs, assembles typed parts, calls Gemini, and safely extracts text responses. Used for prospect context synthesis before training sessions.

## Modules

### client.py - GeminiMultimodalClient

Main facade for multimodal generation.

- `build_unified_context(text_items, file_items)`: Synthesizes a unified prospect persona from text and file inputs
    - Validates input lengths match
    - Builds `types.Part` list via `content_builder`
    - Calls Gemini via `asyncio.to_thread()` (non-blocking)
    - Extracts and returns text via `response_parser`
    - Wraps all errors as `MultimodalContextError`

### content_builder.py

Part assembly and validation.

- `build_parts(text_items, file_items)`: Validates and assembles `types.Part` list
    - Enforces MIME type support (text, image, PDF, audio, video)
    - Enforces 20MB inline size limit per file
    - Raises `PartBuildError` on violations
    - Raises `ValueError` if no content provided

### response_parser.py

Safe text extraction from Gemini responses.

- `extract_text(response)`: Extracts text from any response shape
    - Tries `response.text` first
    - Falls back to `candidates -> content -> parts` tree walk
    - Raises `ExtractionError` if no text found

## Error Handling

- `MultimodalContextError`: Public API error wrapping all internal failures
- `PartBuildError`: Input validation failure
- `ExtractionError`: Response parsing failure

## Usage

```python
from services.gemini.multimodal import GeminiMultimodalClient, TextContextItem, FileContextItem

client = GeminiMultimodalClient()

text_items = [
    TextContextItem(key="prospect_name", value="John Doe"),
    TextContextItem(key="industry", value="SaaS"),
]

file_items = [
    FileContextItem(key="resume", data=resume_bytes, mime_type="application/pdf", filename="resume.pdf"),
]

try:
    unified = await client.build_unified_context(text_items, file_items)
    print(f"Persona: {unified}")
except MultimodalContextError as e:
    print(f"Error: {e}")
```

## Data Flow

```
build_unified_context(text_items, file_items)
  ↓
content_builder.build_parts()
  → validate MIME types
  → validate file sizes (max 20MB)
  → assemble types.Part[]
  ↓
asyncio.to_thread(genai.generate_content(parts))
  ↓
response_parser.extract_text()
  → try response.text
  → else walk candidates tree
  ↓
return unified_context: str
```

## Environment

Uses model from `services.gemini.config.get_doc_model_name()` — set `PROXIMA_GEMINI_DOC_MODEL`.
