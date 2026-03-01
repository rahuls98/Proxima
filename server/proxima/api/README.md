# Proxima API Module

REST endpoints for session preparation and context building.

## Overview

Provides HTTP endpoints for pre-session prospect context synthesis. Accepts arbitrary text and file context items, synthesizes a unified persona, and returns a summary for use before a training session.

## Files

- **context.py**: `POST /context/persona`
    - Accepts `multipart/form-data` with parallel arrays of text and file items
    - Validates MIME types and file sizes (max 20MB per file)
    - Calls `GeminiMultimodalClient.build_unified_context()`
    - Returns JSON with unified context summary and item counts

## Endpoint

### POST /context/persona

**Content-Type**: `multipart/form-data`

**Parameters**:

| Field                   | Type              | Description              |
| ----------------------- | ----------------- | ------------------------ |
| `context_text_keys[]`   | string (repeated) | Key for each text item   |
| `context_text_values[]` | string (repeated) | Value for each text item |
| `context_file_keys[]`   | string (repeated) | Key for each file item   |
| `context_files[]`       | file (repeated)   | File for each file item  |

**Supported file MIME types**: `text/*`, `image/*`, `application/pdf`, `audio/*`, `video/*`

**Response**:

```json
{
    "unified_context": "...",
    "text_items_count": 2,
    "file_items_count": 1
}
```

**Example**:

```bash
curl -F "context_text_keys[]=prospect_name" \
     -F "context_text_values[]=John Doe" \
     -F "context_file_keys[]=resume" \
     -F "context_files[]=@resume.pdf" \
     http://localhost:8000/context/persona
```

## Implementation

Uses lazy singleton `GeminiMultimodalClient` (instantiated on first request) to:

1. Validate and build `types.Part` list from inputs
2. Call Gemini with multimodal content
3. Extract and return text summary

See [Prospect Context Build](../README.md#prospect-context-build-rest) in the main server README.
