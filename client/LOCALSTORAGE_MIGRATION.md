# LocalStorage Features - Migration Plan

This document outlines all client-side features currently using localStorage that need to be migrated to server-side APIs with proper document store persistence.

## Overview

Current implementation uses browser localStorage for rapid prototyping. All features listed below should eventually be moved to server-side storage with proper database backing for:

- Multi-device access
- User authentication and authorization
- Data persistence and backup
- Analytics and insights
- Scalability

---

## 1. Persona Management

### Current Implementation

- **Storage Key**: `proxima_saved_personas`
- **Location**: [`lib/persona-storage.ts`](lib/persona-storage.ts)
- **Data Structure**:

```typescript
interface SavedPersona {
    id: string; // Generated client-side
    name: string; // Display name
    createdAt: string; // ISO timestamp
    sessionContext: object; // Full form data
    personaInstruction: string; // Generated AI instruction
    jobTitle?: string;
    department?: string;
    prospectName?: string;
}
```

### Features

- Save generated personas for reuse
- List all saved personas in card view (`/personas`)
- Delete personas
- Load persona to prefill context builder
- Update persona names

### Migration Requirements

**API Endpoints Needed**:

```
POST   /api/personas                 - Create persona
GET    /api/personas                 - List all personas (paginated)
GET    /api/personas/:id             - Get specific persona
PUT    /api/personas/:id             - Update persona
DELETE /api/personas/:id             - Delete persona
POST   /api/personas/:id/duplicate   - Duplicate persona
```

**Database Schema**:

```sql
personas {
    id: uuid PRIMARY KEY
    user_id: uuid FOREIGN KEY
    name: varchar(255)
    session_context: jsonb
    persona_instruction: text
    job_title: varchar(255)
    department: varchar(100)
    prospect_name: varchar(255)
    created_at: timestamp
    updated_at: timestamp
}
```

**Additional Considerations**:

- Add user ownership (multi-tenant)
- Add sharing capabilities (team personas)
- Add versioning for persona updates
- Add tags/categories for organization
- Add usage analytics (how often used)

---

## 2. Training Session History

### Current Implementation

- **Storage Key**: `proxima_training_history`
- **Location**: [`lib/training-history.ts`](lib/training-history.ts)
- **Data Structure**:

```typescript
interface TrainingSession {
    id: string; // session_id from backend
    timestamp: string; // ISO timestamp
    transcriptLength: number; // Number of messages
    personaName?: string;
    jobTitle?: string;
    duration?: string;
    report?: SessionReport; // Cached report data
}
```

### Features

- Auto-save completed training sessions
- List session history (`/history`)
- View cached session reports
- Delete sessions from history
- Limit to 50 most recent sessions

### Migration Requirements

**API Endpoints Needed**:

```
POST   /api/sessions                    - Create/complete session
GET    /api/sessions                    - List sessions (paginated, filtered)
GET    /api/sessions/:id                - Get session details
DELETE /api/sessions/:id                - Delete session
GET    /api/sessions/:id/report         - Get session report (existing)
GET    /api/sessions/stats              - Get aggregate stats
```

**Database Schema**:

```sql
training_sessions {
    id: uuid PRIMARY KEY (use existing session_id)
    user_id: uuid FOREIGN KEY
    persona_id: uuid FOREIGN KEY (optional)
    persona_name: varchar(255)
    job_title: varchar(255)
    transcript_length: integer
    duration_seconds: integer
    started_at: timestamp
    completed_at: timestamp
    session_context: jsonb
}

session_reports {
    session_id: uuid PRIMARY KEY FOREIGN KEY
    rep_confidence_avg: decimal
    rep_confidence_trend: varchar(50)
    on_rep_confidence_avg: decimal
    on_rep_confidence_trend: varchar(50)
    prospect_sentiment_avg: decimal
    prospect_sentiment_trend: varchar(50)
    key_moments: jsonb
    recommendations: jsonb
    generated_at: timestamp
}
```

**Additional Considerations**:

- Link sessions to personas used
- Store full transcript in database
- Add session search/filter capabilities
- Add export functionality (PDF reports)
- Add session comparison features
- Add coaching notes/annotations
- Add session replay capability

---

## 3. Active Session Context (Staging)

### Current Implementation

- **Storage Keys**:
    - `proxima_persona_instruction`
    - `proxima_session_context`
- **Locations**:
    - [`app/(app)/training/context-builder/ContextBuilderForm.tsx`](<app/(app)/training/context-builder/ContextBuilderForm.tsx>)
    - [`components/organisms/MeetingRoom.tsx`](components/organisms/MeetingRoom.tsx)
- **Purpose**: Stage persona/context for immediate next training session

### Data Structure

- `proxima_persona_instruction`: Single string (generated instruction)
- `proxima_session_context`: Full session context JSON

### Usage Flow

1. User generates persona in context builder → Saved to staging keys
2. User loads saved persona → Updated in staging keys
3. User starts training session → MeetingRoom reads from staging keys
4. Session ends → Data used to save to history

### Migration Requirements

**API Endpoints Needed**:

```
POST   /api/sessions/draft           - Create draft session
GET    /api/sessions/draft/latest    - Get user's latest draft
PUT    /api/sessions/draft/:id       - Update draft
DELETE /api/sessions/draft/:id       - Delete draft
POST   /api/sessions/draft/:id/start - Convert draft to active session
```

**Database Schema**:

```sql
session_drafts {
    id: uuid PRIMARY KEY
    user_id: uuid FOREIGN KEY
    persona_instruction: text
    session_context: jsonb
    created_at: timestamp
    updated_at: timestamp
}
```

**Migration Strategy**:

- Could initially keep client-side for active session
- Move to server when implementing session resume/recovery
- Enables cross-device session handoff
- Enables auto-save drafts

---

## Migration Priority

### Phase 1 (MVP - Authentication Required First)

1. **User Authentication System**
    - Login/logout
    - Session management
    - User profiles

### Phase 2 (Core Features)

1. **Persona Management API**
    - Most valuable for collaboration
    - Enables persona library sharing
    - Foundation for other features

2. **Training History API**
    - Critical for long-term value
    - Enables analytics dashboard
    - Required for coaching insights

### Phase 3 (Advanced Features)

1. **Session Drafts API**
    - Nice-to-have for session recovery
    - Enables cross-device workflows

### Phase 4 (Analytics & Insights)

1. **Aggregated Analytics**
    - Cross-session insights
    - Performance trends
    - Team dashboards

---

## Technical Considerations

### Database Options

- **PostgreSQL**: Recommended for JSONB support and scalability
- **MongoDB**: Alternative for document-heavy data
- **Supabase**: Fastest path with auth + storage built-in

### Authentication

- NextAuth.js for Next.js client
- JWT or session-based auth
- OAuth providers (Google, Microsoft)

### Sync Strategy

- Optimistic updates on client
- Background sync to server
- Conflict resolution for concurrent edits
- Offline support with queue

### Data Migration

- Export tool to extract localStorage data
- Import API endpoint for bulk user data
- Migration wizard in UI
- Clear localStorage after successful migration

---

## Current LocalStorage Keys Reference

| Key                           | Purpose                | Size Estimate    | Limit                 |
| ----------------------------- | ---------------------- | ---------------- | --------------------- |
| `proxima_saved_personas`      | Persona library        | ~2KB per persona | ~50 personas = ~100KB |
| `proxima_training_history`    | Session history        | ~5KB per session | 50 sessions = ~250KB  |
| `proxima_persona_instruction` | Active session persona | ~1-2KB           | Single value          |
| `proxima_session_context`     | Active session context | ~2-5KB           | Single value          |

**Total estimated storage**: ~350KB for active user (well within 5-10MB localStorage limits)

---

## Implementation Checklist

When migrating each feature:

- [ ] Design database schema
- [ ] Create migration scripts
- [ ] Implement server API endpoints
- [ ] Add API client functions
- [ ] Update UI components to use API
- [ ] Add loading/error states
- [ ] Implement optimistic updates
- [ ] Add data migration tool
- [ ] Update tests
- [ ] Update documentation
- [ ] Remove localStorage code
- [ ] Deploy and monitor

---

## Questions to Resolve

1. **User Model**: Single user or team/organization hierarchy?
2. **Sharing**: Should personas be shareable across team members?
3. **Privacy**: How to handle sensitive prospect data (GDPR, etc.)?
4. **Retention**: How long to keep session history and transcripts?
5. **Pricing**: Free tier limits? Premium features?
6. **Export**: What formats for data export (JSON, CSV, PDF)?

---

_Last Updated: March 6, 2026_
