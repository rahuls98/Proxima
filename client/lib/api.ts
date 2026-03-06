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
 * Generate a persona image from session context
 * @param sessionContext - The session context JSON object
 * @returns Promise resolving to a blob URL for the generated image
 */
export async function generatePersonaImage(sessionContext: {
    [key: string]: unknown;
}): Promise<string> {
    const url = getApiUrl("/context/persona-image");

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

    // Convert the image blob to a blob URL
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

/**
 * Session report data structure
 */
export type SessionReport = {
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
