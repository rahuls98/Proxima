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
            clamp(breakdown.discovery / 10, 0, 10),
            clamp(breakdown.conversation_control / 10, 0, 10),
            clamp(breakdown.objection_handling / 10, 0, 10),
            clamp(breakdown.emotional_intelligence / 10, 0, 10),
            clamp(report.overall_score.score / 10, 0, 10),
        ];
    }, [report]);

    const sentimentTrendData = useMemo(() => {
        if (!report) {
            return [] as number[];
        }

        const trustDelta = report.prospect_engagement.trust_change;
        const talkDelta = clamp(
            (report.conversation_metrics.talk_ratio_rep - 0.5) * 1.5,
            -0.5,
            0.5
        );
        const baseline = clamp(2 + trustDelta * 0.5, 1, 3);

        return [
            clamp(baseline - 0.3, 1, 3),
            clamp(baseline + talkDelta * 0.4, 1, 3),
            clamp(baseline + talkDelta, 1, 3),
            clamp(baseline + trustDelta * 0.3, 1, 3),
            clamp(baseline + trustDelta * 0.7, 1, 3),
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

    const formatTimestamp = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainder = Math.max(0, seconds % 60);
        return `${minutes.toString().padStart(2, "0")}:${remainder
            .toString()
            .padStart(2, "0")}`;
    };

    const trendTimeLabels = useMemo(() => {
        if (!report) {
            return [] as string[];
        }
        const totalSeconds =
            report.session_overview.session_duration_seconds || 0;
        const buckets = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
            Math.round(totalSeconds * ratio)
        );
        return buckets.map((seconds) => formatTimestamp(seconds));
    }, [report]);

    const keyMoments = useMemo(() => {
        if (!report) {
            return [] as {
                timestamp_seconds: number;
                title: string;
                speaker?: string;
                utterance?: string;
                description?: string;
            }[];
        }

        if (report.key_moments && report.key_moments.length > 0) {
            return report.key_moments;
        }

        const fallback = [];
        if (report.strengths[0]) {
            fallback.push({
                timestamp_seconds: 0,
                title: "Early momentum",
                utterance: report.strengths[0],
            });
        }
        if (report.top_feedback[0]) {
            fallback.push({
                timestamp_seconds: 120,
                title: "Mid-session opportunity",
                utterance: report.top_feedback[0],
            });
        }
        if (report.practice_recommendations?.recommended_exercise) {
            fallback.push({
                timestamp_seconds: 300,
                title: "Closing opportunity",
                utterance: report.practice_recommendations.recommended_exercise,
            });
        }
        return fallback;
    }, [report]);

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

        const isGenericReport = (candidate: SessionReport) => {
            const strengths = candidate.strengths || [];
            const feedback = candidate.top_feedback || [];
            const keyMoments = candidate.key_moments || [];
            const genericStrengths = strengths.some((item) =>
                item.toLowerCase().includes("steady discovery cadence")
            );
            const genericFeedback = feedback.some((item) =>
                item.toLowerCase().includes("open-ended questions")
            );
            const genericMoments = keyMoments.some((moment) =>
                (moment.title || "").toLowerCase().includes("early momentum")
            );
            return genericStrengths || genericFeedback || genericMoments;
        };

        const isPlaceholderReport = (candidate: SessionReport) => {
            const score = candidate.overall_score?.score ?? 0;
            const performanceLevel =
                candidate.overall_score?.performance_level?.toLowerCase() || "";
            const noInsights =
                (candidate.strengths?.length ?? 0) === 0 &&
                (candidate.top_feedback?.length ?? 0) === 0;
            return (
                score === 0 && performanceLevel === "unavailable" && noInsights
            );
        };

        const loadReport = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const cachedReport = await getTrainingReport(sessionId);
                if (
                    cachedReport &&
                    !isGenericReport(cachedReport) &&
                    !isPlaceholderReport(cachedReport)
                ) {
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
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                    data-purpose="metrics-grid"
                >
                    <SessionMetricCard
                        label="Duration"
                        value={duration}
                        description="Total recorded session length."
                    />
                    <SessionMetricCard
                        label="Confidence"
                        value={`${confidence}%`}
                        description="Overall performance score for this session."
                    />
                    <SessionMetricCard
                        label="Sentiment"
                        value={`${sentiment}%`}
                        description="Prospect sentiment converted to a 0–100 scale."
                    />
                    <SessionMetricCard
                        label="Objections"
                        value={`${report.objection_handling.objections_detected}`}
                        description="Count of objections detected in the transcript."
                    />
                    <SessionMetricCard
                        label="Talk Ratio"
                        value={`${Math.round(report.conversation_metrics.talk_ratio_rep * 100)}:${Math.round(report.conversation_metrics.talk_ratio_prospect * 100)}`}
                        description="Rep vs prospect share of talk time."
                    />
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                    <SummaryMetricCard
                        title="Confidence Trend"
                        description="How confidence shifts across the session."
                        indicator={
                            <TrendBadge
                                direction={confidenceTrend.direction}
                                value={confidenceTrend.value}
                                suffix=""
                            />
                        }
                    >
                        <MiniTrendChart
                            yAxisLabels={["10", "5", "0"]}
                            linePath={confidenceLinePoints.linePath}
                            areaPath={confidenceLinePoints.areaPath}
                            lineColorClass={confidenceTrend.lineClass}
                            areaColorClass={confidenceTrend.fillClass}
                            xAxisLabels={trendTimeLabels}
                            valueLabels={confidenceTrendData.map((value) =>
                                value.toFixed(1)
                            )}
                        />
                    </SummaryMetricCard>

                    <SummaryMetricCard
                        title="Sentiment Fluctuation"
                        description="Prospect sentiment swings throughout the call."
                        indicator={
                            <TrendBadge
                                direction={sentimentTrend.direction}
                                value={sentimentTrend.value}
                            />
                        }
                    >
                        <MiniTrendChart
                            yAxisLabels={[
                                "Satisfied",
                                "Neutral",
                                "Dissatisfied",
                            ]}
                            linePath={sentimentLinePoints.linePath}
                            areaPath={sentimentLinePoints.areaPath}
                            lineColorClass={sentimentTrend.lineClass}
                            areaColorClass={sentimentTrend.fillClass}
                            xAxisLabels={trendTimeLabels}
                            valueLabels={sentimentTrendData.map((value) =>
                                value.toFixed(1)
                            )}
                        />
                    </SummaryMetricCard>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                    <div className="lg:col-span-1 space-y-6">
                        <h2 className="text-xl font-bold text-white mb-2">
                            Key Moments
                        </h2>
                        <div className="relative space-y-8 pl-8 border-l border-border-subtle ml-2">
                            {keyMoments.map((moment, idx) => (
                                <div
                                    key={`${moment.title}-${idx}`}
                                    className="relative"
                                >
                                    <div
                                        className={`absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-surface-base border-2 ${
                                            idx === 0
                                                ? "border-primary"
                                                : "border-border-subtle"
                                        } flex items-center justify-center`}
                                    >
                                        <div
                                            className={`w-1 h-1 rounded-full ${
                                                idx === 0
                                                    ? "bg-primary"
                                                    : "bg-border-subtle"
                                            }`}
                                        />
                                    </div>
                                    <div className="text-sm font-bold text-text-main mb-1">
                                        {formatTimestamp(
                                            moment.timestamp_seconds
                                        )}{" "}
                                        - {moment.title}
                                    </div>
                                    <p className="text-sm text-text-muted leading-relaxed">
                                        {moment.speaker ? (
                                            <span className="text-text-main font-semibold">
                                                {moment.speaker}:
                                            </span>
                                        ) : null}{" "}
                                        {moment.utterance || moment.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-surface-panel p-6 rounded-2xl border border-border-subtle">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-success">
                                    psychology
                                </span>
                                <h3 className="font-bold text-white">
                                    AI Insights
                                </h3>
                            </div>
                            <div className="divide-y divide-border-subtle">
                                {[
                                    ...report.strengths.map((text) => ({
                                        type: "Strength",
                                        tone: "text-success",
                                        text,
                                    })),
                                    ...report.top_feedback.map((text) => ({
                                        type: "Improve",
                                        tone: "text-warning",
                                        text,
                                    })),
                                ].map((item, idx) => (
                                    <div
                                        key={`${item.type}-${idx}`}
                                        className="py-4 first:pt-0 last:pb-0"
                                    >
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-muted">
                                            <span
                                                className={`material-symbols-outlined text-[16px] ${item.tone}`}
                                            >
                                                {item.type === "Strength"
                                                    ? "verified"
                                                    : "trending_up"}
                                            </span>
                                            {item.type}
                                        </div>
                                        <p className="text-sm text-text-muted leading-relaxed mt-2">
                                            {item.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
