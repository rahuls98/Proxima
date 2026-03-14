/**
 * Development Utilities for Training Reports
 *
 * Helper functions for testing and development of the training report feature.
 * These utilities help populate test data and debug the report system.
 */

import {
    generateMockReport,
    generateHighScoreMockReport,
    generateLowScoreMockReport,
} from "./mock-report-generator";
import { saveTrainingReport } from "./training-report-storage";
import { saveTrainingSession } from "./training-history";
import type { TrainingSession } from "./training-history";

/**
 * Seed the storage with sample training reports
 * Useful for populating UI during development
 */
export async function seedMockReports(): Promise<void> {
    // Average performance report
    const avgReport = generateMockReport("sess_avg_001");
    const avgSession: TrainingSession = {
        id: "sess_avg_001",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        transcriptLength: 24,
        personaName: "Jennifer Martinez",
        jobTitle: "VP Marketing - B2B SaaS",
        duration: "18m 42s",
        scenario: "Discovery Call – Marketing Automation",
    };

    // High performance report
    const highReport = generateHighScoreMockReport("sess_high_002");
    const highSession: TrainingSession = {
        id: "sess_high_002",
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        transcriptLength: 38,
        personaName: "David Chen",
        jobTitle: "Chief Revenue Officer - Enterprise",
        duration: "30m 45s",
        scenario: "Enterprise Demo – Sales CRM",
    };

    // Low performance report
    const lowReport = generateLowScoreMockReport("sess_low_003");
    const lowSession: TrainingSession = {
        id: "sess_low_003",
        timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        transcriptLength: 12,
        personaName: "Mike Johnson",
        jobTitle: "Small Business Owner - Retail",
        duration: "7m 00s",
        scenario: "Cold Call – Small Business",
    };

    // Save all reports and sessions
    await saveTrainingReport(avgReport.session_overview.session_id, avgReport);
    saveTrainingSession(avgSession);

    await saveTrainingReport(
        highReport.session_overview.session_id,
        highReport
    );
    saveTrainingSession(highSession);

    await saveTrainingReport(lowReport.session_overview.session_id, lowReport);
    saveTrainingSession(lowSession);

    console.log("✅ Seeded 3 mock training reports");
    console.log("   - Average performance: sess_avg_001");
    console.log("   - High performance: sess_high_002");
    console.log("   - Low performance: sess_low_003");
}

/**
 * Clear all mock data from storage
 */
export async function clearMockData(): Promise<void> {
    const { clearAllTrainingReports } =
        await import("./training-report-storage");
    const { clearTrainingHistory } = await import("./training-history");

    await clearAllTrainingReports();
    clearTrainingHistory();

    console.log("🗑️  Cleared all mock training data");
}

/**
 * Get direct links to view the mock reports
 */
export function getMockReportLinks(): string[] {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return [
        `${baseUrl}/training/sess_avg_001/report`,
        `${baseUrl}/training/sess_high_002/report`,
        `${baseUrl}/training/sess_low_003/report`,
    ];
}

/**
 * Log helpful development info to console
 */
export function logDevHelp(): void {
    console.log("\n📊 Training Report Dev Utilities\n");
    console.log("Seed mock data:");
    console.log("  import { seedMockReports } from '@/lib/dev-utils'");
    console.log("  seedMockReports()");
    console.log("\nSeed historical data:");
    console.log("  import { seedHistoricalData } from '@/lib/dev-utils'");
    console.log("  seedHistoricalData(30) // 30 days");
    console.log("\nView metrics:");
    console.log("  import { viewMetricsAggregate } from '@/lib/dev-utils'");
    console.log("  viewMetricsAggregate()");
    console.log("\nClear mock data:");
    console.log("  import { clearMockData } from '@/lib/dev-utils'");
    console.log("  clearMockData()");
    console.log("\nView reports:");
    console.log("  /training/sess_avg_001/report");
    console.log("  /training/sess_high_002/report");
    console.log("  /training/sess_low_003/report\n");
}

/**
 * Seed historical training data for testing charts
 */
export async function seedHistoricalData(days: number = 30): Promise<void> {
    const sessions: TrainingSession[] = [];
    const now = Date.now();

    for (let i = 0; i < days; i++) {
        const sessionTimestamp = now - i * 24 * 60 * 60 * 1000; // Go back in time
        const sessionId = `sess_hist_${i.toString().padStart(3, "0")}`;

        // Vary the report type
        let report;
        const rand = Math.random();
        if (rand < 0.3) {
            report = generateLowScoreMockReport(sessionId);
        } else if (rand < 0.7) {
            report = generateMockReport(sessionId);
        } else {
            report = generateHighScoreMockReport(sessionId);
        }

        // Override timestamp
        report.session_overview.session_start_time = new Date(
            sessionTimestamp
        ).toISOString();

        const session: TrainingSession = {
            id: sessionId,
            timestamp: new Date(sessionTimestamp).toISOString(),
            transcriptLength: Math.floor(Math.random() * 30) + 10,
            personaName: `Mock Persona ${i}`,
            jobTitle: report.session_overview.prospect_persona,
            duration: `${Math.floor(Math.random() * 20) + 5}m ${Math.floor(Math.random() * 60)}s`,
            scenario: report.session_overview.scenario,
        };

        // Save report (which also saves metrics)
        await saveTrainingReport(sessionId, report);
        saveTrainingSession(session);

        sessions.push(session);
    }

    console.log(`✅ Seeded ${days} days of historical training data`);
    console.log(`   Total sessions: ${sessions.length}`);
    console.log(
        `   Date range: ${new Date(sessions[sessions.length - 1].timestamp).toLocaleDateString()} to ${new Date(sessions[0].timestamp).toLocaleDateString()}`
    );
}

/**
 * View metrics aggregate in console
 */
export async function viewMetricsAggregate(): Promise<void> {
    const { getTrainingMetricsAggregate, getPerformanceTrend } =
        await import("./training-metrics-storage");

    const aggregate = await getTrainingMetricsAggregate();
    const trend = await getPerformanceTrend(7, 30);

    console.log("\n📊 Training Metrics Aggregate\n");
    console.log("Overall Stats:");
    console.log(`  Total Sessions: ${aggregate.total_sessions}`);
    console.log(`  Avg Overall Score: ${aggregate.avg_overall_score}/100`);
    console.log(`  Avg Discovery: ${aggregate.avg_discovery_score}/100`);
    console.log(
        `  Avg Objection Handling: ${aggregate.avg_objection_score}/100`
    );
    console.log(
        `  Avg Value Communication: ${aggregate.avg_value_comm_score}/100`
    );
    console.log(
        `  Avg Talk Ratio (Rep): ${(aggregate.avg_talk_ratio_rep * 100).toFixed(0)}%`
    );
    console.log(`  Avg Questions Asked: ${aggregate.avg_questions_asked}`);

    console.log("\nPerformance Distribution:");
    console.log(
        `  Excellent (80+): ${aggregate.performance_distribution.excellent}`
    );
    console.log(`  Good (60-79): ${aggregate.performance_distribution.good}`);
    console.log(
        `  Needs Improvement (<60): ${aggregate.performance_distribution.needs_improvement}`
    );

    console.log("\nPerformance Trend:");
    console.log(`  Recent Avg (7 days): ${trend.recent_avg}`);
    console.log(`  Comparison Avg (30 days): ${trend.comparison_avg}`);
    console.log(
        `  Trend: ${trend.trend} (${trend.change_percent > 0 ? "+" : ""}${trend.change_percent}%)`
    );

    if (aggregate.most_common_strengths.length > 0) {
        console.log("\nMost Common Strengths:");
        aggregate.most_common_strengths.forEach((s, i) =>
            console.log(`  ${i + 1}. ${s}`)
        );
    }

    if (aggregate.most_common_feedback.length > 0) {
        console.log("\nMost Common Feedback:");
        aggregate.most_common_feedback.forEach((f, i) =>
            console.log(`  ${i + 1}. ${f}`)
        );
    }

    console.log("\n");
}

// Browser-only helper
if (typeof window !== "undefined") {
    // Make utilities available in console for quick testing
    (window as any).trainingDevUtils = {
        seedMockReports,
        seedHistoricalData,
        viewMetricsAggregate,
        clearMockData,
        getMockReportLinks,
        logDevHelp,
    };
}
