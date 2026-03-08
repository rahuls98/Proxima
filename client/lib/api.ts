/**
 * API utility functions for Proxima client
 * Handles API calls to the backend server
 *
 * Note: Uses relative URLs which are proxied by Next.js rewrites
 * to the backend server (localhost:8000)
 */

/**
 * Generate API URL for an endpoint
 * @param endpoint - The API endpoint path (e.g., '/context/persona-instruction')
 * @returns URL for the API endpoint (relative URL proxied by Next.js)
 */
export function getApiUrl(endpoint: string): string {
    // Always use relative URLs - Next.js rewrites handle proxying to backend
    return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

/**
 * Fetch PersonaInstructionResponse from the backend
 * @param sessionContext - The session context JSON object
 * @returns Promise resolving to PersonaInstructionResponse
 */
export async function generatePersonaInstruction(sessionContext: {
    [key: string]: unknown;
}): Promise<{
    persona_instruction: string;
    source_fields_count: number;
}> {
    const url = getApiUrl("/context/persona-instruction");

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            session_context: sessionContext,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.detail || `API error: ${response.statusText}`
        );
    }

    return response.json();
}

/**
 * Session report data structure - Comprehensive training analysis
 */
export type SessionReport = {
    session_overview: {
        session_id: string;
        scenario: string;
        prospect_persona: string;
        difficulty: string;
        session_duration_seconds: number;
        session_start_time: string;
    };
    overall_score: {
        score: number;
        performance_level: string;
        breakdown: {
            discovery: number;
            objection_handling: number;
            value_communication: number;
            conversation_control: number;
            emotional_intelligence: number;
        };
    };
    conversation_metrics: {
        talk_ratio_rep: number;
        talk_ratio_prospect: number;
        questions_asked: number;
        open_questions: number;
        interruptions: number;
        avg_response_latency_seconds: number;
    };
    discovery_signals: {
        pain_identified: boolean;
        current_tools_identified: boolean;
        budget_discussed: boolean;
        decision_process_identified: boolean;
        timeline_discussed: string;
    };
    objection_handling: {
        objections_detected: number;
        acknowledgment_quality: string;
        evidence_used: string;
        follow_up_questions: string;
    };
    value_communication: {
        value_clarity: string;
        feature_vs_benefit_balance: string;
        roi_quantified: boolean;
        personalization: string;
    };
    emotional_intelligence: {
        empathy: string;
        listening_signals: string;
        rapport_building: string;
        tone_adaptation: string;
    };
    prospect_engagement: {
        trust_change: number;
        engagement_level: string;
        objection_frequency: number;
        conversation_momentum: string;
    };
    deal_progression: {
        buying_interest: string;
        next_step_clarity: string;
        commitment_secured: boolean;
    };
    top_feedback: string[];
    strengths: string[];
    practice_recommendations: {
        focus_area: string;
        recommended_exercise: string;
    };
};

/**
 * Generate a session performance report
 * @param sessionId - The session ID to generate report for
 * @returns Promise resolving to SessionReport
 */
export async function generateSessionReport(
    sessionId: string
): Promise<SessionReport> {
    const url = getApiUrl("/report/generate");

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            session_id: sessionId,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.detail ||
                `Failed to generate report: ${response.statusText}`
        );
    }

    return response.json();
}
