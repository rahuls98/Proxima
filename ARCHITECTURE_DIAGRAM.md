# Training Pair Persona - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │         Training Setup UI                               │     │
│  │  ┌──────────────────────────────────────────────┐      │     │
│  │  │  Persona Builder                              │      │     │
│  │  │  (Define prospect persona)                    │      │     │
│  │  └──────────────────────────────────────────────┘      │     │
│  │  ┌──────────────────────────────────────────────┐      │     │
│  │  │  TeammateConfigPanel                          │      │     │
│  │  │  ┌────────────────────────────────────────┐  │      │     │
│  │  │  │ ☑ Enable Teammate                      │  │      │     │
│  │  │  │ Role: [AE ▼]                           │  │      │     │
│  │  │  │ Archetype: [Dominator ▼]               │  │      │     │
│  │  │  │ [Generate Config]                      │  │      │     │
│  │  │  └────────────────────────────────────────┘  │      │     │
│  │  └──────────────────────────────────────────────┘      │     │
│  └────────────────────────────────────────────────────────┘     │
│                              │                                    │
│                              │ Start Session                      │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────┐     │
│  │         Training Session UI                             │     │
│  │  ┌──────────────────────────────────────────────┐      │     │
│  │  │  [🔴 REC]  Trainee (You)                     │      │     │
│  │  │  [🎤] Speaking...                             │      │     │
│  │  └──────────────────────────────────────────────┘      │     │
│  │  ┌──────────────────────────────────────────────┐      │     │
│  │  │  [AI] Prospect: "Tell me about pricing..."   │      │     │
│  │  └──────────────────────────────────────────────┘      │     │
│  │  ┌──────────────────────────────────────────────┐      │     │
│  │  │  [AI] Jordan (Teammate): "I can jump in..."  │      │     │
│  │  └──────────────────────────────────────────────┘      │     │
│  └────────────────────────────────────────────────────────┘     │
│                              │                                    │
│                              │ WebSocket                         │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (FastAPI)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  REST API Endpoints                                     │     │
│  │  ┌──────────────────────────────────────────────┐      │     │
│  │  │  POST /teammate/generate-config              │      │     │
│  │  │  GET  /teammate/archetypes                   │      │     │
│  │  │  POST /report/generate                       │      │     │
│  │  └──────────────────────────────────────────────┘      │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  WebSocket Handler                                      │     │
│  │  ┌──────────────────────────────────────────────┐      │     │
│  │  │  IF teammate_enabled:                        │      │     │
│  │  │    Use MultiParticipantManager               │      │     │
│  │  │  ELSE:                                        │      │     │
│  │  │    Use GeminiLiveManager                     │      │     │
│  │  └──────────────────────────────────────────────┘      │     │
│  └────────────────────────────────────────────────────────┘     │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  MultiParticipantManager                                │     │
│  │  ┌──────────────────┐      ┌──────────────────┐        │     │
│  │  │ Prospect Manager │      │ Teammate Manager │        │     │
│  │  │ (Gemini Live 1)  │      │ (Gemini Live 2)  │        │     │
│  │  │ Voice: Schedar   │      │ Voice: Kore      │        │     │
│  │  └────────┬─────────┘      └────────┬─────────┘        │     │
│  │           │                         │                   │     │
│  │           │   Coordinate Turns      │                   │     │
│  │           └──────────┬──────────────┘                   │     │
│  │                      │                                   │     │
│  │                ┌─────▼──────┐                           │     │
│  │                │ Turn Logic │                           │     │
│  │                │ Based on:  │                           │     │
│  │                │ - Archetype│                           │     │
│  │                │ - Triggers │                           │     │
│  │                │ - Context  │                           │     │
│  │                └────────────┘                           │     │
│  └────────────────────────────────────────────────────────┘     │
│                              │                                    │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GEMINI API (Google)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────┐  ┌────────────────────────────┐ │
│  │ Gemini Live Session 1      │  │ Gemini Live Session 2      │ │
│  │ (Prospect Persona)         │  │ (Teammate Persona)         │ │
│  │                            │  │                            │ │
│  │ System Prompt:             │  │ System Prompt:             │ │
│  │ "You are a prospect..."    │  │ "You are Jordan, an AE..." │ │
│  │                            │  │ "Archetype: Dominator..."  │ │
│  │                            │  │ "Interrupt frequently..."  │ │
│  └────────────────────────────┘  └────────────────────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Session Setup Flow

```
User Action                API Call                     Result
─────────────────────────────────────────────────────────────────

[Enable Teammate] ──────> POST /teammate/generate-config
                             {
                               "archetype": "dominator",
                               "role": "AE"
                             }
                                      │
                                      ▼
                          TeammateConfig Generated
                             {
                               "teammate_name": "Jordan",
                               "behavior_archetype": "dominator",
                               "interruption_frequency": "high",
                               ...
                             }
                                      │
                                      ▼
[Start Session] ────────> WebSocket Connection
                           + System Instructions
                           + Teammate Config
                                      │
                                      ▼
                          MultiParticipantManager
                          Creates 2 Gemini Sessions
```

### Active Session Flow

```
Trainee Speaks
     │
     ▼
Audio sent to both AI sessions
     │
     ├──────────────────────┬──────────────────────┐
     ▼                      ▼                      ▼
Prospect AI           Teammate AI          Turn Coordinator
Processes             Processes            Decides who speaks
     │                      │                      │
     ▼                      ▼                      ▼
Generate response?    Generate response?    Based on:
                                            - Last speaker
                                            - Turn count
                                            - Archetype rules
                                            - Triggers
     │                      │                      │
     └──────────────────────┴──────────────────────┘
                           │
                           ▼
              Selected AI speaks
                           │
                           ▼
              Audio + Text returned
                           │
                           ▼
              Client plays audio
              + Displays transcript
```

### Post-Session Analysis Flow

```
[Generate Report] ────────> POST /report/generate
                              {
                                "session_id": "abc123"
                              }
                                      │
                                      ▼
                          Fetch Session from Store
                                      │
                                      ▼
                          Check if multi-participant
                          (teammate_config exists?)
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
                    YES - Multi            NO - Single
                          │                       │
                          ▼                       ▼
          Multi-Participant Prompt    Single Prompt
                          │                       │
                          └───────────┬───────────┘
                                      ▼
                          Gemini Analysis
                          (JSON response)
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
               Standard Metrics         Team Metrics
               - Confidence             - Leadership
               - Sentiment              - Delegation
               - Key Moments            - Interruption
               - Recommendations        - Collaboration
                                        - Peer Leadership
                                      │
                                      ▼
                          Return Complete Report
```

## Teammate Speaking Decision Tree

```
Prospect or Teammate speaks?
│
├─ Check last_speaker
│  └─ If last was teammate → Prefer prospect
│
├─ Calculate turns_since_teammate_spoke
│  │
│  ├─ IF archetype == "dominator":
│  │  └─> Speak if turns > 2
│  │
│  ├─ IF archetype == "passive":
│  │  └─> Speak if turns > 10 (rarely)
│  │
│  ├─ IF archetype == "overly_excited":
│  │  └─> Speak if turns > 3
│  │
│  ├─ IF archetype == "supportive":
│  │  └─> Speak if turns > 4
│  │
│  └─ ELSE: Speak if turns > 4-5
│
├─ Check for triggers:
│  ├─ Prospect asked question?
│  ├─ Long silence (>4s)?
│  ├─ Trainee monologue (>30s)?
│  └─ Technical topic?
│
└─ IF should_speak:
   └─> Yield teammate response
   ELSE:
   └─> Yield prospect response
```

## Archetype Behavior Matrix

```
┌─────────────────┬──────────────┬────────────┬──────────────┬──────────────┐
│   Archetype     │ Interruption │ Confidence │ Helpfulness  │ Speaks When  │
├─────────────────┼──────────────┼────────────┼──────────────┼──────────────┤
│ Dominator       │     High     │    High    │     Low      │  Every 2-3   │
│                 │              │            │              │    turns     │
├─────────────────┼──────────────┼────────────┼──────────────┼──────────────┤
│ Supportive      │     Low      │    High    │     High     │  Every 4-5   │
│                 │              │            │              │    turns     │
├─────────────────┼──────────────┼────────────┼──────────────┼──────────────┤
│ Passive         │   Very Low   │   Medium   │    Medium    │  Every 10+   │
│                 │              │            │              │    turns     │
├─────────────────┼──────────────┼────────────┼──────────────┼──────────────┤
│ Nervous Junior  │     Low      │    Low     │    Medium    │  Every 7+    │
│                 │              │            │              │    turns     │
├─────────────────┼──────────────┼────────────┼──────────────┼──────────────┤
│ Overly Excited  │    Medium    │  High(bad) │     Low      │  Every 3-4   │
│                 │              │            │              │    turns     │
├─────────────────┼──────────────┼────────────┼──────────────┼──────────────┤
│ Strategic AE    │    Medium    │    High    │     High     │  Every 4-5   │
│                 │              │            │              │    turns     │
└─────────────────┴──────────────┴────────────┴──────────────┴──────────────┘
```

## Session Transcript Example

```
[00:00] REP: Hi Sarah, thanks for joining. I have my colleague Jordan with me.
[00:05] PROSPECT: Great to meet you both.
[00:10] TEAMMATE: I can jump in here - we're the best in the market!
[00:16] REP: Thanks Jordan. Sarah, what challenges are you facing?
[00:22] PROSPECT: Our team struggles with follow-up consistency.
[00:27] TEAMMATE: Our system will solve that instantly!
[00:33] REP: That's a good feature. Let me understand your process first...
[00:40] PROSPECT: We use spreadsheets mostly.
[00:44] REP: How much time does that take?
[00:49] PROSPECT: 1-2 hours per day.
[00:53] TEAMMATE: That's terrible! Ours drops it to zero!
[00:58] REP: Jordan brings up a good point, though realistically it's 15-20 min...
```

## Report Output Example

```
┌─────────────────────────────────────────────────────────────┐
│              PERFORMANCE REPORT                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ STANDARD METRICS                                             │
│ ├─ Rep Confidence:       7.5/10  (increasing)               │
│ ├─ On-Rep Confidence:    8.2/10  (stable)                   │
│ └─ Prospect Sentiment:   8.0/10  (improving)                │
│                                                              │
│ TEAM COLLABORATION (Teammate: Jordan - Dominator)           │
│ ├─ Call Leadership:      72%                                │
│ ├─ Delegation Skill:     7.5/10                             │
│ ├─ Interruption Handling: 8.0/10                            │
│ ├─ Collaboration Score:  7.8/10                             │
│ └─ Peer Leadership:      8.5/10                             │
│                                                              │
│ KEY MOMENTS                                                  │
│ 1. Successfully redirected after teammate oversold features  │
│ 2. Tactfully corrected exaggerated ROI claims               │
│ 3. Strategically delegated pricing to teammate              │
│                                                              │
│ RECOMMENDATIONS                                              │
│ 1. Excellent handling of teammate interruptions             │
│ 2. Practice earlier establishment of call leadership        │
│ 3. Continue correcting misinformation tactfully             │
└─────────────────────────────────────────────────────────────┘
```

---

This architecture diagram shows the complete flow from configuration through execution to analysis for the Training Pair Persona feature.
