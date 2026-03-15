"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    getAllTrainingMetrics,
    getTrainingMetricsAggregate,
    type MetricsAggregate,
    type TrainingMetricDataPoint,
} from "@/lib/training-metrics-storage";
import {
    getTrainingHistory,
    type TrainingSession,
} from "@/lib/training-history";
import {
    getSavedPersonas,
    togglePersonaPriority,
    type SavedPersona,
} from "@/lib/persona-storage";
import { DUMMY_PERSONA_IMAGES } from "@/lib/ui-dummy-data";
import { TrendBadge } from "@/components/atoms/TrendBadge";
import { SectionHeader } from "@/components/atoms/SectionHeader";
import { MiniTrendChart } from "@/components/molecules/MiniTrendChart";
import { SummaryMetricCard } from "@/components/molecules/SummaryMetricCard";
import { PersonaLibraryCard } from "@/components/molecules/PersonaLibraryCard";
import { AppPageHeader } from "@/components/molecules/AppPageHeader";
import { SessionsTable } from "@/components/organisms/SessionsTable";
import { buildLineAndAreaPaths, getTrendVisual } from "@/lib/trend-chart";
import { getTrainingReport } from "@/lib/training-report-storage";
import { generateSessionReport } from "@/lib/api";

const DASHBOARD_DAY_COUNT = 7;
function getDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function buildRecentDayBuckets() {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay()); // Sunday

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);

        return {
            dateKey: getDateKey(date),
            dayLabel: date.toLocaleDateString(undefined, {
                weekday: "short",
            }),
        };
    });
}

export default function DashboardPage() {
    const router = useRouter();
    const [aggregate, setAggregate] = useState<MetricsAggregate | null>(null);
    const [metrics, setMetrics] = useState<TrainingMetricDataPoint[]>([]);
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [savedPersonas, setSavedPersonas] = useState<SavedPersona[]>([]);
    const [reportBySessionId, setReportBySessionId] = useState<
        Record<string, Awaited<ReturnType<typeof getTrainingReport>>>
    >({});
    const [isLoading, setIsLoading] = useState(true);
    const [isReportsLoading, setIsReportsLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [aggregateData, allMetrics, personas, history] =
                    await Promise.all([
                        getTrainingMetricsAggregate(),
                        getAllTrainingMetrics(),
                        getSavedPersonas(),
                        getTrainingHistory(),
                    ]);
                setAggregate(aggregateData);
                setMetrics(allMetrics);
                setSavedPersonas(personas);
                setSessions(history);
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        const loadReports = async () => {
            if (hasMeaningfulMetrics) {
                return;
            }
            setIsReportsLoading(true);
            const missing = sessions.filter(
                (session) => !reportBySessionId[session.id]
            );
            if (missing.length === 0) {
                setIsReportsLoading(false);
                return;
            }

            const entries = await Promise.all(
                missing.map(async (session) => [
                    session.id,
                    (await getTrainingReport(session.id)) ??
                        (await generateSessionReport(session.id)),
                ])
            );
            setReportBySessionId((prev) => {
                const next = { ...prev };
                entries.forEach(([id, report]) => {
                    if (report) {
                        next[id as string] = report;
                    }
                });
                return next;
            });
            setIsReportsLoading(false);
        };

        if (sessions.length > 0) {
            void loadReports();
        }
    }, [sessions, reportBySessionId, metrics.length]);

    const personas = useMemo(
        () =>
            savedPersonas
                .filter((persona) => persona.isPriority)
                .slice(0, 2),
        [savedPersonas]
    );

    const hasReportData = Object.keys(reportBySessionId).length > 0;
    const hasMeaningfulMetrics = metrics.some(
        (metric) =>
            metric.overall_score > 0 ||
            metric.duration_seconds > 0 ||
            metric.questions_asked > 0
    );
    const activeMetrics = useMemo(() => {
        if (hasMeaningfulMetrics) {
            return metrics;
        }

        if (!hasReportData) {
            return [] as TrainingMetricDataPoint[];
        }

        return Object.values(reportBySessionId)
            .filter(Boolean)
            .map((report) => ({
                session_id: report!.session_overview.session_id,
                timestamp: report!.session_overview.session_start_time,
                scenario: report!.session_overview.scenario,
                difficulty: report!.session_overview.difficulty,
                duration_seconds:
                    report!.session_overview.session_duration_seconds,
                overall_score: report!.overall_score.score,
                discovery_score: report!.overall_score.breakdown.discovery,
                objection_handling_score:
                    report!.overall_score.breakdown.objection_handling,
                value_communication_score:
                    report!.overall_score.breakdown.value_communication,
                conversation_control_score:
                    report!.overall_score.breakdown.conversation_control,
                emotional_intelligence_score:
                    report!.overall_score.breakdown.emotional_intelligence,
                talk_ratio_rep: report!.conversation_metrics.talk_ratio_rep,
                questions_asked: report!.conversation_metrics.questions_asked,
                open_questions: report!.conversation_metrics.open_questions,
                interruptions: report!.conversation_metrics.interruptions,
                discovery_completeness: 0,
                trust_change: report!.prospect_engagement.trust_change,
                commitment_secured: report!.deal_progression.commitment_secured,
            }));
    }, [metrics, reportBySessionId, hasReportData, hasMeaningfulMetrics]);

    const isMetricsReady = activeMetrics.length > 0;
    const shouldShowLoading =
        isLoading ||
        (sessions.length > 0 && !isMetricsReady && isReportsLoading);

    const activeAggregate = useMemo(() => {
        if (aggregate && aggregate.total_sessions > 0) {
            return aggregate;
        }

        if (activeMetrics.length === 0) {
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

        const totals = activeMetrics.reduce(
            (acc, metric) => {
                acc.overall += metric.overall_score;
                acc.discovery += metric.discovery_score;
                acc.objection += metric.objection_handling_score;
                acc.value += metric.value_communication_score;
                acc.control += metric.conversation_control_score;
                acc.emotional += metric.emotional_intelligence_score;
                acc.duration += metric.duration_seconds;
                acc.questions += metric.questions_asked;
                acc.talkRatio += metric.talk_ratio_rep;
                acc.excellent += metric.overall_score >= 80 ? 1 : 0;
                acc.good +=
                    metric.overall_score >= 60 && metric.overall_score < 80
                        ? 1
                        : 0;
                acc.needs += metric.overall_score < 60 ? 1 : 0;
                return acc;
            },
            {
                overall: 0,
                discovery: 0,
                objection: 0,
                value: 0,
                control: 0,
                emotional: 0,
                duration: 0,
                questions: 0,
                talkRatio: 0,
                excellent: 0,
                good: 0,
                needs: 0,
            }
        );

        const count = activeMetrics.length || 1;
        return {
            total_sessions: activeMetrics.length,
            avg_overall_score: totals.overall / count,
            avg_discovery_score: totals.discovery / count,
            avg_objection_score: totals.objection / count,
            avg_value_comm_score: totals.value / count,
            avg_conversation_control: totals.control / count,
            avg_emotional_intelligence: totals.emotional / count,
            avg_duration_seconds: totals.duration / count,
            avg_questions_asked: totals.questions / count,
            avg_talk_ratio_rep: totals.talkRatio / count,
            performance_distribution: {
                excellent: totals.excellent,
                good: totals.good,
                needs_improvement: totals.needs,
            },
            most_common_strengths: [],
            most_common_feedback: [],
        };
    }, [aggregate, activeMetrics]);

    const weeklyMetrics = useMemo(() => {
        const buckets = buildRecentDayBuckets();
        const start = new Date(`${buckets[0].dateKey}T00:00:00`);
        const end = new Date(`${buckets[buckets.length - 1].dateKey}T23:59:59`);

        const filtered = activeMetrics.filter((metric) => {
            const metricDate = new Date(metric.timestamp);
            if (Number.isNaN(metricDate.getTime())) {
                return false;
            }
            return metricDate >= start && metricDate <= end;
        });

        return filtered;
    }, [activeMetrics]);

    const timeGraphData = useMemo(() => {
        const buckets = buildRecentDayBuckets().map((day) => ({
            ...day,
            totalSeconds: 0,
            displayLabel: "0m",
        }));

        const byDate = new Map(buckets.map((entry) => [entry.dateKey, entry]));

        weeklyMetrics.forEach((metric) => {
            const metricDate = new Date(metric.timestamp);
            if (Number.isNaN(metricDate.getTime())) {
                return;
            }

            const key = getDateKey(metricDate);
            const bucket = byDate.get(key);
            if (bucket) {
                bucket.totalSeconds += metric.duration_seconds;
            }
        });

        const maxSeconds = Math.max(
            ...buckets.map((entry) => entry.totalSeconds),
            1
        );

        return buckets.map((entry) => {
            const totalHours = entry.totalSeconds / 3600;
            const displayLabel =
                entry.totalSeconds === 0
                    ? "0m"
                    : entry.totalSeconds < 3600
                      ? `${Math.max(1, Math.round(entry.totalSeconds / 60))}m`
                      : `${totalHours.toFixed(1)}h`;

            return {
                ...entry,
                totalHours,
                displayLabel,
                barHeightPercent: Math.max(
                    (entry.totalSeconds / maxSeconds) * 100,
                    entry.totalSeconds > 0 ? 16 : 8
                ),
            };
        });
    }, [weeklyMetrics]);

    const confidenceGraphData = useMemo(() => {
        const buckets = buildRecentDayBuckets().map((day) => ({
            ...day,
            totalScore: 0,
            count: 0,
        }));

        const byDate = new Map(buckets.map((entry) => [entry.dateKey, entry]));

        weeklyMetrics.forEach((metric) => {
            const metricDate = new Date(metric.timestamp);
            if (Number.isNaN(metricDate.getTime())) {
                return;
            }

            const key = getDateKey(metricDate);
            const bucket = byDate.get(key);
            if (bucket) {
                bucket.totalScore += metric.overall_score;
                bucket.count += 1;
            }
        });

        return buckets.map((entry) => {
            const avgScore =
                entry.count > 0 ? entry.totalScore / entry.count : null;

            return {
                ...entry,
                avgScore,
                avgRating: avgScore !== null ? avgScore / 10 : null,
            };
        });
    }, [weeklyMetrics]);

    const confidenceSummary = useMemo(() => {
        return getTrendVisual(
            confidenceGraphData.map((point) => point.avgRating),
            0.05
        );
    }, [confidenceGraphData]);

    const confidenceLinePoints = useMemo(() => {
        return buildLineAndAreaPaths(
            confidenceGraphData.map((day) => day.avgRating),
            0,
            10
        );
    }, [confidenceGraphData]);

    const confidenceSinglePoint =
        confidenceGraphData.filter((day) => day.avgRating !== null).length ===
        1;

    const prospectSentimentGraphData = useMemo(() => {
        const getSentimentRating = (trustChange: number) => {
            if (trustChange > 0.1) {
                return 3; // satisfied
            }
            if (trustChange >= -0.05) {
                return 2; // neutral
            }
            return 1; // dissatisfied
        };

        const buckets = buildRecentDayBuckets().map((day) => ({
            ...day,
            totalSentimentRating: 0,
            count: 0,
        }));

        const byDate = new Map(buckets.map((entry) => [entry.dateKey, entry]));

        weeklyMetrics.forEach((metric) => {
            const metricDate = new Date(metric.timestamp);
            if (Number.isNaN(metricDate.getTime())) {
                return;
            }

            const key = getDateKey(metricDate);
            const bucket = byDate.get(key);
            if (bucket) {
                bucket.totalSentimentRating += getSentimentRating(
                    metric.trust_change
                );
                bucket.count += 1;
            }
        });

        return buckets.map((entry) => {
            if (entry.count === 0) {
                return {
                    ...entry,
                    avgSentimentRating: null,
                };
            }

            return {
                ...entry,
                avgSentimentRating: entry.totalSentimentRating / entry.count,
            };
        });
    }, [weeklyMetrics]);

    const prospectSentimentSummary = useMemo(() => {
        return getTrendVisual(
            prospectSentimentGraphData.map((day) => day.avgSentimentRating),
            0.1
        );
    }, [prospectSentimentGraphData]);

    const prospectSentimentLinePoints = useMemo(() => {
        return buildLineAndAreaPaths(
            prospectSentimentGraphData.map((day) => day.avgSentimentRating),
            1,
            3
        );
    }, [prospectSentimentGraphData]);

    const sentimentSinglePoint =
        prospectSentimentGraphData.filter(
            (day) => day.avgSentimentRating !== null
        ).length === 1;

    const personaIdByName = useMemo(() => {
        return new Map(
            savedPersonas
                .filter((persona) => typeof persona.name === "string")
                .map((persona) => [
                    persona.name.trim().toLowerCase(),
                    persona.id,
                ])
        );
    }, [savedPersonas]);

    const recentSessionRows = useMemo(() => {
        const resolveScore = (
            metricScore: number | null | undefined,
            reportScore: number | null | undefined
        ) => {
            if (
                typeof reportScore === "number" &&
                (metricScore === null ||
                    metricScore === undefined ||
                    metricScore === 0)
            ) {
                return reportScore;
            }
            return metricScore ?? 0;
        };
        const resolveTrust = (
            metricTrust: number | null | undefined,
            reportTrust: number | null | undefined
        ) => {
            if (
                typeof reportTrust === "number" &&
                (metricTrust === null ||
                    metricTrust === undefined ||
                    metricTrust === 0)
            ) {
                return reportTrust;
            }
            return metricTrust ?? 0;
        };
        const sessionById = new Map(
            sessions.map((session) => [session.id, session])
        );
        const rowsFromMetrics = [...activeMetrics]
            .sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
            )
            .map((metric) => {
                const session = sessionById.get(metric.session_id);
                const report = reportBySessionId[metric.session_id];
                const personaName =
                    session?.personaName || session?.jobTitle || "Unknown";
                const personaId = session?.personaName
                    ? personaIdByName.get(session.personaName.toLowerCase())
                    : undefined;

                return {
                    id: metric.session_id,
                    name: metric.scenario || session?.scenario || "Training Session",
                    persona: personaName,
                    personaId,
                    timestamp: metric.timestamp || session?.timestamp || "",
                    duration: `${Math.floor(metric.duration_seconds / 60)}m ${(
                        metric.duration_seconds % 60
                    )
                        .toString()
                        .padStart(2, "0")}s`,
                    confidence: resolveScore(
                        metric.overall_score,
                        report?.overall_score.score
                    ),
                    sentiment: resolveTrust(
                        metric.trust_change,
                        report?.prospect_engagement.trust_change
                    ),
                };
            });
        const fallback = [...sessions]
            .sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
            )
            .slice(0, 3)
            .map((session) => ({
                id: session.id,
                name: session.scenario || "Training Session",
                persona: session.personaName || session.jobTitle || "Unknown",
                personaId: session.personaName
                    ? personaIdByName.get(session.personaName.toLowerCase())
                    : undefined,
                timestamp: session.timestamp,
                duration: session.duration || "--",
                confidence:
                    reportBySessionId[session.id]?.overall_score.score ?? 0,
                sentiment:
                    reportBySessionId[session.id]?.prospect_engagement
                        .trust_change ?? 0,
            }));
        const combined = [...rowsFromMetrics, ...fallback]
            .reduce((acc, row) => {
                if (!acc.some((entry) => entry.id === row.id)) {
                    acc.push(row);
                }
                return acc;
            }, [] as typeof rowsFromMetrics)
            .sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
            );

        return combined.slice(0, 3);
    }, [activeMetrics, sessions, personaIdByName]);

    const isSessionsLoading = shouldShowLoading || isReportsLoading;

    const handleNewTraining = (personaId: string) => {
        router.push(`/training/context-builder?personaId=${personaId}`);
    };

    const handleViewReport = (sessionId: string) => {
        router.push(`/training/${sessionId}/report`);
    };

    const handleViewPersonaDetails = (personaId: string) => {
        router.push(`/personas/${personaId}`);
    };

    const handleTogglePriority = async (personaId: string) => {
        try {
            await togglePersonaPriority(personaId);
            setSavedPersonas(await getSavedPersonas());
        } catch (error) {
            console.error("Failed to toggle priority:", error);
        }
    };

    if (shouldShowLoading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-border-subtle border-t-primary mb-4" />
                    <p className="text-text-muted">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-surface-base">
            <AppPageHeader title="Dashboard" />

            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <SummaryMetricCard
                        title="Total Time"
                        description="Total practice time recorded this week."
                        headerAlign="bottom"
                        indicator={
                            <span className="text-3xl font-bold text-white leading-none">
                                {(() => {
                                    const totalSeconds = timeGraphData.reduce(
                                        (sum, day) =>
                                            sum + day.totalSeconds,
                                        0
                                    );
                                    if (totalSeconds < 3600) {
                                        return `${Math.max(
                                            1,
                                            Math.round(totalSeconds / 60)
                                        )}m`;
                                    }
                                    return `${(totalSeconds / 3600).toFixed(1)}h`;
                                })()}
                            </span>
                        }
                    >
                        <div className="w-full grid grid-cols-7 gap-1.5">
                            {timeGraphData.map((day) => (
                                <div
                                    key={day.dateKey}
                                    className="flex flex-col items-center gap-1"
                                >
                                    <div className="h-[88px] w-full bg-primary/15 rounded-t flex items-end overflow-hidden">
                                        <div
                                            className="w-full bg-primary rounded-t"
                                            style={{
                                                height: `${day.barHeightPercent}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">
                                        {day.dayLabel}
                                    </span>
                                    <span className="text-[9px] text-text-main font-medium leading-none">
                                        {day.displayLabel}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </SummaryMetricCard>

                    <SummaryMetricCard
                        title="Confidence Rating"
                        description="Average daily score on a 0–10 scale."
                        indicator={
                            <TrendBadge
                                direction={confidenceSummary.direction}
                                value={confidenceSummary.value}
                                suffix="/10"
                            />
                        }
                    >
                        <MiniTrendChart
                            yAxisLabels={["10", "5", "0"]}
                            linePath={confidenceLinePoints.linePath}
                            areaPath={
                                confidenceSinglePoint
                                    ? undefined
                                    : confidenceLinePoints.areaPath
                            }
                            lineColorClass={
                                confidenceSinglePoint
                                    ? "text-success"
                                    : confidenceSummary.lineClass
                            }
                            areaColorClass={
                                confidenceSinglePoint
                                    ? "fill-success/10"
                                    : confidenceSummary.fillClass
                            }
                            xAxisLabels={confidenceGraphData.map(
                                (day) => day.dayLabel
                            )}
                            valueLabels={confidenceGraphData.map((day) =>
                                day.avgRating !== null
                                    ? day.avgRating.toFixed(1)
                                    : "-"
                            )}
                        />
                    </SummaryMetricCard>

                    <SummaryMetricCard
                        title="Prospect Average Sentiment Trend"
                        description="Daily average prospect sentiment from 1–3."
                        indicator={
                            <TrendBadge
                                direction={prospectSentimentSummary.direction}
                                value={prospectSentimentSummary.value}
                            />
                        }
                    >
                        <MiniTrendChart
                            yAxisLabels={[
                                "3 Satisfied",
                                "2 Neutral",
                                "1 Dissatisfied",
                            ]}
                            linePath={prospectSentimentLinePoints.linePath}
                            areaPath={
                                sentimentSinglePoint
                                    ? undefined
                                    : prospectSentimentLinePoints.areaPath
                            }
                            lineColorClass={
                                sentimentSinglePoint
                                    ? "text-success"
                                    : prospectSentimentSummary.lineClass
                            }
                            areaColorClass={
                                sentimentSinglePoint
                                    ? "fill-success/10"
                                    : prospectSentimentSummary.fillClass
                            }
                            xAxisLabels={prospectSentimentGraphData.map(
                                (day) => day.dayLabel
                            )}
                            valueLabels={prospectSentimentGraphData.map(
                                (day) =>
                                    day.avgSentimentRating !== null
                                        ? day.avgSentimentRating.toFixed(1)
                                        : "-"
                            )}
                        />
                    </SummaryMetricCard>
                </section>

                <section className="space-y-6">
                    <SectionHeader
                        title="Priority Personas"
                        action={
                            <button
                                onClick={() => router.push("/personas")}
                                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center"
                            >
                                View All Personas
                            </button>
                        }
                    />

                    <div className="grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-6 auto-rows-fr">
                        {personas.length === 0 ? (
                            <article className="bg-surface-panel border border-border-subtle rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                                <span className="material-symbols-outlined text-text-muted !text-[30px] mb-3">
                                    groups
                                </span>
                                <h4 className="text-sm font-bold mb-1 text-white">
                                    No personas available
                                </h4>
                                <p className="text-xs text-text-muted">
                                    Mark up to two personas as priority from the
                                    Personas page.
                                </p>
                            </article>
                        ) : (
                            personas.map((persona) => (
                                <PersonaLibraryCard
                                    key={persona.id}
                                    persona={persona}
                                    imageSrc={
                                        (persona.name &&
                                            DUMMY_PERSONA_IMAGES[
                                                persona.name
                                            ]) ||
                                        DUMMY_PERSONA_IMAGES["Priya Nair"]
                                    }
                                    onQuickStart={handleNewTraining}
                                    onViewDetails={handleViewPersonaDetails}
                                    onTogglePriority={handleTogglePriority}
                                />
                            ))
                        )}

                        <article className="bg-surface-panel rounded-2xl border-2 border-dashed border-border-subtle overflow-hidden flex flex-col items-center justify-center h-full group hover:border-primary/50 transition-all duration-300 p-8 text-center cursor-pointer">
                            <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                                <span className="material-symbols-outlined text-text-muted !text-[30px] group-hover:text-primary">
                                    add_circle
                                </span>
                            </div>
                            <h4 className="text-sm font-bold mb-1 text-white">
                                New Persona
                            </h4>
                            <p className="text-xs text-text-muted">
                                Create a custom training scenario
                            </p>
                        </article>
                    </div>
                </section>

                <section className="space-y-6">
                    <SectionHeader
                        title="Recent Sessions"
                        action={
                            <button
                                onClick={() => router.push("/sessions")}
                                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center"
                            >
                                View All Sessions
                            </button>
                        }
                    />
                    <SessionsTable
                        rows={isSessionsLoading ? [] : recentSessionRows}
                        onViewReport={handleViewReport}
                        onViewPersona={handleViewPersonaDetails}
                        isLoading={isSessionsLoading}
                    />
                </section>
            </div>
        </div>
    );
}
