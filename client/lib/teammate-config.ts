/**
 * Teammate configuration utilities for multi-participant training sessions
 */

import { getApiUrl } from "@/lib/api";

export type TeammateRole = "BDR" | "AE" | "Junior_Rep" | "Senior_Rep";

export type BehaviorArchetype =
    | "dominator"
    | "supportive"
    | "passive"
    | "nervous_junior"
    | "overly_excited"
    | "strategic_ae";

export interface TeammateConfig {
    teammate_enabled: boolean;
    teammate_name: string;
    teammate_role: TeammateRole;
    behavior_archetype: BehaviorArchetype;
    interruption_frequency: "low" | "medium" | "high";
    confidence_level: "low" | "medium" | "high";
    helpfulness_level: "low" | "medium" | "high";
}

export interface ArchetypeDescription {
    name: string;
    description: string;
    behaviors: string[];
    training_goals: string[];
}

export interface ArchetypeInfo {
    archetype: BehaviorArchetype;
    name: string;
    description: string;
    behaviors: string[];
    training_goals: string[];
}

/**
 * Fetch teammate configuration from API
 */
export async function generateTeammateConfig(
    archetype?: BehaviorArchetype,
    role?: TeammateRole,
    name?: string
): Promise<TeammateConfig & { archetype_description: ArchetypeDescription }> {
    const url = getApiUrl("/teammate/generate-config");

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            archetype,
            role,
            name,
        }),
    });

    if (!response.ok) {
        throw new Error(
            `Failed to generate teammate config: ${response.statusText}`
        );
    }

    return await response.json();
}

/**
 * Fetch all available teammate archetypes
 */
export async function getTeammateArchetypes(): Promise<ArchetypeInfo[]> {
    const url = getApiUrl("/teammate/archetypes");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch archetypes: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Fetch specific archetype details
 */
export async function getArchetypeDetails(
    archetype: BehaviorArchetype
): Promise<ArchetypeInfo> {
    const url = getApiUrl(`/teammate/archetypes/${archetype}`);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch archetype details: ${response.statusText}`
        );
    }

    return await response.json();
}

/**
 * Get display label for teammate role
 */
export function getTeammateRoleLabel(role: TeammateRole): string {
    const labels: Record<TeammateRole, string> = {
        BDR: "Business Development Rep",
        AE: "Account Executive",
        Junior_Rep: "Junior Sales Rep",
        Senior_Rep: "Senior Sales Rep",
    };
    return labels[role];
}

/**
 * Get display label for behavior archetype
 */
export function getArchetypeLabel(archetype: BehaviorArchetype): string {
    const labels: Record<BehaviorArchetype, string> = {
        dominator: "Dominant Teammate",
        supportive: "Supportive Partner",
        passive: "Passive Shadow",
        nervous_junior: "Nervous Junior Rep",
        overly_excited: "Over-Excited Seller",
        strategic_ae: "Strategic AE",
    };
    return labels[archetype];
}
