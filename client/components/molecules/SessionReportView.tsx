"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { TrendBadge } from "@/components/atoms/TrendBadge";
import { AppPageHeader } from "@/components/molecules/AppPageHeader";
import { MiniTrendChart } from "@/components/molecules/MiniTrendChart";
import { SessionMetricCard } from "@/components/molecules/SessionMetricCard";
import { SummaryMetricCard } from "@/components/molecules/SummaryMetricCard";
import { generateSessionReport, type SessionReport } from "@/lib/api";
import { buildLineAndAreaPaths, getTrendVisual } from "@/lib/trend-chart";
import { getTrainingReport } from "@/lib/training-report-storage";

type SessionReportViewProps = {
    sessionId: string | null;
};

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function SessionReportView({ sessionId }: SessionReportViewProps) {
    const router = useRouter();
    const [report, setReport] = useState<SessionReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasFetchedRef = useRef(false);

    const confidenceTrendData = useMemo(() => {
        if (!report) {
            return [] as number[];
        }

        const breakdown = report.overall_score.breakdown;
        return [
            clamp((breakdown.discovery - 6) / 10, 0, 10),
            clamp(breakdown.discovery / 10, 0, 10),
            clamp(breakdown.conversation_control / 10, 0, 10),
            clamp(breakdown.objection_handling / 10, 0, 10),
            clamp(breakdown.value_communication / 10, 0, 10),
            clamp(breakdown.emotional_intelligence / 10, 0, 10),
            clamp(report.overall_score.score / 10, 0, 10),
        ];
    }, [report]);

    const sentimentTrendData = useMemo(() => {
        if (!report) {
            return [] as number[];
        }

        const trustDelta = report.prospect_engagement.trust_change;
        const baseline = clamp(2 + trustDelta * 0.4, 1, 3);

        return [
            clamp(baseline - trustDelta * 1.5 - 0.25, 1, 3),
            clamp(baseline - trustDelta * 1.0 - 0.15, 1, 3),
            clamp(baseline - trustDelta * 0.6 - 0.08, 1, 3),
            clamp(baseline, 1, 3),
            clamp(baseline + trustDelta * 0.6 + 0.08, 1, 3),
            clamp(baseline + trustDelta * 1.0 + 0.15, 1, 3),
            clamp(2 + trustDelta * 1.6, 1, 3),
        ];
    }, [report]);

    const confidenceLinePoints = useMemo(
        () => buildLineAndAreaPaths(confidenceTrendData, 0, 10),
        [confidenceTrendData]
    );

    const sentimentLinePoints = useMemo(
        () => buildLineAndAreaPaths(sentimentTrendData, 1, 3),
        [sentimentTrendData]
    );

    const confidenceTrend = useMemo(
        () => getTrendVisual(confidenceTrendData, 0.05),
        [confidenceTrendData]
    );

    const sentimentTrend = useMemo(
        () => getTrendVisual(sentimentTrendData, 0.1),
        [sentimentTrendData]
    );

    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }
        hasFetchedRef.current = true;

        if (!sessionId) {
            setError("Missing session id");
            setIsLoading(false);
            return;
        }

        const loadReport = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const cachedReport = await getTrainingReport(sessionId);
                if (cachedReport) {
                    setReport(cachedReport);
                    setIsLoading(false);
                    return;
                }

                const data = await generateSessionReport(sessionId);
                setReport(data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load session report"
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadReport();
    }, [sessionId]);

    if (isLoading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-border-subtle border-t-primary mb-4" />
                    <p className="text-text-muted">
                        Loading performance report...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex-1 p-8">
                <div className="max-w-2xl mt-8 p-6 bg-danger/10 border border-danger/20 rounded-xl">
                    <p className="text-danger">{error || "Report not found"}</p>
                    <div className="mt-6">
                        <Button
                            variant="primary"
                            onClick={() =>
                                router.push("/training/context-builder")
                            }
                        >
                            Back to Training
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const confidence = report.overall_score.score;
    const sentiment = Math.max(
        0,
        Math.round((report.prospect_engagement.trust_change + 1) * 50)
    );
    const duration = `${Math.floor(report.session_overview.session_duration_seconds / 60)}m ${report.session_overview.session_duration_seconds % 60}s`;

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-surface-base">
            <AppPageHeader title="Session Report" />

            <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
                <section className="bg-surface-panel rounded-2xl border border-border-subtle px-5 py-4">
                    <div className="flex flex-wrap items-center gap-4 text-text-muted">
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px]">
                                person
                            </span>
                            <span>
                                Rehearsal with{" "}
                                <span className="text-text-main font-medium">
                                    {report.session_overview.prospect_persona}
                                </span>
                            </span>
                        </div>
                        <div className="w-1 h-1 bg-border-subtle rounded-full" />
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px]">
                                calendar_today
                            </span>
                            <span>
                                {new Date(
                                    report.session_overview.session_start_time
                                ).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </section>

                <section
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
                    data-purpose="metrics-grid"
                >
                    <SessionMetricCard
                        label="Duration"
                        value={duration}
                        note="Optimized"
                    />
                    <SessionMetricCard
                        label="Confidence"
                        value={`${confidence}%`}
                    />
                    <SessionMetricCard
                        label="Sentiment"
                        value={`${sentiment}%`}
                        note="Positive Bias"
                    />
                    <SessionMetricCard
                        label="Script Adherence"
                        value={`${report.overall_score.breakdown.value_communication}%`}
                    />
                    <SessionMetricCard
                        label="Objections"
                        value={`${report.objection_handling.objections_detected}`}
                        note="Neutralized"
                    />
                    <SessionMetricCard
                        label="Talk Ratio"
                        value={`${Math.round(report.conversation_metrics.talk_ratio_rep * 100)}:${Math.round(report.conversation_metrics.talk_ratio_prospect * 100)}`}
                        note="Balanced"
                    />
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                    <SummaryMetricCard
                        title="Confidence Trend"
                        indicator={
                            <TrendBadge
                                direction={confidenceTrend.direction}
                                value={confidenceTrend.value}
                                suffix="/10"
                            />
                        }
                    >
                        <MiniTrendChart
                            yAxisLabels={[
                                "3 sessions",
                                "2 sessions",
                                "1 session",
                            ]}
                            linePath={confidenceLinePoints.linePath}
                            areaPath={confidenceLinePoints.areaPath}
                            lineColorClass={confidenceTrend.lineClass}
                            areaColorClass={confidenceTrend.fillClass}
                            xAxisLabels={[
                                "Start",
                                "D",
                                "C",
                                "O",
                                "V",
                                "E",
                                "Final",
                            ]}
                            valueLabels={confidenceTrendData.map((value) =>
                                value.toFixed(1)
                            )}
                        />
                    </SummaryMetricCard>

                    <SummaryMetricCard
                        title="Sentiment Fluctuation"
                        indicator={
                            <TrendBadge
                                direction={sentimentTrend.direction}
                                value={sentimentTrend.value}
                            />
                        }
                    >
                        <MiniTrendChart
                            yAxisLabels={[
                                "3 sessions",
                                "2 sessions",
                                "1 session",
                            ]}
                            linePath={sentimentLinePoints.linePath}
                            areaPath={sentimentLinePoints.areaPath}
                            lineColorClass={sentimentTrend.lineClass}
                            areaColorClass={sentimentTrend.fillClass}
                            xAxisLabels={[
                                "Kickoff",
                                "Early",
                                "Mid",
                                "Pivot",
                                "Late",
                                "Close",
                                "End",
                            ]}
                            valueLabels={sentimentTrendData.map((value) =>
                                value.toFixed(1)
                            )}
                        />
                    </SummaryMetricCard>
                </section>

                <section className="grid grid-cols-1 gap-6 pb-12">
                    <div className="bg-surface-panel p-6 rounded-2xl border border-border-subtle">
                        <div className="flex items-center gap-2 mb-5">
                            <span className="material-symbols-outlined text-success">
                                verified
                            </span>
                            <h3 className="font-bold text-white">
                                AI Insights
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {report.strengths.map((strength, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-xl border border-border-subtle bg-surface-hover/35 px-4 py-3"
                                >
                                    <div className="flex items-center gap-2 text-sm font-bold text-text-main mb-1">
                                        <span className="material-symbols-outlined text-[16px] text-success">
                                            check_circle
                                        </span>
                                        Insight {idx + 1}
                                    </div>
                                    <p className="text-sm text-text-muted leading-relaxed pl-6">
                                        {strength}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-surface-panel p-6 rounded-2xl border border-border-subtle">
                        <div className="flex items-center gap-2 mb-5">
                            <span className="material-symbols-outlined text-warning">
                                trending_up
                            </span>
                            <h3 className="font-bold text-white">
                                Improvement Areas
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {report.top_feedback.map((feedback, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3"
                                >
                                    <div className="text-sm font-bold text-text-main mb-1">
                                        Practice Point {idx + 1}
                                    </div>
                                    <p className="text-sm text-text-muted leading-relaxed">
                                        {feedback}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
