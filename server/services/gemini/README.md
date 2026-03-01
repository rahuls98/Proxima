# Gemini Services

Core service layer providing Gemini API integration for live streaming, multimodal context building, and tool orchestration.

## Structure

```
services/gemini/
├── config.py            # Environment-based model name resolvers
├── live/               # Gemini Live streaming
│   ├── manager.py      # Session connection and event streaming
│   ├── dispatcher.py   # Tool function registry and execution
│   └── README.md
├── multimodal/         # Non-live multimodal Gemini calls
│   ├── client.py       # Content generation facade
│   ├── content_builder.py  # Part assembly and validation
│   ├── response_parser.py  # Safe text extraction
│   └── README.md
└── tools/              # Tool implementations for sessions
    ├── file/          # Uploaded file tools
    │   ├── store.py
    │   ├── summarizer.py
    │   ├── tools.py
    │   └── __init__.py
    └── README.md
```

## Modules

### config.py

Pure leaf module with environment-based model name resolvers.

- `get_live_model_name()`: Returns `PROXIMA_GEMINI_LIVE_MODEL` or raises
- `get_doc_model_name()`: Returns `PROXIMA_GEMINI_DOC_MODEL` or raises

### live/

Gemini Live API integration for real-time bidirectional streaming.

- **manager.py**: `GeminiLiveManager` - session lifecycle, audio/video streaming, text turns, event iteration, and file upload orchestration
- **dispatcher.py**: `ToolDispatcher` - tool registry and sync/async execution

### multimodal/

Non-live Gemini content generation for context building and summarization.

- **client.py**: `GeminiMultimodalClient` - request/response multimodal generation
- **content_builder.py**: Part assembly with MIME validation and size limits
- **response_parser.py**: Safe text extraction from responses

### tools/file/

Uploaded file storage and summarization within a session.

- **store.py**: `FileContextStore` - in-memory UUID-keyed file store
- **summarizer.py**: `GeminiDocumentProcessor` - document summarization via Gemini
- **tools.py**: `UploadedFileTools` - Gemini Live tool function implementation

See individual README files for detailed module documentation.
