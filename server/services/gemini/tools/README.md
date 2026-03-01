# Gemini Tools Service

Tool implementations for Gemini Live sessions, including file upload handling and summarization.

## Overview

Provides reusable tools that extend Gemini Live agent capabilities. Currently implements uploaded file storage and summarization. Tools are registered with the Gemini Live dispatcher and invoked by the model during conversations.

## Structure

```
tools/
├── __init__.py        # Exports UploadedFileTools
├── file/
│   ├── store.py       # FileContextStore - in-memory file storage
│   ├── summarizer.py  # GeminiDocumentProcessor - summarization
│   ├── tools.py       # UploadedFileTools - tool implementation
│   └── __init__.py    # Exports all file tools
└── README.md
```

## File Tool Module

### store.py - FileContextStore

In-memory session-scoped file store.

- `add(file_name, mime_type, data)` → `UploadedFileRecord`
    - Generates UUID hex `file_id`
    - Stores record with timestamps
    - Returns record with assigned file_id
- `get(file_id)` → `UploadedFileRecord | None`

### summarizer.py - GeminiDocumentProcessor

Gemini-powered document summarization for uploaded files.

- `summarize_document(file_bytes, mime_type)` → `str`
    - Streams file bytes to Gemini with a summarization prompt
    - Returns 3-6 sentence summary
    - Raises `RuntimeError` if no text returned

### tools.py - UploadedFileTools

Gemini Live tool implementation for file upload and summarization.

- `register(dispatcher)`: Register `summarize_uploaded_file` tool with dispatcher
- `declarations()` → `list[types.Tool]`: Tool declarations for Gemini config
- `add_uploaded_file(file_name, mime_type, data)` → `UploadedFileRecord`: Store a file
- `async summarize_uploaded_file(file_id)` → `dict[str, str]`: Tool invocation

## Tool: summarize_uploaded_file

**Input**: `file_id` (string) - UUID identifier returned when file is uploaded

**Output**: JSON dict with:

- `file_id`
- `file_name`
- `mime_type`
- `summary` - 3-6 sentence summary

## Data Flow: File Upload → Summarization

```
WebSocket handler receives {type: "file_upload"}
  ↓
manager.store_uploaded_file()
  → FileContextStore.add()
  → returns file_id
  ↓
handler sends {type: "file_uploaded", fileId, ...} to client
  ↓
Gemini emits tool_call: summarize_uploaded_file(file_id)
  ↓
ToolDispatcher.execute()
  ↓
UploadedFileTools.summarize_uploaded_file(file_id)
  → asyncio.to_thread(GeminiDocumentProcessor.summarize_document())
  → cache summary on FileContextStore record
  → return {file_id, file_name, mime_type, summary}
```

## Environment

Uses model from `services.gemini.config.get_doc_model_name()` — set `PROXIMA_GEMINI_DOC_MODEL`.

## Notes

- Storage is temporary (process memory), not persistent by default.
- Session-scoped: cleared when Gemini Live session closes.
- Files are never written to disk.
- More tools can be added here and registered in the live manager.
