export type SessionDraft = {
    id: string;
    persona_instruction?: string | null;
    session_context?: Record<string, unknown> | null;
    created_at?: string;
    updated_at?: string;
};

function getApiUrl(endpoint: string): string {
    return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

export async function createDraft(payload: {
    persona_instruction?: string | null;
    session_context?: Record<string, unknown> | null;
}): Promise<SessionDraft> {
    const response = await fetch(getApiUrl("/api/sessions/draft"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Failed to create draft: ${response.statusText}`);
    }
    return response.json();
}

export async function getLatestDraft(): Promise<SessionDraft | null> {
    const response = await fetch(getApiUrl("/api/sessions/draft/latest"));
    if (!response.ok) {
        throw new Error(`Failed to fetch draft: ${response.statusText}`);
    }
    const data = await response.json();
    if (data && data.status === "empty") {
        return null;
    }
    return data;
}

export async function updateDraft(
    draftId: string,
    payload: {
        persona_instruction?: string | null;
        session_context?: Record<string, unknown> | null;
    }
): Promise<SessionDraft> {
    const response = await fetch(getApiUrl(`/api/sessions/draft/${draftId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Failed to update draft: ${response.statusText}`);
    }
    return response.json();
}

export async function deleteDraft(draftId: string): Promise<void> {
    const response = await fetch(getApiUrl(`/api/sessions/draft/${draftId}`), {
        method: "DELETE",
    });
    if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete draft: ${response.statusText}`);
    }
}

export async function startDraft(draftId: string): Promise<void> {
    const response = await fetch(
        getApiUrl(`/api/sessions/draft/${draftId}/start`),
        { method: "POST" }
    );
    if (!response.ok) {
        throw new Error(`Failed to start draft: ${response.statusText}`);
    }
}

