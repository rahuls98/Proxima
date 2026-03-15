type AiFeatureSettingsResponse = {
    avatarGenerationEnabled?: boolean;
};

let cachedAvatarGenerationEnabled: boolean | null = null;

export function getCachedAvatarGenerationEnabled(): boolean {
    return cachedAvatarGenerationEnabled ?? true;
}

export async function fetchAvatarGenerationEnabled(): Promise<boolean> {
    try {
        const response = await fetch("/api/settings/ai-features", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            return getCachedAvatarGenerationEnabled();
        }

        const data = (await response.json()) as AiFeatureSettingsResponse;
        const enabled = data.avatarGenerationEnabled !== false;
        cachedAvatarGenerationEnabled = enabled;
        return enabled;
    } catch {
        return getCachedAvatarGenerationEnabled();
    }
}

export async function updateAvatarGenerationEnabled(
    enabled: boolean
): Promise<boolean> {
    const response = await fetch("/api/settings/ai-features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarGenerationEnabled: enabled }),
    });

    if (!response.ok) {
        throw new Error("Failed to update AI feature settings.");
    }

    const data = (await response.json()) as AiFeatureSettingsResponse;
    const nextEnabled = data.avatarGenerationEnabled !== false;
    cachedAvatarGenerationEnabled = nextEnabled;
    return nextEnabled;
}
