# Client: Proxima Agent UI

## Overview

The client provides a reusable UI architecture for a continuous conversational voice agent.

Primary page:

- `http://localhost:3000/training`

## Architecture

### Service / Utils Layer

- `lib/proxima-agent/service.ts`
  - Owns websocket lifecycle
  - Owns mic capture pipeline
  - Owns audio playback pipeline
  - Emits typed domain events to UI
- `lib/proxima-agent/audio.ts`
  - PCM conversion helpers
  - Sample-rate conversion helpers
- `lib/proxima-agent/types.ts`
  - Shared UI/service event and state types

### UI Component Layer (Atomic Design)

- Atoms (generic reusable)
  - `components/atoms/Button.tsx`
  - `components/atoms/IconButton.tsx`
  - `components/atoms/StatusLine.tsx`
  - `components/atoms/Heading.tsx`
- Molecules (generic reusable)
  - `components/molecules/ControlRow.tsx`
  - `components/molecules/ChatTranscript.tsx`
  - `components/molecules/ChatComposer.tsx`
  - `components/molecules/ParticipantTile.tsx`
- Organisms (feature-specific)
  - `components/organisms/MeetingRoom.tsx`

## Meet-style Layout

The `MeetingRoom` organism composes:

- Bottom dock controls: mute, share screen, camera, more, end session
- Center stage (2/3): participant tiles for `You` and `Agent`
- Right panel (1/3): transcript and chat composer

The non-implemented actions (file attach, text send, share screen, camera, more actions) intentionally show placeholder alerts.

## Reuse Pattern

To build another proxima-agent UI:

1. Instantiate `ProximaAgentService` in your organism/component.
2. Consume `ProximaAgentEvent` messages.
3. Render any custom controls or visualization layers on top.

## Configuration

Optional websocket override for non-local environments:

- `NEXT_PUBLIC_PROXIMA_AGENT_WS_URL`

If unset, client defaults to:

- `ws://<current-hostname>:8000/ws/proxima-agent?mode=training`
