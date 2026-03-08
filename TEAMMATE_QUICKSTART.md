# Training Pair Persona Feature - Quick Start Guide

## What's New

The Training Pair Persona feature adds **multi-participant training sessions** where a second AI acts as a sales teammate (BDR, AE, or Junior Rep) on the call alongside the prospect.

This creates realistic team dynamics that help trainees practice:

- Call leadership and control
- Team coordination and handoffs
- Handling interruptions
- Delegation and mentoring
- Collaborative selling

## Getting Started

### 1. Enable Teammate Feature

When setting up a training session, enable the AI Teammate option:

```typescript
import { TeammateConfigPanel } from "@/components/molecules/TeammateConfigPanel";

<TeammateConfigPanel
    enabled={teammateEnabled}
    onToggle={setTeammateEnabled}
    onConfigGenerated={handleTeammateConfig}
/>
```

### 2. Choose Behavior Archetype

Select from six distinct teammate behaviors:

- **Dominant Teammate** - Interrupts and tries to take control (tests assertiveness)
- **Supportive Partner** - Reinforces your points (practices collaboration)
- **Passive Shadow** - Rarely speaks (tests delegation skills)
- **Nervous Junior** - Uncertain, needs guidance (tests mentoring)
- **Over-Excited Seller** - Oversells product (tests credibility management)
- **Strategic AE** - Asks strategic questions (tests structured selling)

### 3. Generate Configuration

Click "Generate Teammate Config" to create a randomized or custom teammate:

```bash
curl -X POST http://localhost:8000/teammate/generate-config \
  -H "Content-Type: application/json" \
  -d '{
    "archetype": "dominator",
    "role": "AE"
  }'
```

### 4. Start Training Session

The session will now include three participants:

- **You** (Trainee Rep)
- **AI Prospect** (Customer simulation)
- **AI Teammate** (Sales colleague simulation)

## API Endpoints

### Generate Teammate Config

```
POST /teammate/generate-config
```

### Get All Archetypes

```
GET /teammate/archetypes
```

### Get Archetype Details

```
GET /teammate/archetypes/{archetype}
```

## Training Metrics

Multi-participant sessions include additional metrics in the performance report:

- **Call Leadership Score** (0-100%): How well you maintained control
- **Delegation Skill** (0-10): How effectively you involved the teammate
- **Interruption Handling** (0-10): How well you handled interruptions
- **Collaboration Score** (0-10): Quality of teamwork and handoffs
- **Peer Leadership** (0-10): Did you guide/correct the teammate effectively

## Example: Dominant Teammate Scenario

**Setup:**

- Archetype: Dominant Teammate
- Role: AE
- Interruption Frequency: High

**What to expect:**

- Teammate will try to answer prospect questions first
- May interrupt you mid-explanation
- Will jump into product demonstrations
- Tests your ability to maintain call control

**Success criteria:**

- Acknowledge teammate input gracefully
- Redirect conversation when needed
- Maintain leadership without being dismissive
- Use teammate strategically for specific areas

## File Structure

### Backend

```
server/
├── proxima/
│   ├── config/
│   │   ├── teammate_personas.py      # Archetype definitions
│   │   └── teammate_prompts.py       # Behavior prompts
│   ├── api/
│   │   └── teammate.py              # REST endpoints
│   └── session_store.py             # Updated for teammate config
└── services/
    └── gemini/
        ├── live/
        │   └── multi_participant_manager.py  # Dual AI coordination
        └── multimodal/
            └── session_report.py    # Enhanced metrics
```

### Frontend

```
client/
├── lib/
│   └── teammate-config.ts           # API client
└── components/
    └── molecules/
        └── TeammateConfigPanel.tsx # Configuration UI
```

## Configuration Options

### Teammate Roles

- `BDR` - Business Development Rep
- `AE` - Account Executive
- `Junior_Rep` - Junior Sales Rep
- `Senior_Rep` - Senior Sales Rep

### Behavior Parameters

- **Interruption Frequency**: `low` | `medium` | `high`
- **Confidence Level**: `low` | `medium` | `high`
- **Helpfulness Level**: `low` | `medium` | `high`

## Best Practices

1. **Start with Supportive** - Begin with a supportive teammate to learn coordination
2. **Progress to Challenging** - Move to dominant/excited archetypes for advanced training
3. **Practice Mentoring** - Use nervous junior for leadership development
4. **Review Team Metrics** - Focus on collaboration scores in post-session analysis
5. **Vary Archetypes** - Different scenarios benefit from different team dynamics

## Troubleshooting

**Teammate not speaking enough:**

- Check interruption frequency setting
- Dominant archetypes speak more frequently
- Passive archetypes require direct invitation

**Too much interruption:**

- Dominant/Excited archetypes interrupt more
- Adjust interruption_frequency to `low` or `medium`
- Practice assertive redirects

**Conflicting information from teammate:**

- This is intentional for nervous_junior and overly_excited archetypes
- Practice tactfully correcting misinformation
- Good opportunity to demonstrate expertise

## Full Documentation

See [TEAMMATE_FEATURE.md](./TEAMMATE_FEATURE.md) for complete feature documentation.
