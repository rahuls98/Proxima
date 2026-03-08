/**
 * Training history storage utilities
 * Manages storing and retrieving past training sessions in localStorage
 *
 * Note: Reports are now stored separately via training-report-storage.ts
 * This allows for better separation of concerns and easier API migration.
 */

import type { SessionReport } from "./api";
import {
    getTrainingReport,
    saveTrainingReport,
    deleteTrainingReport,
} from "./training-report-storage";

export interface TrainingSession {
    id: string; // session_id from backend
    timestamp: string; // ISO timestamp when session ended
    transcriptLength: number; // number of messages
    personaName?: string; // extracted from session context
    jobTitle?: string; // extracted from session context
    duration?: string; // if available
    scenario?: string; // scenario name/description
}

const TRAINING_HISTORY_KEY = "proxima_training_history";

/**
 * Get all training sessions from localStorage
 */
export function getTrainingHistory(): TrainingSession[] {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(TRAINING_HISTORY_KEY);
    if (!stored) return [];

    try {
        return JSON.parse(stored);
    } catch (error) {
        console.error("Failed to parse training history:", error);
        return [];
    }
}

/**
 * Save a completed training session to history
 */
export function saveTrainingSession(session: TrainingSession): void {
    const history = getTrainingHistory();

    // Add to beginning (most recent first)
    history.unshift(session);

    // Optionally limit to last 50 sessions
    const limitedHistory = history.slice(0, 50);

    localStorage.setItem(TRAINING_HISTORY_KEY, JSON.stringify(limitedHistory));
}

/**
 * Get a specific training session by ID
 */
export function getTrainingSessionById(id: string): TrainingSession | null {
    const history = getTrainingHistory();
    return history.find((s) => s.id === id) || null;
}

/**
 * Delete a training session by ID
 */
export function deleteTrainingSession(id: string): void {
    const history = getTrainingHistory();
    const filtered = history.filter((s) => s.id !== id);
    localStorage.setItem(TRAINING_HISTORY_KEY, JSON.stringify(filtered));
}

/**
 * Clear all training history
 */
export function clearTrainingHistory(): void {
    localStorage.removeItem(TRAINING_HISTORY_KEY);
}

/**
 * Save a training session WITH its report
 * This is a convenience function that saves both the session metadata
 * and the report data in their respective storage locations
 */
export async function saveTrainingSessionWithReport(
    session: TrainingSession,
    report: SessionReport
): Promise<void> {
    // Save session metadata
    saveTrainingSession(session);

    // Save report separately
    await saveTrainingReport(session.id, report);
}

/**
 * Get a training session WITH its report
 * Returns both session metadata and report data (if available)
 */
export async function getTrainingSessionWithReport(
    sessionId: string
): Promise<{ session: TrainingSession | null; report: SessionReport | null }> {
    const session = getTrainingSessionById(sessionId);
    const report = await getTrainingReport(sessionId);

    return { session, report };
}

/**
 * Delete a training session AND its report
 * Removes both session metadata and report data
 */
export async function deleteTrainingSessionWithReport(
    sessionId: string
): Promise<void> {
    // Delete session metadata
    deleteTrainingSession(sessionId);

    // Delete report
    await deleteTrainingReport(sessionId);
}
