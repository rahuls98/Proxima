/**
 * Persona storage utilities
 * Now backed by the API (localStorage removed).
 */

export interface SavedPersona {
    id: string;
    name: string;
    createdAt: string;
    isPriority?: boolean;
    sessionContext: {
        [key: string]: unknown;
    };
    personaInstruction: string;
    jobTitle?: string;
    department?: string;
    prospectName?: string;
}

function getApiUrl(endpoint: string): string {
    return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

/**
 * Get all saved personas from API
 */
export async function getSavedPersonas(): Promise<SavedPersona[]> {
    try {
        const response = await fetch(getApiUrl("/api/personas"));
        if (!response.ok) {
            throw new Error(`Failed to fetch personas: ${response.statusText}`);
        }
        return response.json();
    } catch (error) {
        console.error("Failed to load personas:", error);
        return [];
    }
}

/**
 * Save a new persona via API
 */
export async function savePersona(
    sessionContext: { [key: string]: unknown },
    personaInstruction: string
): Promise<SavedPersona> {
    const jobTitle = sessionContext.job_title as string | undefined;
    const department = sessionContext.department as string | undefined;
    const prospectName = sessionContext.prospect_name as string | undefined;
    const name = prospectName || jobTitle || "Untitled Persona";

    const payload = {
        name,
        sessionContext,
        personaInstruction,
        jobTitle,
        department,
        prospectName,
    };

    const response = await fetch(getApiUrl("/api/personas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Failed to save persona: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific persona by ID
 */
export async function getPersonaById(
    id: string
): Promise<SavedPersona | null> {
    const response = await fetch(getApiUrl(`/api/personas/${id}`));
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`Failed to fetch persona: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Delete a persona by ID
 */
export async function deletePersona(id: string): Promise<void> {
    const response = await fetch(getApiUrl(`/api/personas/${id}`), {
        method: "DELETE",
    });
    if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete persona: ${response.statusText}`);
    }
}

/**
 * Update a persona's name
 */
export async function updatePersonaName(
    id: string,
    name: string
): Promise<void> {
    const response = await fetch(getApiUrl(`/api/personas/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!response.ok) {
        throw new Error(`Failed to update persona: ${response.statusText}`);
    }
}

/**
 * Toggle a persona's priority status.
 */
export async function togglePersonaPriority(
    id: string
): Promise<SavedPersona | null> {
    const response = await fetch(getApiUrl(`/api/personas/${id}/priority`), {
        method: "POST",
    });
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`Failed to toggle priority: ${response.statusText}`);
    }
    return response.json();
}

