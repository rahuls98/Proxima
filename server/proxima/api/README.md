# API Module

REST endpoint for pre-session preparation: converts filled session context form into a natural-language persona instruction.

## What It Does

**POST /context/persona-instruction** - Takes structured session context (from form) and generates a natural-language system instruction for Gemini Live.

## How to Use

**Request:**

```json
{
    "session_context": {
        "prospect_info": { "first_name": "John", "company": "Acme" },
        "conversation_style": { "formality_level": 0.7 },
        "...more form fields...": "..."
    }
}
```

**Response (200 OK):**

```json
{
    "persona_instruction": "You are a sales training AI...",
    "source_fields_count": 42
}
```

**Errors:**

- 400: Missing or empty session_context
- 422: Gemini API error (quota, invalid input, model unavailable)
- 500: Internal server error

## Typical Flow

1. User fills out session context form in UI
2. Client submits to POST /context/persona-instruction
3. Server calls Gemini multimodal API with system role (persona generator) and form data
4. Gemini returns natural-language instruction (250-450 words)
5. Client stores in localStorage
6. Client connects to WebSocket (with default system prompt)
7. Client sends `{type: "set_system_instruction", instruction: "..."}` message
8. Server reconnects Gemini session with generated persona
9. Agent initializes with custom personality

## Implementation

The endpoint uses `GeminiMultimodalClient` to make a single multimodal call with predefined system role and user prompt that interprets form fields and generates coherent persona instruction.

- Synthesizes 250-450 word natural-language instruction
- Interprets slider values (0-1 scales, 1-5 scales) as behavioral descriptions
- Avoids exposing raw JSON to final instruction
- Idempotent: Same input → Same output
- Includes voice configuration guidance (if configured)
- Ready for immediate use in Gemini Live sessions

**Integration with WebSocket**:

After receiving the generated instruction, the client:

1. Stores instruction in `localStorage`
2. Starts training session
3. Sends `set_system_instruction` message via WebSocket to apply dynamic persona update
4. Agent begins session with synthesized persona

### POST /context/persona (Legacy)

Synthesize a unified prospect context from arbitrary text and file inputs.

**Deprecated**: Use `/context/persona-instruction` instead for better UX.

**Content-Type**: `multipart/form-data`

**Parameters**:

| Field                   | Type              | Required | Description         |
| ----------------------- | ----------------- | -------- | ------------------- |
| `context_text_keys[]`   | string (repeated) | No       | Key for text item   |
| `context_text_values[]` | string (repeated) | No       | Value for text item |
| `context_file_keys[]`   | string (repeated) | No       | Key for file item   |
| `context_files[]`       | file (repeated)   | No       | File for file item  |

**Validation**:

- `context_text_keys[]` and `context_text_values[]` must be same length
- `context_file_keys[]` and `context_files[]` must be same length
- Supported MIME types: `text/*`, `image/*`, `application/pdf`, `audio/*`, `video/*`
- Max file size: 20 MB per file

**Response** (200 OK):

```json
{
    "unified_context": "Prospect John Doe is a VP Sales at Acme Corp with 10 years experience...",
    "text_items_count": 2,
    "file_items_count": 1
}
```

**Errors**:

| Status | Description                                 |
| ------ | ------------------------------------------- |
| 400    | Array length mismatch or missing context    |
| 422    | Gemini API error or file validation failure |
| 500    | Internal server error                       |

**Example**:

```bash
curl -X POST http://localhost:8000/context/persona \
  -F "context_text_keys[]=prospect_name" \
  -F "context_text_values[]=John Doe" \
  -F "context_text_keys[]=company" \
  -F "context_text_values[]=Acme Corp" \
  -F "context_file_keys[]=resume" \
  -F "context_files[]=@resume.pdf"
```

## Implementation Details

### Session Context Input Format

The `session_context` object submitted to `/context/persona-instruction` has the following structure:

```
{
  // Prospect Information
  "prospect_info": {
    "first_name": string,
    "last_name": string,
    "company": string,
    "job_title": string,
    "department": string,
    "seniority_level": string
  },

  // Conversation Preferences
  "conversation_style": {
    "formality_level": float (0-1),      // 0=casual, 1=formal
    "humor_level": float (0-1),         // 0=serious, 1=very humorous
    "pace": int (1-5),                  // 1=slow, 5=fast
    "depth": int (1-5)                  // 1=surface, 5=deep
  },

  // Objection Handling
  "objection_handling": {
    "skepticism_level": float (0-1),    // Expected skepticism
    "patience_level": float (0-1),      // How patient to be
    "aggressiveness": int (1-5)         // 1=soft-sell, 5=hard-sell
  },

  // Communication Preferences
  "communication": {
    "prefers_data_driven": boolean,
    "prefers_stories": boolean,
    "prefers_visuals": boolean,
    "attention_span": int (1-5)         // 1=short, 5=long
  },

  // Additional Context
  "focus_areas": [string],              // Topics to emphasize
  "avoid_topics": [string],             // Topics to avoid
  "background": string                  // Free-form background info
}
```

### Persona Generation Process

1. **Extract Context**: Receives filled session context from client
2. **Validate**: Checks that context is non-empty
3. **Synthesize**: Calls `GeminiMultimodalClient.generate_persona_instruction()`
4. **Interpret**: Slider values converted to behavioral descriptions
5. **Format**: 250-450 word natural-language system prompt
6. **Return**: Instruction ready for Gemini Live API

### Client-Side Integration

```typescript
// 1. Generate persona
const resp = await generatePersonaInstruction(sessionContext);
const personaInstruction = resp.persona_instruction;

// 2. Store in localStorage
localStorage.setItem("proxima_persona_instruction", personaInstruction);
localStorage.setItem("proxima_session_context", JSON.stringify(sessionContext));

// 3. Start WebSocket with instruction
const service = new ProximaAgentService({
    systemInstruction: personaInstruction,
    onEvent: (event) => {
        /* handle events */
    },
});
await service.connect();

// 4. Send dynamic update (optional, for mid-session changes)
await service.sendMessage({
    type: "set_system_instruction",
    instruction: updatedInstruction,
});
```

## Error Handling

### Common Errors

| Symptom                   | Cause                 | Solution                                     |
| ------------------------- | --------------------- | -------------------------------------------- |
| 422 Unprocessable Entity  | Gemini API failed     | Check API key, quota, rate limits            |
| 400 Bad Request           | Array length mismatch | Ensure text_keys and text_values same length |
| 413 Payload Too Large     | File > 20 MB          | Split large files or increase server limits  |
| 500 Internal Server Error | Unexpected exception  | Check server logs, retry request             |

### Debugging

Enable debug logging:

```python
import logging
logging.getLogger("proxima_agent_api").setLevel(logging.DEBUG)
```

Check server logs for:

- Gemini API call details
- Context validation warnings
- File processing steps

## Performance

| Operation              | Latency     | Notes                              |
| ---------------------- | ----------- | ---------------------------------- |
| Persona generation     | 2-5 seconds | Includes Gemini API roundtrip      |
| Context synthesis      | 1-3 seconds | Includes file reading + Gemini API |
| Request validation     | <100 ms     | File size checks, array validation |
| Response serialization | <100 ms     | JSON encoding                      |

## Testing

### Unit Tests

```python
from proxima.api.context import router
from fastapi.testclient import TestClient

def test_persona_instruction_generation():
    client = TestClient(app)
    response = client.post(
        "/context/persona-instruction",
        json={
            "session_context": {
                "prospect_info": {"first_name": "John"},
                "conversation_style": {"formality_level": 0.7}
            }
        }
    )
    assert response.status_code == 200
    assert "persona_instruction" in response.json()
    assert len(response.json()["persona_instruction"]) > 100
```

### Integration Test

1. Fill form on client
2. Submit to `/context/persona-instruction`
3. Verify non-empty persona instruction returned
4. Store in localStorage
5. Start WebSocket session
6. Verify agent uses persona

## Dependencies

- **Gemini Multimodal Client**: `services.gemini.multimodal.GeminiMultimodalClient`
- **FastAPI**: Request/response handling, validation
- **Pydantic**: Request/response schema validation

## Future Enhancements

- [ ] Persona instruction caching (same input → cached output)
- [ ] Batch generation (multiple contexts at once)
- [ ] Persona templates (predefined instruction patterns)
- [ ] A/B testing framework (measure persona effectiveness)
- [ ] Persona validation endpoint (test persona before session)
- [ ] Streaming persona generation progress
      http://localhost:8000/context/persona

```

## Implementation

Uses lazy singleton `GeminiMultimodalClient` (instantiated on first request) to:

1. Validate and build `types.Part` list from inputs
2. Call Gemini with multimodal content
3. Extract and return text summary

See [Prospect Context Build](../README.md#prospect-context-build-rest) in the main server README.
```
