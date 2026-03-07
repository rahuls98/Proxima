/**
 * Training history storage utilities
 * Manages storing and retrieving past training sessions in localStorage
 */

import type { SessionReport } from "./api";

export interface TrainingSession {
    id: string; // session_id from backend
    timestamp: string; // ISO timestamp when session ended
    transcriptLength: number; // number of messages
    personaName?: string; // extracted from session context
    jobTitle?: string; // extracted from session context
    duration?: string; // if available
    report?: SessionReport; // cached report data
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
