"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Heading } from "@/components/atoms/Heading";
import { generateSessionReport, type SessionReport } from "@/lib/api";
import { getTrainingSessionById } from "@/lib/training-history";

function MetricBar({ value, max = 10 }: { value: number; max?: number }) {
    const percentage = (value / max) * 100;
    const color =
        value >= 7
            ? "bg-green-500"
            : value >= 5
              ? "bg-yellow-500"
              : "bg-red-500";

    return (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
                className={`h-full ${color} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}

function TrendBadge({ trend }: { trend: string }) {
    const getBadgeColor = () => {
        if (trend === "increasing" || trend === "improving")
            return "bg-green-100 text-green-800";
        if (trend === "decreasing" || trend === "declining")
            return "bg-red-100 text-red-800";
        return "bg-gray-100 text-gray-800";
    };

    const getIcon = () => {
        if (trend === "increasing" || trend === "improving") return "↗";
        if (trend === "decreasing" || trend === "declining") return "↘";
        return "→";
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor()}`}
        >
            {getIcon()} {trend}
        </span>
    );
}

export default function SessionReportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");

    const [report, setReport] = useState<SessionReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track which session we've fetched to prevent duplicate API calls
    const hasFetchedRef = useRef(false);

    useEffect(() => {
        if (!sessionId) {
            setError("No session ID provided");
            setIsLoading(false);
            return;
        }

        // Skip if we've already started fetching
        if (hasFetchedRef.current) {
            return;
        }
        hasFetchedRef.current = true;

        const loadReport = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // First, check if we have the report cached in training history
                const cachedSession = getTrainingSessionById(sessionId);
                if (cachedSession?.report) {
                    setReport(cachedSession.report);
                    setIsLoading(false);
                    return;
                }

                // If not cached, generate it from the API
                const data = await generateSessionReport(sessionId);
                setReport(data);
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : "Failed to load session report";
                setError(errorMessage);
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
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-zinc-600">
                        Loading performance report...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex-1 p-8">
                <div className="max-w-2xl">
                    <Heading size="lg">Session Report Error</Heading>
                    <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800">
                            {error || "Report not found"}
                        </p>
                    </div>
                    <div className="mt-6">
                        <Button
                            variant="primary"
                            onClick={() => router.push("/training")}
                        >
                            Back to Training
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-5xl">
                {/* Header */}
                <div className="mb-8">
                    <Heading size="lg">Session Performance Report</Heading>
                    <p className="text-sm text-zinc-700 mt-2">
                        Duration: {report.session_total_time} • Messages:{" "}
                        {report.transcript_length}
                    </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Rep Confidence */}
                    <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                        <h3 className="text-sm font-semibold text-blue-900 mb-3">
                            Rep Confidence (Internal)
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-bold text-blue-700">
                                    {report.rep_confidence_avg.toFixed(1)}
                                </span>
                                <span className="text-sm text-blue-600">
                                    /10
                                </span>
                            </div>
                            <MetricBar value={report.rep_confidence_avg} />
                            <TrendBadge trend={report.rep_confidence_trend} />
                        </div>
                    </div>

                    {/* On-Rep Confidence */}
                    <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
                        <h3 className="text-sm font-semibold text-purple-900 mb-3">
                            On-Rep Confidence (External)
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-bold text-purple-700">
                                    {report.on_rep_confidence_avg.toFixed(1)}
                                </span>
                                <span className="text-sm text-purple-600">
                                    /10
                                </span>
                            </div>
                            <MetricBar value={report.on_rep_confidence_avg} />
                            <TrendBadge
                                trend={report.on_rep_confidence_trend}
                            />
                        </div>
                    </div>

                    {/* Prospect Sentiment */}
                    <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                        <h3 className="text-sm font-semibold text-green-900 mb-3">
                            Prospect Sentiment
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-bold text-green-700">
                                    {report.prospect_sentiment_avg.toFixed(1)}
                                </span>
                                <span className="text-sm text-green-600">
                                    /10
                                </span>
                            </div>
                            <MetricBar value={report.prospect_sentiment_avg} />
                            <TrendBadge
                                trend={report.prospect_sentiment_trend}
                            />
                        </div>
                    </div>
                </div>

                {/* Key Moments */}
                <div className="bg-amber-50 rounded-lg p-6 border border-amber-200 mb-8">
                    <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center">
                        <svg
                            className="w-5 h-5 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Key Moments
                    </h3>
                    <ul className="space-y-3">
                        {report.key_moments.map(
                            (moment: string, index: number) => (
                                <li key={index} className="flex items-start">
                                    <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                        {index + 1}
                                    </span>
                                    <p className="text-gray-700 flex-1">
                                        {moment}
                                    </p>
                                </li>
                            )
                        )}
                    </ul>
                </div>

                {/* Coaching Recommendations */}
                <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200 mb-8">
                    <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center">
                        <svg
                            className="w-5 h-5 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Coaching Recommendations
                    </h3>
                    <ul className="space-y-3">
                        {report.recommendations.map(
                            (rec: string, index: number) => (
                                <li key={index} className="flex items-start">
                                    <svg
                                        className="flex-shrink-0 w-5 h-5 text-indigo-500 mr-3 mt-0.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <p className="text-gray-700 flex-1">
                                        {rec}
                                    </p>
                                </li>
                            )
                        )}
                    </ul>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 pt-6 border-t border-zinc-200">
                    <Button
                        variant="primary"
                        onClick={() => router.push("/training/session")}
                    >
                        Start New Session
                    </Button>
                    <Button onClick={() => router.push("/training")}>
                        Back to Training
                    </Button>
                </div>

                {/* Session ID */}
                <div className="mt-6">
                    <p className="text-xs text-gray-500">
                        Session ID:{" "}
                        <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                            {report.session_id}
                        </code>
                    </p>
                </div>
            </div>
        </div>
    );
}
