/**
 * Training history storage utilities
 * Now backed by API.
 */

import type { SessionReport } from "./api";
import {
    getTrainingReport,
    saveTrainingReport,
    deleteTrainingReport,
} from "./training-report-storage";

export interface TrainingSession {
    id: string;
    timestamp: string;
    transcriptLength: number;
    personaName?: string;
    jobTitle?: string;
    duration?: string;
    scenario?: string;
}

function getApiUrl(endpoint: string): string {
    return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

/**
 * Get all training sessions from API
 */
export async function getTrainingHistory(): Promise<TrainingSession[]> {
    try {
        const response = await fetch(getApiUrl("/api/sessions"));
        if (!response.ok) {
            throw new Error(`Failed to fetch sessions: ${response.statusText}`);
        }
        return response.json();
    } catch (error) {
        console.error("Failed to load training history:", error);
        return [];
    }
}

/**
 * Save a completed training session to history
 */
export async function saveTrainingSession(
    session: TrainingSession
): Promise<void> {
    const response = await fetch(getApiUrl("/api/sessions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
    });

    if (!response.ok) {
        throw new Error(`Failed to save session: ${response.statusText}`);
    }
}

/**
 * Get a specific training session by ID
 */
export async function getTrainingSessionById(
    id: string
): Promise<TrainingSession | null> {
    const response = await fetch(getApiUrl(`/api/sessions/${id}`));
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Delete a training session by ID
 */
export async function deleteTrainingSession(id: string): Promise<void> {
    const response = await fetch(getApiUrl(`/api/sessions/${id}`), {
        method: "DELETE",
    });
    if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
    }
}

/**
 * Clear all training history
 */
export async function clearTrainingHistory(): Promise<void> {
    const sessions = await getTrainingHistory();
    await Promise.all(sessions.map((session) => deleteTrainingSession(session.id)));
}

/**
 * Save a training session WITH its report
 */
export async function saveTrainingSessionWithReport(
    session: TrainingSession,
    report: SessionReport
): Promise<void> {
    await saveTrainingSession(session);
    await saveTrainingReport(session.id, report);
}

/**
 * Get a training session WITH its report
 */
export async function getTrainingSessionWithReport(
    sessionId: string
): Promise<{ session: TrainingSession | null; report: SessionReport | null }> {
    const session = await getTrainingSessionById(sessionId);
    const report = await getTrainingReport(sessionId);

    return { session, report };
}

/**
 * Delete a training session AND its report
 */
export async function deleteTrainingSessionWithReport(
    sessionId: string
): Promise<void> {
    await deleteTrainingSession(sessionId);
    await deleteTrainingReport(sessionId);
}

