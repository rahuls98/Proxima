# Gemini Tools

This package contains reusable Gemini-facing tools used by the live agent.

## Files

- `uploaded_file_tools.py`
  - Registers Gemini function declarations.
  - Exposes `summarize_uploaded_file` for model tool-calling.
  - Coordinates storage lookup + document processing.
- `file_context_store.py`
  - In-memory session-local storage for uploaded files and extracted summaries.
- `document_processor.py`
  - Uses Gemini non-live generation (configured by `PROXIMA_GEMINI_DOC_MODEL`) for document/image/PDF summarization.

## Current Tool: `summarize_uploaded_file`

Input:

- `file_id` (string): ID returned when a file is uploaded via websocket.

Output:

- `file_id`
- `file_name`
- `mime_type`
- `summary`

If `file_id` is missing/invalid, the tool returns an error payload.

## Runtime Flow

1. Websocket handler receives `file_upload`.
2. File bytes are stored in `FileContextStore`.
3. Live model is prompted to call `summarize_uploaded_file`.
4. `ToolDispatcher` executes the registered tool function.
5. Tool uses `GeminiDocumentProcessor` to extract a concise purpose/summary.
6. Tool response is sent back to Gemini Live session as `FunctionResponse`.

## Notes

- Storage is temporary (process memory), not persistent by default.
- This package is framework-agnostic: it does not depend on FastAPI handlers directly.
- Add new reusable tools here and register them in the live manager.
- Model names are sourced from environment variables:
  - `PROXIMA_GEMINI_LIVE_MODEL`
  - `PROXIMA_GEMINI_DOC_MODEL`
