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
import {
    DUMMY_PERSONAS,
    DUMMY_TRAINING_HISTORY,
    DUMMY_TRAINING_METRICS,
} from "@/lib/ui-dummy-data";

export default function TrainingHistoryPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<TrainingSession[]>(() =>
        getTrainingHistory()
    );
    const [metricBySessionId, setMetricBySessionId] = useState<
        Record<string, (typeof DUMMY_TRAINING_METRICS)[number]>
    >({});

    useEffect(() => {
        const loadMetrics = async () => {
            try {
                const all = await getAllTrainingMetrics();
                const map: Record<
                    string,
                    (typeof DUMMY_TRAINING_METRICS)[number]
                > = {};
                all.forEach((m) => {
                    map[m.session_id] = m;
                });
                if (Object.keys(map).length === 0) {
                    DUMMY_TRAINING_METRICS.forEach((m) => {
                        map[m.session_id] = m;
                    });
                }
                setMetricBySessionId(map);
            } catch (error) {
                console.error("Failed to load metrics:", error);
            }
        };
        loadMetrics();
    }, []);

    const activeSessions = useMemo(
        () => (sessions.length > 0 ? sessions : DUMMY_TRAINING_HISTORY),
        [sessions]
    );

    const usingDummyData = sessions.length === 0;

    const averageConfidence = useMemo(() => {
        const values = activeSessions
            .map((session) => metricBySessionId[session.id]?.overall_score)
            .filter((value): value is number => typeof value === "number");
        if (values.length === 0) {
            return 82.4;
        }
        return values.reduce((acc, value) => acc + value, 0) / values.length;
    }, [activeSessions, metricBySessionId]);

    const practiceHours = useMemo(() => {
        const totalSeconds = activeSessions.reduce((acc, session) => {
            const metric = metricBySessionId[session.id];
            return acc + (metric?.duration_seconds ?? 0);
        }, 0);

        if (totalSeconds === 0) {
            return 4.2;
        }

        return totalSeconds / 3600;
    }, [activeSessions, metricBySessionId]);

    const positiveSentiment = useMemo(() => {
        const values = activeSessions
            .map((session) => metricBySessionId[session.id]?.trust_change)
            .filter((value): value is number => typeof value === "number");

        if (values.length === 0) {
            return 91;
        }

        const positiveCount = values.filter((value) => value > 0).length;
        return (positiveCount / values.length) * 100;
    }, [activeSessions, metricBySessionId]);

    const personaIdByName = useMemo(() => {
        const saved = getSavedPersonas();
        const source = saved.length > 0 ? saved : DUMMY_PERSONAS;

        return new Map(
            source.map((persona) => [persona.name.toLowerCase(), persona.id])
        );
    }, []);

    const sessionRows = useMemo(
        () =>
            activeSessions.map((session) => {
                const metric = metricBySessionId[session.id];

                return {
                    id: session.id,
                    name: session.scenario || "Training Session",
                    persona:
                        session.personaName || session.jobTitle || "Unknown",
                    personaId: session.personaName
                        ? personaIdByName.get(session.personaName.toLowerCase())
                        : undefined,
                    timestamp: session.timestamp,
                    duration: session.duration || "--",
                    confidence: metric?.overall_score ?? 72,
                    sentiment: metric?.trust_change ?? 0.1,
                };
            }),
        [activeSessions, metricBySessionId, personaIdByName]
    );

    const handleViewReport = (sessionId: string) => {
        router.push(`/training/${sessionId}/report`);
    };

    const handleDelete = (id: string) => {
        if (usingDummyData) {
            return;
        }
        if (
            confirm(
                "Are you sure you want to delete this training session from history?"
            )
        ) {
            deleteTrainingSession(id);
            setSessions(getTrainingHistory());
        }
    };

    const handleViewPersona = (personaId: string) => {
        router.push(`/personas/${personaId}`);
    };

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
                        rows={sessionRows}
                        onViewReport={handleViewReport}
                        onViewPersona={handleViewPersona}
                        onDelete={handleDelete}
                        showDelete={!usingDummyData}
                        showFooter
                        totalCount={activeSessions.length}
                    />
                </section>
            </div>
        </div>
    );
}
