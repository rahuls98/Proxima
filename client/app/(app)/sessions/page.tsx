"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionHeader } from "@/components/atoms/SectionHeader";
import { AppPageHeader } from "@/components/molecules/AppPageHeader";
import { SessionsTable } from "@/components/organisms/SessionsTable";
import { getSavedPersonas } from "@/lib/persona-storage";
import {
    deleteTrainingSession,
    getTrainingHistory,
    type TrainingSession,
} from "@/lib/training-history";
import { getAllTrainingMetrics } from "@/lib/training-metrics-storage";
import { getTrainingReport } from "@/lib/training-report-storage";
import { generateSessionReport } from "@/lib/api";

export default function TrainingHistoryPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [savedPersonas, setSavedPersonas] = useState<
        Awaited<ReturnType<typeof getSavedPersonas>>
    >([]);
    const [metricBySessionId, setMetricBySessionId] = useState<
        Record<
            string,
            Awaited<ReturnType<typeof getAllTrainingMetrics>>[number]
        >
    >({});
    const [reportBySessionId, setReportBySessionId] = useState<
        Record<string, Awaited<ReturnType<typeof getTrainingReport>>>
    >({});
    const [isReportsLoading, setIsReportsLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadMetrics = async () => {
            try {
                const all = await getAllTrainingMetrics();
                const map: Record<
                    string,
                    Awaited<ReturnType<typeof getAllTrainingMetrics>>[number]
                > = {};
                all.forEach((m) => {
                    map[m.session_id] = m;
                });
                setMetricBySessionId(map);
            } catch (error) {
                console.error("Failed to load metrics:", error);
            }
        };
        loadMetrics();
    }, []);

    useEffect(() => {
        const loadSessions = async () => {
            try {
                const [history, personas] = await Promise.all([
                    getTrainingHistory(),
                    getSavedPersonas(),
                ]);
                setSessions(history);
                setSavedPersonas(personas);
            } catch (error) {
                console.error("Failed to load sessions:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSessions();
    }, []);

    const isPageLoading =
        isLoading ||
        (sessions.length === 0 &&
            savedPersonas.length === 0 &&
            isReportsLoading);

    useEffect(() => {
        const loadReports = async () => {
            setIsReportsLoading(true);
            const missing = sessions.filter(
                (session) => !reportBySessionId[session.id]
            );
            if (missing.length === 0) {
                setIsReportsLoading(false);
                return;
            }

            const entries = await Promise.all(
                missing.map(
                    async (session) =>
                        [
                            session.id,
                            (await getTrainingReport(session.id)) ??
                                (await generateSessionReport(session.id)),
                        ] as [string, any]
                )
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
    }, [sessions, reportBySessionId]);

    const activeSessions = useMemo(() => sessions, [sessions]);

    const averageConfidence = useMemo(() => {
        const metricsValues = activeSessions
            .map((session) => metricBySessionId[session.id]?.overall_score)
            .filter((value): value is number => typeof value === "number");

        if (metricsValues.length > 0) {
            return (
                metricsValues.reduce((acc, value) => acc + value, 0) /
                metricsValues.length
            );
        }

        const reportValues = activeSessions
            .map(
                (session) => reportBySessionId[session.id]?.overall_score.score
            )
            .filter((value): value is number => typeof value === "number");
        if (reportValues.length === 0) {
            return 0;
        }
        return (
            reportValues.reduce((acc, value) => acc + value, 0) /
            reportValues.length
        );
    }, [activeSessions, metricBySessionId, reportBySessionId]);

    const practiceHours = useMemo(() => {
        const reportSeconds = activeSessions.reduce((acc, session) => {
            const report = reportBySessionId[session.id];
            return (
                acc + (report?.session_overview.session_duration_seconds ?? 0)
            );
        }, 0);

        if (reportSeconds > 0) {
            return reportSeconds / 3600;
        }

        const metricSeconds = activeSessions.reduce((acc, session) => {
            const metric = metricBySessionId[session.id];
            return acc + (metric?.duration_seconds ?? 0);
        }, 0);

        return metricSeconds / 3600;
    }, [activeSessions, metricBySessionId, reportBySessionId]);

    const positiveSentiment = useMemo(() => {
        const values = activeSessions
            .map((session) => metricBySessionId[session.id]?.trust_change)
            .filter((value): value is number => typeof value === "number");

        const sourceValues =
            values.length > 0
                ? values
                : activeSessions
                      .map(
                          (session) =>
                              reportBySessionId[session.id]?.prospect_engagement
                                  .trust_change
                      )
                      .filter(
                          (value): value is number => typeof value === "number"
                      );

        if (sourceValues.length === 0) {
            return 0;
        }

        const positiveCount = sourceValues.filter((value) => value > 0).length;
        return (positiveCount / sourceValues.length) * 100;
    }, [activeSessions, metricBySessionId, reportBySessionId]);

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

    const sessionRows = useMemo(() => {
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
        const byId = new Map(
            activeSessions.map((session) => [session.id, session])
        );
        const rows = Object.values(metricBySessionId).map((metric) => {
            const session = byId.get(metric.session_id);
            const report = reportBySessionId[metric.session_id];
            const persona =
                session?.personaName || session?.jobTitle || "Unknown";
            const personaId = session?.personaName
                ? personaIdByName.get(session.personaName.toLowerCase())
                : undefined;
            const duration = `${Math.floor(metric.duration_seconds / 60)}m ${(
                metric.duration_seconds % 60
            )
                .toString()
                .padStart(2, "0")}s`;

            return {
                id: metric.session_id,
                name:
                    report?.session_overview.scenario ||
                    metric.scenario ||
                    session?.scenario ||
                    "Training Session",
                persona,
                personaId,
                timestamp:
                    report?.session_overview.session_start_time ||
                    metric.timestamp ||
                    session?.timestamp ||
                    "",
                duration:
                    duration ||
                    session?.duration ||
                    (report
                        ? `${Math.floor(
                              report.session_overview.session_duration_seconds /
                                  60
                          )}m ${(
                              report.session_overview.session_duration_seconds %
                              60
                          )
                              .toString()
                              .padStart(2, "0")}s`
                        : "--"),
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

        activeSessions.forEach((session) => {
            if (metricBySessionId[session.id]) {
                return;
            }
            const report = reportBySessionId[session.id];
            const persona =
                session.personaName || session.jobTitle || "Unknown";
            const personaId = session.personaName
                ? personaIdByName.get(session.personaName.toLowerCase())
                : undefined;
            rows.push({
                id: session.id,
                name:
                    report?.session_overview.scenario ||
                    session.scenario ||
                    "Training Session",
                persona,
                personaId,
                timestamp:
                    report?.session_overview.session_start_time ||
                    session.timestamp,
                duration:
                    session.duration ||
                    (report
                        ? `${Math.floor(
                              report.session_overview.session_duration_seconds /
                                  60
                          )}m ${(
                              report.session_overview.session_duration_seconds %
                              60
                          )
                              .toString()
                              .padStart(2, "0")}s`
                        : "--"),
                confidence: report?.overall_score.score ?? 0,
                sentiment: report?.prospect_engagement.trust_change ?? 0,
            });
        });

        return rows.sort(
            (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
        );
    }, [activeSessions, metricBySessionId, personaIdByName, reportBySessionId]);

    const hasMeaningfulMetrics = Object.values(metricBySessionId).some(
        (metric) =>
            metric.overall_score > 0 ||
            metric.duration_seconds > 0 ||
            metric.questions_asked > 0
    );
    const isTableLoading =
        isReportsLoading ||
        (sessions.length > 0 && Object.keys(reportBySessionId).length === 0);

    const handleViewReport = (sessionId: string) => {
        router.push(`/training/${sessionId}/report`);
    };

    const handleDelete = (id: string) => {
        if (
            confirm(
                "Are you sure you want to delete this training session from history?"
            )
        ) {
            deleteTrainingSession(id)
                .then(() => getTrainingHistory())
                .then((history) => setSessions(history))
                .catch((error) =>
                    console.error("Failed to delete session:", error)
                );
        }
    };

    const handleViewPersona = (personaId: string) => {
        router.push(`/personas/${personaId}`);
    };

    if (isPageLoading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-border-subtle border-t-primary mb-4" />
                    <p className="text-text-muted">Loading sessions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full min-w-0 flex flex-col bg-surface-base">
            <AppPageHeader title="Sessions" />

            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                <section className="w-full p-6 lg:p-8 bg-surface-panel border border-border-subtle rounded-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <h3 className="text-xl font-bold text-text-main">
                        Performance Summary
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 w-full lg:w-auto">
                        <div className="flex flex-col items-start sm:items-center">
                            <span className="text-3xl font-extrabold text-primary">
                                {practiceHours.toFixed(1)}h
                            </span>
                            <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-1">
                                Practice Time
                            </span>
                        </div>
                        <div className="flex flex-col items-start sm:items-center">
                            <span className="text-3xl font-extrabold text-primary">
                                {averageConfidence.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-1">
                                Average Confidence
                            </span>
                        </div>
                        <div className="flex flex-col items-start sm:items-center">
                            <span className="text-3xl font-extrabold text-primary">
                                {positiveSentiment.toFixed(0)}%
                            </span>
                            <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-1">
                                Positive Sentiment
                            </span>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <SectionHeader title="Session Library" />
                    <SessionsTable
                        rows={isTableLoading ? [] : sessionRows}
                        onViewReport={handleViewReport}
                        onViewPersona={handleViewPersona}
                        onDelete={handleDelete}
                        showDelete
                        showFooter
                        totalCount={activeSessions.length}
                        isLoading={isTableLoading}
                    />
                </section>
            </div>
        </div>
    );
}
