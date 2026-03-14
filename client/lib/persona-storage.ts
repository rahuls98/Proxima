/**
 * Persona storage utilities
 * Manages storing and retrieving training personas in localStorage
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
    // Store some key fields for display
    jobTitle?: string;
    department?: string;
    prospectName?: string;
}

const PERSONAS_STORAGE_KEY = "proxima_saved_personas";

/**
 * Get all saved personas from localStorage
 */
export function getSavedPersonas(): SavedPersona[] {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(PERSONAS_STORAGE_KEY);
    if (!stored) return [];

    try {
        return JSON.parse(stored);
    } catch (error) {
        console.error("Failed to parse saved personas:", error);
        return [];
    }
}

/**
 * Save a new persona to localStorage
 */
export function savePersona(
    sessionContext: { [key: string]: unknown },
    personaInstruction: string
): SavedPersona {
    const personas = getSavedPersonas();

    // Generate a unique ID
    const id = `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extract key fields for display
    const jobTitle = sessionContext.job_title as string | undefined;
    const department = sessionContext.department as string | undefined;
    const prospectName = sessionContext.prospect_name as string | undefined;

    // Create a default name
    const name = prospectName || jobTitle || "Untitled Persona";

    const newPersona: SavedPersona = {
        id,
        name,
        createdAt: new Date().toISOString(),
        sessionContext,
        personaInstruction,
        jobTitle,
        department,
        prospectName,
    };

    personas.unshift(newPersona); // Add to beginning
    localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(personas));

    return newPersona;
}

/**
 * Get a specific persona by ID
 */
export function getPersonaById(id: string): SavedPersona | null {
    const personas = getSavedPersonas();
    return personas.find((p) => p.id === id) || null;
}

/**
 * Delete a persona by ID
 */
export function deletePersona(id: string): void {
    const personas = getSavedPersonas();
    const filtered = personas.filter((p) => p.id !== id);
    localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Update a persona's name
 */
export function updatePersonaName(id: string, name: string): void {
    const personas = getSavedPersonas();
    const updated = personas.map((p) => (p.id === id ? { ...p, name } : p));
    localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Toggle a persona's priority status.
 * Keeps at most 2 priority personas at a time.
 */
export function togglePersonaPriority(id: string): void {
    const personas = getSavedPersonas();
    const target = personas.find((p) => p.id === id);
    if (!target) {
        return;
    }

    const nextIsPriority = !Boolean(target.isPriority);

    let updated = personas.map((persona) => ({ ...persona }));

    if (nextIsPriority) {
        const existingPriority = updated.filter(
            (persona) => persona.id !== id && Boolean(persona.isPriority)
        );

        if (existingPriority.length >= 2) {
            const idsToDemote = existingPriority
                .sort(
                    (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime()
                )
                .slice(0, existingPriority.length - 1)
                .map((persona) => persona.id);

            updated = updated.map((persona) =>
                idsToDemote.includes(persona.id)
                    ? { ...persona, isPriority: false }
                    : persona
            );
        }
    }

    updated = updated.map((persona) =>
        persona.id === id ? { ...persona, isPriority: nextIsPriority } : persona
    );

    localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(updated));
}
