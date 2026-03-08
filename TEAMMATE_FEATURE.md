# Training Pair Persona (AI Teammate) Feature

## Overview

The Training Pair Persona feature introduces a second AI participant in training calls that behaves like another salesperson (BDR or AE). This simulates realistic multi-person sales call dynamics that are common in real-world scenarios.

## Use Cases

- **BDR + AE discovery calls**: Practice coordinating with account executives during prospect meetings
- **Junior rep shadowing**: Learn to lead calls while a less experienced teammate observes
- **Team selling dynamics**: Handle interruptions, maintain control, and delegate effectively
- **Call leadership**: Practice assertiveness and managing multi-person conversations
- **Mentoring scenarios**: Guide and correct junior teammates during calls

## How It Works

### Session Structure

Multi-participant training sessions include **three participants**:

1. **Trainee Rep** - The person being trained (user)
2. **AI Teammate** - Simulated sales colleague (BDR/AE/Junior Rep/Senior Rep)
3. **AI Prospect** - Simulated customer

The AI teammate speaks occasionally based on conversation dynamics and their assigned behavior archetype.

### Behavior Archetypes

Six distinct teammate archetypes create different training challenges:

#### 1. Dominant Teammate

- **Behavior**: Tries to take control, interrupts trainee, answers prospect questions first
- **Training Goals**: Assertiveness, regaining control, call leadership
- **Interruption Frequency**: High

#### 2. Supportive Partner

- **Behavior**: Reinforces trainee's points, provides helpful examples, collaborative approach
- **Training Goals**: Collaborative selling, effective handoffs, team coordination
- **Interruption Frequency**: Low

#### 3. Passive Shadow

- **Behavior**: Rarely speaks unless directly invited, observes quietly
- **Training Goals**: Delegation, including quiet participants, leading with observers
- **Interruption Frequency**: Very Low

#### 4. Nervous Junior Rep

- **Behavior**: Uncertain about details, asks trainee for help, occasionally provides incorrect info
- **Training Goals**: Mentoring, tactfully correcting mistakes, supporting junior teammates
- **Confidence Level**: Low

#### 5. Over-Excited Seller

- **Behavior**: Oversells features, exaggerates claims, overly enthusiastic
- **Training Goals**: Maintaining credibility, reigning in overpromising, balanced messaging
- **Confidence Level**: High (but misguided)

#### 6. Strategic AE

- **Behavior**: Asks strategic questions, pushes toward structured discovery, provides business perspective
- **Training Goals**: Strategic selling discipline, business value conversations, advanced discovery
- **Interruption Frequency**: Medium

## API Endpoints

### Generate Teammate Configuration

```http
POST /teammate/generate-config
```

**Request Body:**

```json
{
    "archetype": "dominator", // optional, random if not specified
    "role": "AE", // optional, random if not specified
    "name": "Jordan" // optional, random if not specified
}
```

**Response:**

```json
{
  "teammate_enabled": true,
  "teammate_name": "Jordan",
  "teammate_role": "AE",
  "behavior_archetype": "dominator",
  "interruption_frequency": "high",
  "confidence_level": "high",
  "helpfulness_level": "low",
  "archetype_description": {
    "name": "Dominant Teammate",
    "description": "Tries to take control of the call",
    "behaviors": [...],
    "training_goals": [...]
  }
}
```

### Get All Archetypes

```http
GET /teammate/archetypes
```

Returns a list of all available teammate behavior archetypes with descriptions.

### Get Specific Archetype Details

```http
GET /teammate/archetypes/{archetype}
```

Returns detailed information about a specific archetype.

## Speaking Triggers

The AI teammate decides when to speak based on several factors:

### Context-Based Triggers

- **Prospect asks a question** → Teammate may jump in (especially if dominant)
- **Long silence from trainee** (>4 seconds) → Teammate prompts or fills gap
- **Trainee monologues too long** (>30 seconds) → Teammate interrupts or redirects
- **Technical topic appears** → Teammate offers expertise
- **Trainee directly addresses teammate** → Teammate responds

### Archetype-Specific Behavior

- **Dominator**: Jumps in early, interrupts frequently
- **Supportive**: Waits for trainee, adds supporting points
- **Passive**: Only speaks when directly invited
- **Nervous Junior**: Occasionally asks for help or clarification
- **Over-Excited**: Interrupts with enthusiasm, oversells
- **Strategic AE**: Asks strategic questions, redirects to business value

## Training Metrics

Multi-participant sessions include additional performance metrics:

### Call Leadership Score (0-100%)

Measures how well the trainee maintained control of the call.

- **80-100%**: Strong control, clear leader
- **60-79%**: Adequate control with some slips
- **40-59%**: Shared control, unclear leadership
- **0-39%**: Lost control, teammate dominated

### Delegation Skill (0-10)

How effectively the trainee involved the teammate.

- **8-10**: Excellent handoffs, strategic involvement
- **5-7**: Adequate delegation
- **0-4**: Poor delegation (ignored teammate or over-relied)

### Interruption Handling (0-10)

How well the trainee handled teammate interruptions.

- **8-10**: Smoothly acknowledged and redirected
- **5-7**: Adequate recovery
- **0-4**: Lost momentum, became flustered

### Collaboration Score (0-10)

Quality of teamwork and handoffs.

- **8-10**: Seamless collaboration, unified team
- **5-7**: Functional teamwork
- **0-4**: Disconnected, conflicting messages

### Peer Leadership (0-10)

Did the trainee guide or correct the teammate when needed?

- **8-10**: Confident mentoring, tactful corrections
- **5-7**: Some guidance
- **0-4**: Failed to lead the teammate

## Implementation

### Backend Components

**Configuration:**

- `server/proxima/config/teammate_personas.py` - Archetype definitions and config generation
- `server/proxima/config/teammate_prompts.py` - System prompts for each archetype

**API:**

- `server/proxima/api/teammate.py` - REST endpoints for teammate configuration

**Session Management:**

- `server/services/gemini/live/multi_participant_manager.py` - Coordinates dual AI sessions

**Analytics:**

- `server/services/gemini/multimodal/session_report.py` - Multi-participant metrics analysis

### Frontend Components

**Libraries:**

- `client/lib/teammate-config.ts` - API client for teammate configuration

**Components:**

- `client/components/molecules/TeammateConfigPanel.tsx` - UI for configuring teammate

### Usage Example

```typescript
import { TeammateConfigPanel } from "@/components/molecules/TeammateConfigPanel";
import { TeammateConfig } from "@/lib/teammate-config";

function TrainingSetup() {
    const [teammateEnabled, setTeammateEnabled] = useState(false);
    const [teammateConfig, setTeammateConfig] = useState<TeammateConfig | null>(null);

    return (
        <TeammateConfigPanel
            enabled={teammateEnabled}
            onToggle={setTeammateEnabled}
            onConfigGenerated={setTeammateConfig}
        />
    );
}
```

## Session Flow

1. **Setup Phase**
    - User enables teammate feature
    - Selects archetype (or random)
    - Generates teammate configuration via API

2. **Session Initialization**
    - Two separate Gemini Live sessions are created:
        - Prospect AI (uses standard training prompt)
        - Teammate AI (uses archetype-specific prompt)
    - Both AIs receive the same audio/video input
    - Manager coordinates turn-taking between them

3. **Active Session**
    - Trainee speaks to both AIs
    - Prospect responds as customer
    - Teammate speaks based on triggers and archetype
    - Both AIs maintain conversation context
    - Transcript tracks all three speakers

4. **Post-Session Analysis**
    - Standard metrics (confidence, sentiment, etc.)
    - Additional team collaboration metrics
    - Coaching feedback specific to team dynamics

## Best Practices

### For Trainees

1. **Establish leadership early** - Introduce yourself and set the agenda
2. **Be inclusive** - Invite your teammate to contribute strategically
3. **Handle interruptions gracefully** - Acknowledge teammate input and redirect
4. **Correct tactfully** - If teammate misstates something, correct gently
5. **Delegate strategically** - Hand off to teammate for specific expertise areas

### For Trainers

1. **Match archetype to learning objectives** - Use dominant for assertiveness training, nervous junior for mentoring practice
2. **Debrief team dynamics** - Review how trainee handled specific teammate behaviors
3. **Progress gradually** - Start with supportive teammates, advance to challenging ones
4. **Use varied archetypes** - Different scenarios require different team dynamics

## Future Enhancements

- Custom teammate personas beyond predefined archetypes
- Dynamic archetype switching mid-session
- Multi-teammate scenarios (3+ person calls)
- Teammate performance scoring (how helpful was the teammate)
- Voice differentiation for easier speaker identification
- Visual indicators showing which AI is speaking
