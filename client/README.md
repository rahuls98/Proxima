# Client: Proxima Agent UI

## Overview

The client provides a reusable UI architecture for a continuous conversational voice + screen-aware agent with persona management and training history.

## Key Pages

- `http://localhost:3000/training` - Main training hub
- `http://localhost:3000/training/context-builder` - Create/edit training personas
- `http://localhost:3000/training/session` - Live training session room
- `http://localhost:3000/training/session-report` - Post-session performance reports
- `http://localhost:3000/personas` - Saved persona library
- `http://localhost:3000/history` - Training session history

## Architecture

### Service / Utils Layer

**Agent Services:**

- `lib/proxima-agent/service.ts` - WebSocket lifecycle, mic capture, screen-share streaming, audio playback
- `lib/proxima-agent/audio.ts` - PCM and sample-rate conversion helpers
- `lib/proxima-agent/screen-share.ts` - Screen-share frame capture (JPEG snapshots)
- `lib/proxima-agent/types.ts` - Shared UI/service event and state types

**Data Management:**

- `lib/persona-storage.ts` - Persona library management (API)
- `lib/training-history.ts` - Training session history (API)
- `lib/api.ts` - Backend API client functions

**Note:** Data management now uses server-side APIs. See [`LOCALSTORAGE_MIGRATION.md`](LOCALSTORAGE_MIGRATION.md) for historical migration notes.

### UI Component Layer (Atomic Design)

- Atoms (generic reusable)
    - `components/atoms/Button.tsx`
      **Atoms** (generic reusable):
- `Button`, `IconButton`, `Input`, `TextArea`, `Heading`, `StatusLine`

**Molecules** (composite components):

- `ControlRow`, `ChatTranscript`, `ChatComposer`, `ParticipantTile`
- `ContextSection`, `AdditionalTextContext`, `AdditionalFileContext`
- `CoachingHint`, `SessionReport`

**Organisms** (feature-specific):

- `MeetingRoom` - Live training session interface

**Templates**:

- `SideNavTemplate` - Main navigation layout

**Pages**:

- `app/(app)/training/` - Training hub and context builder
- `app/(app)/personas/` - Persona library management
- `app/(app)/history/` - Training session history

The `MeetingRoom` organism composes:

- Bottom dock controls: mute, share screen, camera, more, end session
- Center stage (2/3): participant tiles for `You` and `Agent`
- Right panel (1/3): transcript and chat composer

During active screen sharing:

- The left meeting pane switches to a top strip of compact participant tiles plus a dedicated screen stage below.
- The shared screen remains visible locally via a `<video>` preview.
- Screen frames are captured as periodic JPEG snapshots and sent through `ProximaAgentService` for backend Gemini Live analysis.

Chat panel capabilities:

- Send text chat turns to the live session.
- Attach and upload one file at a time from the composer.
- Show upload status events in transcript (`Uploading...`, `File uploaded...`).

Still placeholder actions: camera, more actions.

## Reuse Pattern

To build another proxima-agent UI:

1. Features

### 1. Persona Management

- **Create personas** via context builder form (prospect details, KPIs, objections, personality)
- **Generate AI instructions** from structured context (via `/context/persona-instruction` API)
- **Save personas** to library for reuse
- **Load personas** to prefill context builder
- **Delete personas** from library

### 2. Training Sessions

- **Live voice conversations** with AI prospect persona
- **Screen sharing** with visual analysis
- **Real-time coaching** hints and interventions
- **Chat messaging** and file uploads during session
- **Session transcripts** with participant attribution

### 3. Session Reports

- **Performance metrics** (confidence, sentiment)
- **Key moments** identification
- **Coaching recommendations**
- **Cached reports** for instant replay (no regeneration)

### 4. Training History

- **Auto-save** completed sessions
- **Browse history** with metadata (persona, duration, message count)
- **Quick access** to session reports
- **Delete** old sessions

## Configuration

Optional websocket override for non-local environments:

- `NEXT_PUBLIC_PROXIMA_AGENT_WS_URL`

If unset, client defaults to:

- `ws://<current-hostname>:8000/ws/proxima-agent?mode=training`

## Data Storage

Storage is API-backed. See [`LOCALSTORAGE_MIGRATION.md`](LOCALSTORAGE_MIGRATION.md) for historical migration notes.

If unset, client defaults to:

- `ws://<current-hostname>:8000/ws/proxima-agent?mode=training`
