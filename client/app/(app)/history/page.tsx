"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heading } from "@/components/atoms/Heading";
import {
    getTrainingHistory,
    deleteTrainingSession,
    type TrainingSession,
} from "@/lib/training-history";

export default function TrainingHistoryPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<TrainingSession[]>([]);

    useEffect(() => {
        // Load training history from localStorage
        setSessions(getTrainingHistory());
    }, []);

    const handleViewReport = (sessionId: string) => {
        router.push(`/training/session-report?session_id=${sessionId}`);
    };

    const handleDelete = (id: string) => {
        if (
            confirm(
                "Are you sure you want to delete this training session from history?"
            )
        ) {
            deleteTrainingSession(id);
            setSessions(getTrainingHistory());
        }
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex-1 p-8">
            <div className="mb-6">
                <Heading size="lg">Training History</Heading>
                <p className="text-zinc-600 text-sm mt-2">
                    View past training sessions and their performance reports
                </p>
            </div>

            {sessions.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-zinc-500 mb-4">
                        No training sessions yet
                    </p>
                    <button
                        onClick={() => router.push("/training")}
                        className="px-4 py-2 text-sm rounded-md bg-black text-white hover:bg-zinc-800 transition-colors"
                    >
                        Start Your First Training
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className="bg-white border border-zinc-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-base font-semibold text-zinc-900">
                                            {session.personaName ||
                                                session.jobTitle ||
                                                "Training Session"}
                                        </h3>
                                        <span className="text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded">
                                            {session.transcriptLength}{" "}
                                            {session.transcriptLength === 1
                                                ? "message"
                                                : "messages"}
                                        </span>
                                    </div>
                                    {session.jobTitle &&
                                        session.jobTitle !==
                                            session.personaName && (
                                            <p className="text-sm text-zinc-600 mb-1">
                                                {session.jobTitle}
                                            </p>
                                        )}
                                    <p className="text-xs text-zinc-500">
                                        {formatDate(session.timestamp)}
                                        {session.duration &&
                                            ` • ${session.duration}`}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            handleViewReport(session.id)
                                        }
                                        className="px-4 py-2 text-sm rounded-md bg-black text-white hover:bg-zinc-800 transition-colors whitespace-nowrap"
                                    >
                                        View Report
                                    </button>
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        className="px-3 py-2 text-sm rounded-md border border-zinc-300 bg-white text-red-600 hover:bg-red-50 transition-colors"
                                        aria-label="Delete session"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {sessions.length > 0 && (
                <div className="mt-6 text-center">
                    <p className="text-xs text-zinc-500">
                        Showing {sessions.length} training session
                        {sessions.length === 1 ? "" : "s"}
                    </p>
                </div>
            )}
        </div>
    );
}
