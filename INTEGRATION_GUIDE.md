# Integration Guide: Adding Teammate Feature to Training Flow

This guide shows how to integrate the teammate feature into the existing training session flow.

## Step 1: Update Training Setup Page

In your training configuration page (where users build personas), add the teammate configuration panel.

### File: `client/app/(app)/training/context-builder/page.tsx` (or similar)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeammateConfigPanel } from "@/components/molecules/TeammateConfigPanel";
import { TeammateConfig } from "@/lib/teammate-config";
// ... other imports

export default function TrainingContextBuilder() {
    const router = useRouter();
    const [sessionContext, setSessionContext] = useState({});
    const [personaInstruction, setPersonaInstruction] = useState("");

    // Teammate state
    const [teammateEnabled, setTeammateEnabled] = useState(false);
    const [teammateConfig, setTeammateConfig] = useState<TeammateConfig | null>(
        null
    );

    const handleStartSession = async () => {
        // Create session with optional teammate config
        const sessionConfig = {
            sessionContext,
            personaInstruction,
            teammateConfig: teammateEnabled ? teammateConfig : null,
        };

        // Navigate to session with config
        const params = new URLSearchParams({
            config: JSON.stringify(sessionConfig),
        });
        router.push(`/training/session?${params.toString()}`);
    };

    return (
        <div className="space-y-6">
            {/* Existing persona builder components */}
            <PersonaBuilder
                onContextChange={setSessionContext}
                onInstructionGenerated={setPersonaInstruction}
            />

            {/* NEW: Teammate Configuration */}
            <TeammateConfigPanel
                enabled={teammateEnabled}
                onToggle={setTeammateEnabled}
                onConfigGenerated={setTeammateConfig}
            />

            <Button
                onClick={handleStartSession}
                disabled={
                    !personaInstruction || (teammateEnabled && !teammateConfig)
                }
            >
                Start Training Session
            </Button>
        </div>
    );
}
```

## Step 2: Initialize WebSocket with Teammate Config

When starting a training session with a teammate, initialize with the multi-participant manager.

### File: `client/app/(session)/training/session/page.tsx` (or similar)

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function TrainingSessionPage() {
    const searchParams = useSearchParams();
    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        // Parse session config from URL params
        const configStr = searchParams.get("config");
        const config = configStr ? JSON.parse(configStr) : {};

        const { personaInstruction, teammateConfig } = config;

        // Create WebSocket connection
        const apiUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
        const params = new URLSearchParams({
            mode: "training",
            // Add session ID if you've created one via API
        });

        const wsUrl = `${apiUrl}/ws/proxima-agent?${params.toString()}`;
        const websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
            console.log("WebSocket connected");

            // Send system instruction for prospect
            websocket.send(
                JSON.stringify({
                    type: "set_system_instruction",
                    instruction: personaInstruction,
                })
            );

            // If teammate is enabled, send teammate configuration
            if (teammateConfig) {
                websocket.send(
                    JSON.stringify({
                        type: "enable_teammate",
                        config: teammateConfig,
                    })
                );
            }
        };

        websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleWebsocketMessage(message);
        };

        setWs(websocket);

        return () => {
            websocket.close();
        };
    }, [searchParams]);

    const handleWebsocketMessage = (message: any) => {
        switch (message.type) {
            case "text":
                // Display AI text with speaker tag
                const speaker = message.speaker || "prospect";
                console.log(`[${speaker}]: ${message.text}`);
                break;
            case "audio":
                // Handle audio playback
                break;
            // ... other message types
        }
    };

    return <div>{/* Training session UI */}</div>;
}
```

## Step 3: Server-Side WebSocket Handler Integration

The WebSocket handler needs to be updated to support teammate initialization.

### File: `server/proxima/websocket/handler.py`

Add teammate handling to the message processing:

```python
from services.gemini.live import MultiParticipantManager

# In the run() method, after receiving message from client:

async def receive_from_client():
    async for message in websocket.iter_json():
        msg_type = message.get("type")

        # ... existing message handling ...

        # NEW: Handle teammate enablement
        if msg_type == "enable_teammate":
            config = message.get("config")
            if config:
                # Replace standard manager with multi-participant manager
                # This would require refactoring the manager initialization
                # to support both single and multi-participant modes

                # Store teammate config in session
                if session_id:
                    session = session_store.get_session(session_id)
                    if session:
                        session.teammate_config = config
```

**Note**: Full WebSocket integration requires refactoring the handler to conditionally use either `GeminiLiveManager` or `MultiParticipantManager` based on whether a teammate is enabled. This is beyond the scope of this initial implementation but the foundation is in place.

## Step 4: Display Team Metrics in Report

Update the report display to show team collaboration metrics.

### File: `client/components/organisms/SessionReport.tsx` (create if needed)

```tsx
import { GenerateReportResponse } from "@/lib/api"; // you may need to update this type

interface SessionReportProps {
    report: GenerateReportResponse;
}

export function SessionReport({ report }: SessionReportProps) {
    const isMultiParticipant = report.teammate_archetype !== null;

    return (
        <div className="space-y-6">
            {/* Standard Metrics */}
            <section>
                <h2 className="text-xl font-bold mb-4">Performance Metrics</h2>
                <div className="grid grid-cols-3 gap-4">
                    <MetricCard
                        title="Rep Confidence"
                        value={report.rep_confidence_avg}
                        trend={report.rep_confidence_trend}
                    />
                    <MetricCard
                        title="On-Rep Confidence"
                        value={report.on_rep_confidence_avg}
                        trend={report.on_rep_confidence_trend}
                    />
                    <MetricCard
                        title="Prospect Sentiment"
                        value={report.prospect_sentiment_avg}
                        trend={report.prospect_sentiment_trend}
                    />
                </div>
            </section>

            {/* Team Collaboration Metrics (only for multi-participant) */}
            {isMultiParticipant && (
                <section>
                    <h2 className="text-xl font-bold mb-4">
                        Team Collaboration Metrics
                    </h2>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="font-medium">
                            Teammate Archetype: {report.teammate_archetype}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <MetricCard
                            title="Call Leadership"
                            value={report.call_leadership_score}
                            suffix="%"
                        />
                        <MetricCard
                            title="Delegation Skill"
                            value={report.delegation_skill}
                        />
                        <MetricCard
                            title="Interruption Handling"
                            value={report.interruption_handling}
                        />
                        <MetricCard
                            title="Collaboration Score"
                            value={report.collaboration_score}
                        />
                        <MetricCard
                            title="Peer Leadership"
                            value={report.peer_leadership}
                        />
                    </div>
                </section>
            )}

            {/* Key Moments */}
            <section>
                <h2 className="text-xl font-bold mb-4">Key Moments</h2>
                <ul className="space-y-2">
                    {report.key_moments.map((moment, idx) => (
                        <li key={idx} className="flex">
                            <span className="font-medium mr-2">{idx + 1}.</span>
                            <span>{moment}</span>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Recommendations */}
            <section>
                <h2 className="text-xl font-bold mb-4">
                    Coaching Recommendations
                </h2>
                <ul className="space-y-2">
                    {report.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex">
                            <span className="font-medium mr-2">{idx + 1}.</span>
                            <span>{rec}</span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
```

## Step 5: Update API Client Types

Ensure your API client has the updated types for the report response.

### File: `client/lib/api.ts`

```typescript
export interface SessionReportMetrics {
    session_id: string;
    session_total_time: string;
    rep_confidence_avg: number;
    rep_confidence_trend: string;
    on_rep_confidence_avg: number;
    on_rep_confidence_trend: string;
    prospect_sentiment_avg: number;
    prospect_sentiment_trend: string;
    key_moments: string[];
    recommendations: string[];
    transcript_length: number;

    // Multi-participant metrics (optional)
    call_leadership_score?: number;
    delegation_skill?: number;
    interruption_handling?: number;
    collaboration_score?: number;
    peer_leadership?: number;
    teammate_archetype?: string;
}

export async function generateSessionReport(
    sessionId: string
): Promise<SessionReportMetrics> {
    const url = getApiUrl("/report/generate");
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`);
    }

    return await response.json();
}
```

## Testing the Integration

### 1. Test API Endpoints

```bash
# Test generating a teammate config
curl -X POST http://localhost:8000/teammate/generate-config \
  -H "Content-Type: application/json" \
  -d '{"archetype": "dominator", "role": "AE"}'

# Test getting archetypes
curl http://localhost:8000/teammate/archetypes
```

### 2. Test Full Flow with Script

```bash
cd server
python test_teammate_feature.py
```

### 3. Test in UI

1. Start the server: `cd server && uvicorn main:app --reload`
2. Start the client: `cd client && npm run dev`
3. Navigate to training setup
4. Enable teammate feature
5. Select archetype
6. Generate config
7. Start session

## Environment Variables

Ensure these are set in your client `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Common Issues & Solutions

### Issue: Teammate not speaking

**Solution**: Check that `teammate_enabled` is `true` in the session config and the archetype is set to something other than "passive".

### Issue: Can't differentiate speakers

**Solution**: The `speaker` field in events will be "prospect", "teammate", or identified by the event source. Consider adding visual indicators or different audio processing.

### Issue: Report generation fails for multi-participant

**Solution**: Ensure the session transcript includes messages with speaker="teammate" and that teammate_config is stored in the session.

### Issue: TypeError with optional metrics

**Solution**: Check for null/undefined before rendering team collaboration metrics in the UI.

## Next Steps

1. **Full WebSocket Integration**: Refactor the WebSocket handler to use `MultiParticipantManager` when teammate is enabled
2. **Real-time Speaker Indicators**: Add UI to show which AI is currently speaking
3. **Voice Differentiation**: Use different audio processing or visual cues for teammate voice
4. **Session Persistence**: Store teammate config when creating sessions via API
5. **Advanced Controls**: Add ability to mute/unmute teammate during session

## Resources

- Full Feature Documentation: `TEAMMATE_FEATURE.md`
- Quick Start Guide: `TEAMMATE_QUICKSTART.md`
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- API Documentation: See server `http://localhost:8000/docs` (FastAPI auto-docs)
