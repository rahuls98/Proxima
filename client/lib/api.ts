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
