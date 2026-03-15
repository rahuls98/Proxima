# Client Overview

Next.js UI for persona setup, live training sessions, and performance reports.

## Key Pages

- `/training` – Training hub
- `/training/context-builder` – Persona builder
- `/training/[sessionId]` – Live session room
- `/training/[sessionId]/report` – Session report
- `/personas` – Persona library
- `/sessions` – Session history
- `/settings` – User settings + AI feature toggles

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

## Loading Screen Messages

There are two key loading screen messages shown during persona setup and session start:

1. **Context Builder Loading:**
    - Message: "Building a context-aware simulation profile for your training session..."
    - Configured in: `client/app/(app)/training/context-builder/page.tsx` (as the `message` prop to `PersonaConfiguringOverlay`)

2. **Meeting Room Loading:**
    - Message: "Preparing your training agent with the generated persona..." (or error message)
    - Configured in: `client/components/organisms/MeetingRoom.tsx` (as the `message` prop to `PersonaConfiguringOverlay`)

To change these, edit the respective files and update the `message` prop.

## AI Feature Toggles (Global Settings)

The app supports global AI feature toggles, persisted in Firestore and surfaced in the Settings page. The primary toggle as of 2026-03-15 is:

- **Avatar Generation**: Controls whether persona avatars are generated and displayed. When off, avatars are not generated or shown anywhere in the app.

**Persistence:**

- Setting is stored globally in Firestore (`app_settings` collection).
- All clients read/write via `/api/settings/ai-features` (GET, PUT).
- Utility: `client/lib/ai-feature-settings.ts` handles API calls and local caching.

**UI:**

- Settings page: `/settings` (see `client/app/(app)/settings/page.tsx`)
- Toggle is under "AI Features" section.

**Usage:**

- Avatar generation and display logic in context builder and meeting room is gated by this setting.

## User Context Settings (Local Storage)

The settings page stores lightweight user context in browser localStorage for use during training setup:

- `proxima_user_name` via `getUserName()` / `setUserName()`
- `proxima_user_call_context` via `getUserCallContext()` / `setUserCallContext()`

The user call context is a single textarea value describing who the user is and what they typically try to achieve on calls.

## Context Builder Additions

The persona configuration flow now includes an additional required field:

- `discussion_intent` ("Stage Context (One-Liner)")

During persona generation, the context builder also injects `rep_call_context` from localStorage into `session_context` (not shown in context-builder UI), so the training agent can adapt to the rep's profile and goals.
