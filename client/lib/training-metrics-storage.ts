/**
 * Training Metrics Storage Layer
 *
 * Stores aggregated metrics from training sessions for dashboard visualization.
 * Metrics are extracted from training reports and stored in a time-series format
 * for easy charting and trend analysis.
 *
 * Like the report storage, this uses localStorage now but can easily migrate to API.
 */

import type { SessionReport } from "./api";

/**
 * Aggregated metric data point for a single training session
 */
export interface TrainingMetricDataPoint {
    session_id: string;
    timestamp: string; // ISO datetime
    scenario: string;
    difficulty: string;
    duration_seconds: number;

    // Performance scores
    overall_score: number;
    discovery_score: number;
    objection_handling_score: number;
    value_communication_score: number;
    conversation_control_score: number;
    emotional_intelligence_score: number;

    // Conversation metrics
    talk_ratio_rep: number;
    questions_asked: number;
    open_questions: number;
    interruptions: number;

    // Discovery effectiveness
    discovery_completeness: number; // 0-100 based on signals identified

    // Engagement
    trust_change: number;
    commitment_secured: boolean;
}

/**
 * Aggregated statistics across multiple sessions
 */
export interface MetricsAggregate {
    total_sessions: number;
    avg_overall_score: number;
    avg_discovery_score: number;
    avg_objection_score: number;
    avg_value_comm_score: number;
    avg_conversation_control: number;
    avg_emotional_intelligence: number;
    avg_duration_seconds: number;
    avg_questions_asked: number;
    avg_talk_ratio_rep: number;
    performance_distribution: {
        excellent: number; // 80+
        good: number; // 60-79
        needs_improvement: number; // <60
    };
    most_common_strengths: string[];
    most_common_feedback: string[];
}

/**
 * Storage interface for training metrics
 */
interface ITrainingMetricsStorage {
    saveMetric(metric: TrainingMetricDataPoint): Promise<void>;
    getMetric(sessionId: string): Promise<TrainingMetricDataPoint | null>;
    getAllMetrics(): Promise<TrainingMetricDataPoint[]>;
    getMetricsInRange(
        startDate: Date,
        endDate: Date
    ): Promise<TrainingMetricDataPoint[]>;
    deleteMetric(sessionId: string): Promise<void>;
    clearAllMetrics(): Promise<void>;
    getAggregate(): Promise<MetricsAggregate>;
}

/**
 * LocalStorage implementation
 */
class LocalStorageMetricsStorage implements ITrainingMetricsStorage {
    private readonly storageKey = "proxima_training_metrics";
    private readonly strengthsKey = "proxima_training_strengths";
    private readonly feedbackKey = "proxima_training_feedback";

    private getAllMetricsData(): TrainingMetricDataPoint[] {
        if (typeof window === "undefined") return [];

        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return [];

        try {
            return JSON.parse(stored);
        } catch (error) {
            console.error("Failed to parse training metrics:", error);
            return [];
        }
    }

    private setAllMetricsData(metrics: TrainingMetricDataPoint[]): void {
        localStorage.setItem(this.storageKey, JSON.stringify(metrics));
    }

    private saveStrengthsAndFeedback(
        strengths: string[],
        feedback: string[]
    ): void {
        // Append to cumulative lists
        const existingStrengths = this.getAllStrengths();
        const existingFeedback = this.getAllFeedback();

        const updatedStrengths = [...existingStrengths, ...strengths];
        const updatedFeedback = [...existingFeedback, ...feedback];

        localStorage.setItem(
            this.strengthsKey,
            JSON.stringify(updatedStrengths)
        );
        localStorage.setItem(this.feedbackKey, JSON.stringify(updatedFeedback));
    }

    private getAllStrengths(): string[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.strengthsKey);
        return stored ? JSON.parse(stored) : [];
    }

    private getAllFeedback(): string[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.feedbackKey);
        return stored ? JSON.parse(stored) : [];
    }

    async saveMetric(metric: TrainingMetricDataPoint): Promise<void> {
        const metrics = this.getAllMetricsData();

        // Remove existing metric with same session_id if exists
        const filtered = metrics.filter(
            (m) => m.session_id !== metric.session_id
        );

        // Add new metric
        filtered.push(metric);

        // Sort by timestamp (newest first)
        filtered.sort(
            (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
        );

        // Keep last 100 sessions
        const limited = filtered.slice(0, 100);

        this.setAllMetricsData(limited);
    }

    async getMetric(
        sessionId: string
    ): Promise<TrainingMetricDataPoint | null> {
        const metrics = this.getAllMetricsData();
        return metrics.find((m) => m.session_id === sessionId) || null;
    }

    async getAllMetrics(): Promise<TrainingMetricDataPoint[]> {
        return this.getAllMetricsData();
    }

    async getMetricsInRange(
        startDate: Date,
        endDate: Date
    ): Promise<TrainingMetricDataPoint[]> {
        const metrics = this.getAllMetricsData();
        return metrics.filter((m) => {
            const timestamp = new Date(m.timestamp);
            return timestamp >= startDate && timestamp <= endDate;
        });
    }

    async deleteMetric(sessionId: string): Promise<void> {
        const metrics = this.getAllMetricsData();
        const filtered = metrics.filter((m) => m.session_id !== sessionId);
        this.setAllMetricsData(filtered);
    }

    async clearAllMetrics(): Promise<void> {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.strengthsKey);
        localStorage.removeItem(this.feedbackKey);
    }

    async getAggregate(): Promise<MetricsAggregate> {
        const metrics = this.getAllMetricsData();

        if (metrics.length === 0) {
            return {
                total_sessions: 0,
                avg_overall_score: 0,
                avg_discovery_score: 0,
                avg_objection_score: 0,
                avg_value_comm_score: 0,
                avg_conversation_control: 0,
                avg_emotional_intelligence: 0,
                avg_duration_seconds: 0,
                avg_questions_asked: 0,
                avg_talk_ratio_rep: 0,
                performance_distribution: {
                    excellent: 0,
                    good: 0,
                    needs_improvement: 0,
                },
                most_common_strengths: [],
                most_common_feedback: [],
            };
        }

        const sum = metrics.reduce(
            (acc, m) => ({
                overall_score: acc.overall_score + m.overall_score,
                discovery_score: acc.discovery_score + m.discovery_score,
                objection_score:
                    acc.objection_score + m.objection_handling_score,
                value_comm_score:
                    acc.value_comm_score + m.value_communication_score,
                conversation_control:
                    acc.conversation_control + m.conversation_control_score,
                emotional_intelligence:
                    acc.emotional_intelligence + m.emotional_intelligence_score,
                duration: acc.duration + m.duration_seconds,
                questions: acc.questions + m.questions_asked,
                talk_ratio: acc.talk_ratio + m.talk_ratio_rep,
            }),
            {
                overall_score: 0,
                discovery_score: 0,
                objection_score: 0,
                value_comm_score: 0,
                conversation_control: 0,
                emotional_intelligence: 0,
                duration: 0,
                questions: 0,
                talk_ratio: 0,
            }
        );

        const count = metrics.length;

        // Performance distribution
        const distribution = metrics.reduce(
            (acc, m) => {
                if (m.overall_score >= 80) acc.excellent++;
                else if (m.overall_score >= 60) acc.good++;
                else acc.needs_improvement++;
                return acc;
            },
            { excellent: 0, good: 0, needs_improvement: 0 }
        );

        // Get most common strengths and feedback
        const strengths = this.getAllStrengths();
        const feedback = this.getAllFeedback();

        const strengthCounts = this.getTopItems(strengths, 5);
        const feedbackCounts = this.getTopItems(feedback, 5);

        return {
            total_sessions: count,
            avg_overall_score: Math.round(sum.overall_score / count),
            avg_discovery_score: Math.round(sum.discovery_score / count),
            avg_objection_score: Math.round(sum.objection_score / count),
            avg_value_comm_score: Math.round(sum.value_comm_score / count),
            avg_conversation_control: Math.round(
                sum.conversation_control / count
            ),
            avg_emotional_intelligence: Math.round(
                sum.emotional_intelligence / count
            ),
            avg_duration_seconds: Math.round(sum.duration / count),
            avg_questions_asked: Math.round(sum.questions / count),
            avg_talk_ratio_rep:
                Math.round((sum.talk_ratio / count) * 100) / 100,
            performance_distribution: distribution,
            most_common_strengths: strengthCounts,
            most_common_feedback: feedbackCounts,
        };
    }

    private getTopItems(items: string[], topN: number): string[] {
        const counts = new Map<string, number>();

        items.forEach((item) => {
            counts.set(item, (counts.get(item) || 0) + 1);
        });

        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([item]) => item);
    }
}

/**
 * API-based implementation (placeholder for future)
 */
class ApiMetricsStorage implements ITrainingMetricsStorage {
    private readonly baseUrl: string;

    constructor(baseUrl: string = "/api") {
        this.baseUrl = baseUrl;
    }

    async saveMetric(metric: TrainingMetricDataPoint): Promise<void> {
        const response = await fetch(`${this.baseUrl}/metrics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metric),
        });

        if (!response.ok) {
            throw new Error(`Failed to save metric: ${response.statusText}`);
        }
    }

    async getMetric(
        sessionId: string
    ): Promise<TrainingMetricDataPoint | null> {
        const response = await fetch(`${this.baseUrl}/metrics/${sessionId}`);

        if (response.status === 404) return null;

        if (!response.ok) {
            throw new Error(`Failed to get metric: ${response.statusText}`);
        }

        return response.json();
    }

    async getAllMetrics(): Promise<TrainingMetricDataPoint[]> {
        const response = await fetch(`${this.baseUrl}/metrics`);

        if (!response.ok) {
            throw new Error(`Failed to get metrics: ${response.statusText}`);
        }

        return response.json();
    }

    async getMetricsInRange(
        startDate: Date,
        endDate: Date
    ): Promise<TrainingMetricDataPoint[]> {
        const params = new URLSearchParams({
            start: startDate.toISOString(),
            end: endDate.toISOString(),
        });

        const response = await fetch(
            `${this.baseUrl}/metrics?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(`Failed to get metrics: ${response.statusText}`);
        }

        return response.json();
    }

    async deleteMetric(sessionId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/metrics/${sessionId}`, {
            method: "DELETE",
        });

        if (!response.ok && response.status !== 404) {
            throw new Error(`Failed to delete metric: ${response.statusText}`);
        }
    }

    async clearAllMetrics(): Promise<void> {
        const response = await fetch(`${this.baseUrl}/metrics`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(`Failed to clear metrics: ${response.statusText}`);
        }
    }

    async getAggregate(): Promise<MetricsAggregate> {
        const response = await fetch(`${this.baseUrl}/metrics/aggregate`);

        if (!response.ok) {
            throw new Error(`Failed to get aggregate: ${response.statusText}`);
        }

        return response.json();
    }
}

// Configuration
const USE_API_STORAGE = false;

function getStorageAdapter(): ITrainingMetricsStorage {
    if (USE_API_STORAGE) {
        return new ApiMetricsStorage();
    }
    return new LocalStorageMetricsStorage();
}

let storageInstance: ITrainingMetricsStorage | null = null;

function getStorage(): ITrainingMetricsStorage {
    if (!storageInstance) {
        storageInstance = getStorageAdapter();
    }
    return storageInstance;
}

// Public API

/**
 * Extract metrics from a SessionReport
 */
export function extractMetricsFromReport(
    report: SessionReport
): TrainingMetricDataPoint {
    // Calculate discovery completeness (0-100)
    const discoverySignals = [
        report.discovery_signals.pain_identified,
        report.discovery_signals.current_tools_identified,
        report.discovery_signals.budget_discussed,
        report.discovery_signals.decision_process_identified,
        report.discovery_signals.timeline_discussed !== "none",
    ];
    const discoveryCompleteness =
        (discoverySignals.filter(Boolean).length / discoverySignals.length) *
        100;

    return {
        session_id: report.session_overview.session_id,
        timestamp: report.session_overview.session_start_time,
        scenario: report.session_overview.scenario,
        difficulty: report.session_overview.difficulty,
        duration_seconds: report.session_overview.session_duration_seconds,
        overall_score: report.overall_score.score,
        discovery_score: report.overall_score.breakdown.discovery,
        objection_handling_score:
            report.overall_score.breakdown.objection_handling,
        value_communication_score:
            report.overall_score.breakdown.value_communication,
        conversation_control_score:
            report.overall_score.breakdown.conversation_control,
        emotional_intelligence_score:
            report.overall_score.breakdown.emotional_intelligence,
        talk_ratio_rep: report.conversation_metrics.talk_ratio_rep,
        questions_asked: report.conversation_metrics.questions_asked,
        open_questions: report.conversation_metrics.open_questions,
        interruptions: report.conversation_metrics.interruptions,
        discovery_completeness: Math.round(discoveryCompleteness),
        trust_change: report.prospect_engagement.trust_change,
        commitment_secured: report.deal_progression.commitment_secured,
    };
}

/**
 * Save a metric data point
 */
export async function saveTrainingMetric(
    metric: TrainingMetricDataPoint
): Promise<void> {
    return getStorage().saveMetric(metric);
}

/**
 * Save metrics extracted from a report
 * This should be called whenever a report is saved
 */
export async function saveMetricsFromReport(
    report: SessionReport
): Promise<void> {
    const metric = extractMetricsFromReport(report);
    await saveTrainingMetric(metric);

    // Also save strengths and feedback for aggregation
    const storage = getStorage();
    if (storage instanceof LocalStorageMetricsStorage) {
        (storage as any).saveStrengthsAndFeedback(
            report.strengths,
            report.top_feedback
        );
    }
}

/**
 * Get a specific metric
 */
export async function getTrainingMetric(
    sessionId: string
): Promise<TrainingMetricDataPoint | null> {
    return getStorage().getMetric(sessionId);
}

/**
 * Get all metrics
 */
export async function getAllTrainingMetrics(): Promise<
    TrainingMetricDataPoint[]
> {
    return getStorage().getAllMetrics();
}

/**
 * Get metrics within a date range
 */
export async function getTrainingMetricsInRange(
    startDate: Date,
    endDate: Date
): Promise<TrainingMetricDataPoint[]> {
    return getStorage().getMetricsInRange(startDate, endDate);
}

/**
 * Get metrics for the last N days
 */
export async function getRecentTrainingMetrics(
    days: number = 30
): Promise<TrainingMetricDataPoint[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return getTrainingMetricsInRange(startDate, endDate);
}

/**
 * Delete a metric
 */
export async function deleteTrainingMetric(sessionId: string): Promise<void> {
    return getStorage().deleteMetric(sessionId);
}

/**
 * Clear all metrics
 */
export async function clearAllTrainingMetrics(): Promise<void> {
    return getStorage().clearAllMetrics();
}

/**
 * Get aggregated statistics
 */
export async function getTrainingMetricsAggregate(): Promise<MetricsAggregate> {
    return getStorage().getAggregate();
}

/**
 * Get performance trend (compare recent vs older sessions)
 */
export async function getPerformanceTrend(
    recentDays: number = 7,
    comparisonDays: number = 30
): Promise<{
    recent_avg: number;
    comparison_avg: number;
    trend: "improving" | "declining" | "stable";
    change_percent: number;
}> {
    const allMetrics = await getAllTrainingMetrics();

    if (allMetrics.length === 0) {
        return {
            recent_avg: 0,
            comparison_avg: 0,
            trend: "stable",
            change_percent: 0,
        };
    }

    const now = new Date();
    const recentCutoff = new Date(
        now.getTime() - recentDays * 24 * 60 * 60 * 1000
    );
    const comparisonCutoff = new Date(
        now.getTime() - comparisonDays * 24 * 60 * 60 * 1000
    );

    const recentMetrics = allMetrics.filter(
        (m) => new Date(m.timestamp) >= recentCutoff
    );
    const comparisonMetrics = allMetrics.filter(
        (m) =>
            new Date(m.timestamp) >= comparisonCutoff &&
            new Date(m.timestamp) < recentCutoff
    );

    const recentAvg =
        recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.overall_score, 0) /
              recentMetrics.length
            : 0;

    const comparisonAvg =
        comparisonMetrics.length > 0
            ? comparisonMetrics.reduce((sum, m) => sum + m.overall_score, 0) /
              comparisonMetrics.length
            : recentAvg;

    const changePercent =
        comparisonAvg > 0
            ? ((recentAvg - comparisonAvg) / comparisonAvg) * 100
            : 0;

    let trend: "improving" | "declining" | "stable" = "stable";
    if (changePercent > 5) trend = "improving";
    else if (changePercent < -5) trend = "declining";

    return {
        recent_avg: Math.round(recentAvg),
        comparison_avg: Math.round(comparisonAvg),
        trend,
        change_percent: Math.round(changePercent * 10) / 10,
    };
}
