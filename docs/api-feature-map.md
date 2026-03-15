# API Feature Map

Feature → API mapping for the current Firestore-backed implementation.

**Pages**

- `/settings` global AI feature toggles:
    - `GET /api/settings/ai-features` (fetch global AI feature settings)
    - `PUT /api/settings/ai-features` (update global AI feature settings)
- `/dashboard` metrics aggregate: `GET /api/metrics/aggregate`
- `/dashboard` metrics time series: `GET /api/metrics`
- `/dashboard` priority personas: `GET /api/personas`
- `/sessions` session history list: `GET /api/sessions`
- `/sessions` session delete: `DELETE /api/sessions/{session_id}`
- `/sessions` metrics for summary cards: `GET /api/metrics`
- `/personas` persona list: `GET /api/personas`
- `/personas` persona delete: `DELETE /api/personas/{persona_id}`
- `/personas` persona priority toggle: `POST /api/personas/{persona_id}/priority`
- `/personas/[personaId]` persona details: `GET /api/personas/{persona_id}`
- `/training/context-builder` persona instruction generation: `POST /context/persona-instruction`
- `/training/context-builder` save persona: `POST /api/personas`
- `/training/context-builder` create draft session context: `POST /api/sessions/draft`
- `/training/context-builder` latest draft session context: `GET /api/sessions/draft/latest`
- `/training/context-builder` update draft session context: `PUT /api/sessions/draft/{draft_id}`
- `/training/context-builder` delete draft session context: `DELETE /api/sessions/draft/{draft_id}`
- `/training/context-builder` start draft session context: `POST /api/sessions/draft/{draft_id}/start`
- `/training/[sessionId]` session save: `POST /api/sessions`
- `/training/[sessionId]` report generation: `POST /report/generate`
- `/training/[sessionId]` report cache: `PUT /api/reports/{session_id}`
- `/training/[sessionId]` metrics save: `POST /api/metrics`
- `/training/[sessionId]/report` report fetch: `GET /api/reports/{session_id}`
- `/training/[sessionId]/report` report generation fallback: `POST /report/generate`
- `/training/session-report` report fetch: `GET /api/reports/{session_id}`
- `/training/session-report` report generation fallback: `POST /report/generate`

**Shared Components**

- `SettingsPage` (global AI feature toggles):
    - Reads/writes avatar generation toggle via `/api/settings/ai-features`
- `ContextBuilderForm` and `MeetingRoom`:
    - Avatar generation and display logic is gated by the global setting
- `MeetingRoom` reads draft context: `GET /api/sessions/draft/latest`
- `MeetingRoom` saves session history: `POST /api/sessions`
- `MeetingRoom` generates report: `POST /report/generate`
- `MeetingRoom` caches report: `PUT /api/reports/{session_id}`
- `MeetingRoom` saves metrics: `POST /api/metrics`
- `SessionReportView` fetches cached report: `GET /api/reports/{session_id}`
- `SessionReportView` generates report if missing: `POST /report/generate`
- `PersonaLibraryCard` toggles priority: `POST /api/personas/{persona_id}/priority`
- `PersonaLibraryCard` deletes persona: `DELETE /api/personas/{persona_id}`
- `SessionsTable` deletes session: `DELETE /api/sessions/{session_id}`

**Notes**

- Reports are cached server-side. Regeneration occurs when explicitly requested.
- Session transcripts are persisted and used for LLM-powered key moments/insights.
