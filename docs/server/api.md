# REST APIs

## Context Builder

`POST /context/persona-instruction`

Generates a persona system instruction from structured session context. Returns:

- `persona_instruction`
- `source_fields_count`
- `prospect_name`
- `voice_name`
- `voice_gender`
- `voice_tone`

## Reports

`POST /report/generate`

Generates a report from the session transcript and context. Uses LLM analysis for:

- Key moments
- Strengths
- Improvements
- Recommendations

Deterministic metrics are combined with the LLM output for stability.

## Storage APIs (Client-facing)

These are consumed by the client through `lib/api.ts` and related storage helpers:

- `/api/personas`
- `/api/sessions`
- `/api/metrics`
- `/api/reports`

See `API_FEATURE_MAP.md` for full UI ↔ API mapping.
