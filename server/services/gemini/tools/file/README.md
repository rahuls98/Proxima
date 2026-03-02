# File Tools

Handles file uploads and document summarization in training sessions.

## What It Does

- `FileContextStore` - Stores uploaded files in-memory with UUID keys
- `GeminiDocumentProcessor` - Summarizes documents using Gemini API
- `UploadedFileTools` - Registers tool function for Gemini Live to call

## How to Use

Manually (not typical - usually managed by WebSocket handler):

```python
from services.gemini.tools.file import FileContextStore, GeminiDocumentProcessor

# Store file
store = FileContextStore()
file_id = store.add("document.pdf", "application/pdf", file_bytes)

# Summarize
processor = GeminiDocumentProcessor()
summary = await processor.summarize_document(file_bytes, "application/pdf")
```

## Integration

Tools are auto-registered with `GeminiLiveManager` and available for Gemini to call during sessions.

### FileContextStore (store.py)

In-memory file storage with UUID-based identifiers.

```python
store = FileContextStore()
record = store.add(file_name="report.pdf", mime_type="application/pdf", data=pdf_bytes)
print(record.file_id)  # UUID hex
fetched = store.get(record.file_id)  # or None
```

### GeminiDocumentProcessor (summarizer.py)

Summarize files using Gemini.

```python
processor = GeminiDocumentProcessor()
summary = processor.summarize_document(file_bytes=pdf_bytes, mime_type="application/pdf")
# Returns 3-6 sentence summary
```

### UploadedFileTools (tools.py)

Gemini Live tool for file upload and summarization.

```python
tools_impl = UploadedFileTools(store=store, document_processor=processor)
tools_impl.register(dispatcher)  # Register with ToolDispatcher
declarations = tools_impl.declarations()  # For Gemini config

file_id = tools_impl.add_uploaded_file(file_name="doc.txt", mime_type="text/plain", data=text_bytes)
summary_dict = await tools_impl.summarize_uploaded_file(file_id)
# Returns {file_id, file_name, mime_type, summary}
```

## Data Classes

### UploadedFileRecord

```python
@dataclass
class UploadedFileRecord:
    file_id: str              # UUID hex
    file_name: str
    mime_type: str
    data: bytes
    summary: str | None = None
    created_at: datetime | None = None
```

## Tool Declaration

The `summarize_uploaded_file` tool is automatically declared with:

- **Name**: `summarize_uploaded_file`
- **Param**: `file_id` (string) - The uploaded file identifier
- **Returns**: JSON dict with `{file_id, file_name, mime_type, summary}`

## Detailed Documentation

See [services/gemini/tools/README.md](../README.md) for file data flow and integration details.
