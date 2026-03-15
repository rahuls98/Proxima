# Client Overview

Next.js UI for persona setup, live training sessions, and performance reports.

## Key Pages

- `/training` – Training hub
- `/training/context-builder` – Persona builder
- `/training/[sessionId]` – Live session room
- `/training/[sessionId]/report` – Session report
- `/personas` – Persona library
- `/sessions` – Session history

## Service Layer

- `lib/proxima-agent/` – WebSocket lifecycle, audio capture/playback, screen share
- `lib/api.ts` – API wrappers for persona, report, metrics
- `lib/persona-storage.ts` – Personas (API-backed)
- `lib/training-history.ts` – Sessions + report caching (API-backed)

## Live Session UI

`MeetingRoom` composes:

- Participant tiles (you + agent)
- Bottom controls (mute, share screen, end)
- Transcript + chat composer
- Coaching hint popups (centered above controls)
