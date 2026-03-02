# Gemini Services

Service layer for Gemini API integration: live streaming, multimodal context generation, and tool orchestration.

## Modules

**live/** - Real-time bidirectional streaming with Gemini Live API

- `GeminiLiveManager` - Session lifecycle, audio/video/text streaming, event normalization
- `ToolDispatcher` - Tool registry and execution (for file summarization, etc.)

**multimodal/** - Non-live Gemini calls for content generation

- `GeminiMultimodalClient` - Request/response generation (persona instructions, summaries)
- Content validation and response parsing

**tools/file/** - Uploaded file handling

- `FileContextStore` - In-memory file storage
- `GeminiDocumentProcessor` - Document summarization via Gemini
- `UploadedFileTools` - Tool function for Gemini Live integration

## Usage

Use `GeminiLiveManager` for live sessions and `GeminiMultimodalClient` for pre/post-session content generation.
