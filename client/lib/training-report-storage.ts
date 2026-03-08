/**
 * Training Report Storage Layer
 *
 * Provides an abstracted interface for storing and retrieving training reports.
 * Currently uses localStorage, but can be easily swapped with API calls later.
 *
 * This layer separates the storage mechanism from business logic,
 * making it easy to transition from local storage to backend API.
 */

import type { SessionReport } from "./api";

/**
 * Storage interface for training reports
 * Implement this interface to create different storage backends
 */
interface ITrainingReportStorage {
    /**
     * Save a training report
     * @param sessionId - Unique session identifier
     * @param report - Complete session report data
     */
    saveReport(sessionId: string, report: SessionReport): Promise<void>;

    /**
     * Retrieve a training report by session ID
     * @param sessionId - Unique session identifier
     * @returns Report data or null if not found
     */
    getReport(sessionId: string): Promise<SessionReport | null>;

    /**
     * Delete a training report
     * @param sessionId - Unique session identifier
     */
    deleteReport(sessionId: string): Promise<void>;

    /**
     * Get all stored report IDs
     * @returns Array of session IDs that have reports
     */
    getAllReportIds(): Promise<string[]>;

    /**
     * Clear all stored reports
     */
    clearAllReports(): Promise<void>;
}

/**
 * LocalStorage implementation of the training report storage interface
 */
class LocalStorageReportStorage implements ITrainingReportStorage {
    private readonly storageKey = "proxima_training_reports";

    /**
     * Get all reports from localStorage
     */
    private getAllReports(): Record<string, SessionReport> {
        if (typeof window === "undefined") return {};

        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return {};

        try {
            return JSON.parse(stored);
        } catch (error) {
            console.error("Failed to parse training reports:", error);
            return {};
        }
    }

    /**
     * Save all reports to localStorage
     */
    private setAllReports(reports: Record<string, SessionReport>): void {
        localStorage.setItem(this.storageKey, JSON.stringify(reports));
    }

    async saveReport(sessionId: string, report: SessionReport): Promise<void> {
        const reports = this.getAllReports();
        reports[sessionId] = report;
        this.setAllReports(reports);
    }

    async getReport(sessionId: string): Promise<SessionReport | null> {
        const reports = this.getAllReports();
        return reports[sessionId] || null;
    }

    async deleteReport(sessionId: string): Promise<void> {
        const reports = this.getAllReports();
        delete reports[sessionId];
        this.setAllReports(reports);
    }

    async getAllReportIds(): Promise<string[]> {
        const reports = this.getAllReports();
        return Object.keys(reports);
    }

    async clearAllReports(): Promise<void> {
        localStorage.removeItem(this.storageKey);
    }
}

/**
 * API-based implementation of the training report storage interface
 * (Placeholder for future implementation)
 */
class ApiReportStorage implements ITrainingReportStorage {
    private readonly baseUrl: string;

    constructor(baseUrl: string = "/api") {
        this.baseUrl = baseUrl;
    }

    async saveReport(sessionId: string, report: SessionReport): Promise<void> {
        const response = await fetch(`${this.baseUrl}/reports/${sessionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(report),
        });

        if (!response.ok) {
            throw new Error(`Failed to save report: ${response.statusText}`);
        }
    }

    async getReport(sessionId: string): Promise<SessionReport | null> {
        const response = await fetch(`${this.baseUrl}/reports/${sessionId}`);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to get report: ${response.statusText}`);
        }

        return response.json();
    }

    async deleteReport(sessionId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/reports/${sessionId}`, {
            method: "DELETE",
        });

        if (!response.ok && response.status !== 404) {
            throw new Error(`Failed to delete report: ${response.statusText}`);
        }
    }

    async getAllReportIds(): Promise<string[]> {
        const response = await fetch(`${this.baseUrl}/reports`);

        if (!response.ok) {
            throw new Error(`Failed to get report IDs: ${response.statusText}`);
        }

        const data = await response.json();
        return data.ids || [];
    }

    async clearAllReports(): Promise<void> {
        const response = await fetch(`${this.baseUrl}/reports`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(`Failed to clear reports: ${response.statusText}`);
        }
    }
}

/**
 * Storage adapter configuration
 * Change this to switch between localStorage and API storage
 */
const USE_API_STORAGE = false; // Set to true to use API storage

/**
 * Get the active storage implementation
 */
function getStorageAdapter(): ITrainingReportStorage {
    if (USE_API_STORAGE) {
        return new ApiReportStorage();
    }
    return new LocalStorageReportStorage();
}

// Singleton instance
let storageInstance: ITrainingReportStorage | null = null;

/**
 * Get the storage instance (singleton pattern)
 */
function getStorage(): ITrainingReportStorage {
    if (!storageInstance) {
        storageInstance = getStorageAdapter();
    }
    return storageInstance;
}

// Public API - these functions delegate to the active storage adapter

/**
 * Save a training report
 * @param sessionId - Unique session identifier
 * @param report - Complete session report data
 * @param saveMetrics - Whether to also save metrics (default: true)
 */
export async function saveTrainingReport(
    sessionId: string,
    report: SessionReport,
    saveMetrics: boolean = true
): Promise<void> {
    // Save the report
    await getStorage().saveReport(sessionId, report);

    // Also save metrics for dashboard analytics
    if (saveMetrics) {
        const { saveMetricsFromReport } =
            await import("./training-metrics-storage");
        await saveMetricsFromReport(report);
    }
}

/**
 * Retrieve a training report by session ID
 * @param sessionId - Unique session identifier
 * @returns Report data or null if not found
 */
export async function getTrainingReport(
    sessionId: string
): Promise<SessionReport | null> {
    return getStorage().getReport(sessionId);
}

/**
 * Delete a training report
 * @param sessionId - Unique session identifier
 * @param deleteMetrics - Whether to also delete metrics (default: true)
 */
export async function deleteTrainingReport(
    sessionId: string,
    deleteMetrics: boolean = true
): Promise<void> {
    await getStorage().deleteReport(sessionId);

    // Also delete associated metrics
    if (deleteMetrics) {
        const { deleteTrainingMetric } =
            await import("./training-metrics-storage");
        await deleteTrainingMetric(sessionId);
    }
}

/**
 * Get all stored report session IDs
 * @returns Array of session IDs that have reports
 */
export async function getAllTrainingReportIds(): Promise<string[]> {
    return getStorage().getAllReportIds();
}

/**
 * Clear all training reports
 * @param clearMetrics - Whether to also clear metrics (default: true)
 */
export async function clearAllTrainingReports(
    clearMetrics: boolean = true
): Promise<void> {
    await getStorage().clearAllReports();

    // Also clear all metrics
    if (clearMetrics) {
        const { clearAllTrainingMetrics } =
            await import("./training-metrics-storage");
        await clearAllTrainingMetrics();
    }
}

/**
 * Check if a report exists for a given session
 * @param sessionId - Unique session identifier
 * @returns True if report exists
 */
export async function hasTrainingReport(sessionId: string): Promise<boolean> {
    const report = await getTrainingReport(sessionId);
    return report !== null;
}
