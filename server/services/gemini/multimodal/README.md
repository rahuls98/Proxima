# Gemini Multimodal Service

Non-live Gemini API calls for content generation: persona instruction synthesis, file summarization, and session report generation.

## What It Does

This module provides request/response calls to Gemini (not streaming) for:

- **GeminiMultimodalClient**: Generate persona instructions from session context
- **SessionReportGenerator**: Analyze training session transcripts and generate performance reports
- Built on content parts (text, images, files) with MIME validation

## Key Classes

### GeminiMultimodalClient

**`await client.generate_persona_instruction(session_context)`**

- Converts session context JSON to natural language persona instruction
- Returns formatted system prompt for live AI
- Raises `MultimodalContextError` on failure

**`await client.build_unified_context(text_items, file_items)`**

- Synthesizes heterogeneous context items into unified persona summary
- Returns structured context string
- Raises `MultimodalContextError` on validation/API errors

### SessionReportGenerator

**`await generator.generate_report(transcript)`**

- Analyzes session transcript using Gemini
- Extracts performance metrics: confidence, sentiment, trends
- Returns `SessionMetrics` with coaching recommendations
- Raises `SessionReportError` on failure

## How to Use

### Generate Persona Instruction

```python
from services.gemini.multimodal import GeminiMultimodalClient

client = GeminiMultimodalClient()

session_context = {
    "prospect_name": "Sarah Chen",
    "company": "TechCorp",
    "role": "VP of Sales",
    "pain_points": ["team productivity", "training cost"],
    # ... more context
}

persona_instruction = await client.generate_persona_instruction(session_context)
# Returns: Natural language system instruction for live AI
```

### Generate Session Report

```python
from services.gemini.multimodal import SessionReportGenerator, TranscriptEntry

generator = SessionReportGenerator()

transcript: list[TranscriptEntry] = [
    {"speaker": "rep", "text": "Hi, thanks for meeting...", "timestamp": 0.0},
    {"speaker": "prospect", "text": "Sure, what's this about?", "timestamp": 3.5},
    # ... more messages
]

report = await generator.generate_report(transcript)

# Returns SessionMetrics:
# {
#   "session_total_time": "15m 30s",
#   "rep_confidence_avg": 7.2,
#   "rep_confidence_trend": "increasing",
#   "on_rep_confidence_avg": 6.8,
#   "on_rep_confidence_trend": "stable",
#   "prospect_sentiment_avg": 7.5,
#   "prospect_sentiment_trend": "improving",
#   "key_moments": [...],
#   "recommendations": [...]
# }
```

## Internal Modules

**client.py** - Main client for persona instruction generation and context synthesis

**session_report.py** - Session transcript analysis and performance report generation

**content_builder.py** - Assembles and validates content parts (text, images, files) with MIME type checking

**response_parser.py** - Safely extracts text from Gemini responses

## Session Report Metrics

See [SESSION_REPORT.md](SESSION_REPORT.md) for detailed documentation on:

- Metric definitions (rep confidence, on-rep confidence, prospect sentiment)
- API usage examples
- Trend analysis
- Coaching recommendations

## Environment

Uses model from `services.gemini.config.get_doc_model_name()` — set `PROXIMA_GEMINI_DOC_MODEL`.
