export type SessionContextRecord = {
    session_id: string;
    persona_instruction?: string | null;
    session_context?: Record<string, unknown> | null;
    created_at?: string;
    updated_at?: string;
};

function getApiUrl(endpoint: string): string {
    return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

export async function setSessionContext(
    sessionId: string,
    payload: {
        persona_instruction?: string | null;
        session_context?: Record<string, unknown> | null;
    }
): Promise<SessionContextRecord> {
    const response = await fetch(
        getApiUrl(`/api/sessions/${sessionId}/context`),
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );
    if (!response.ok) {
        throw new Error(`Failed to save session context: ${response.statusText}`);
    }
    return response.json();
}

export async function getSessionContext(
    sessionId: string
): Promise<SessionContextRecord | null> {
    const response = await fetch(
        getApiUrl(`/api/sessions/${sessionId}/context`)
    );
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(
            `Failed to fetch session context: ${response.statusText}`
        );
    }
    return response.json();
}
