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

Session context expectations:

- Required fields:
    - `job_title`
    - `company_name`
    - `location`
    - `industry`
    - `discussion_stage`
    - `discussion_intent`
    - `objection_archetype`
    - `skepticism_level`
    - `negotiation_toughness`
    - `decision_style`
    - `trust_level_at_start`
- Optional pass-through context:
    - `rep_call_context` (rep profile + typical call goals from settings)

`POST /context/persona-image`

Generates a professional persona avatar from session context. Returns PNG bytes.

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
