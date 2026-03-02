# Gemini Multimodal Service

Non-live Gemini API calls for content generation: persona instruction synthesis and file summarization.

## What It Does

`GeminiMultimodalClient` makes request/response calls to Gemini (not streaming):

- Generate persona instructions from session context
- Summarize uploaded documents
- Built on content parts (text, images, files) with MIME validation

## Key Methods

**`await client.generate_content(system_role, user_prompt, parts=[])`**

- Calls Gemini API with system role and user prompt
- Returns response text
- Raises on API errors (quota, invalid input, etc.)

## How to Use

```python
from services.gemini.multimodal import GeminiMultimodalClient

client = GeminiMultimodalClient()

# Generate persona instruction
response_text = await client.generate_content(
    system_role="You are a persona context generator...",
    user_prompt="Given this form data, generate a system instruction...",
    parts=[{"type": "text", "text": structured_context}]
)
```

## Internal Modules

**content_builder.py** - Assembles and validates content parts (text, images, files) with MIME type checking

**response_parser.py** - Safely extracts text from Gemini responses
↓
response_parser.extract_text()
→ try response.text
→ else walk candidates tree
↓
return unified_context: str

```

## Environment

Uses model from `services.gemini.config.get_doc_model_name()` — set `PROXIMA_GEMINI_DOC_MODEL`.
```
