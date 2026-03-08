"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Heading } from "@/components/atoms/Heading";
import { generateSessionReport, type SessionReport } from "@/lib/api";
import { getTrainingReport } from "@/lib/training-report-storage";

function ScoreCircle({ score, label }: { score: number; label: string }) {
    const color =
        score >= 75
            ? "text-green-600"
            : score >= 60
              ? "text-yellow-600"
              : "text-red-600";

    return (
        <div className="flex flex-col items-center">
            <div className={`text-4xl font-bold ${color}`}>{score}</div>
            <div className="text-sm text-gray-600 mt-1">{label}</div>
        </div>
    );
}

function MetricRow({
    label,
    value,
    isGood,
}: {
    label: string;
    value: string | number;
    isGood?: boolean;
}) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-700">{label}</span>
            <span
                className={`font-semibold ${
                    isGood === true
                        ? "text-green-600"
                        : isGood === false
                          ? "text-red-600"
                          : "text-gray-900"
                }`}
            >
                {value}
            </span>
        </div>
    );
}

function BooleanBadge({ value, label }: { value: boolean; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span
                className={`w-3 h-3 rounded-full ${value ? "bg-green-500" : "bg-red-400"}`}
            />
            <span className="text-sm text-gray-700">{label}</span>
        </div>
    );
}

export default function SessionReportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");

    const [report, setReport] = useState<SessionReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasFetchedRef = useRef(false);

    useEffect(() => {
        if (!sessionId) {
            setError("No session ID provided");
            setIsLoading(false);
            return;
        }

        if (hasFetchedRef.current) {
            return;
        }
        hasFetchedRef.current = true;

        const loadReport = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // First, check if we have the report in storage
                const cachedReport = await getTrainingReport(sessionId);
                if (cachedReport) {
                    setReport(cachedReport);
                    setIsLoading(false);
                    return;
                }

                // If not cached, generate it from the API
                // TODO: Update this to use the new API endpoint when available
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

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <Heading size="lg">AI Sales Training Report</Heading>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="text-gray-500">Scenario</div>
                            <div className="font-semibold text-gray-900">
                                {report.session_overview.scenario}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500">Persona</div>
                            <div className="font-semibold text-gray-900">
                                {report.session_overview.prospect_persona}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500">Difficulty</div>
                            <div className="font-semibold text-gray-900">
                                {report.session_overview.difficulty}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500">Duration</div>
                            <div className="font-semibold text-gray-900">
                                {formatDuration(
                                    report.session_overview
                                        .session_duration_seconds
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overall Score */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                        Overall Performance
                    </h2>
                    <div className="flex items-center justify-center mb-6">
                        <div className="text-center">
                            <div className="text-6xl font-bold text-blue-600">
                                {report.overall_score.score}
                            </div>
                            <div className="text-lg text-gray-600 mt-2">
                                {report.overall_score.performance_level}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <ScoreCircle
                            score={report.overall_score.breakdown.discovery}
                            label="Discovery"
                        />
                        <ScoreCircle
                            score={
                                report.overall_score.breakdown
                                    .objection_handling
                            }
                            label="Objection Handling"
                        />
                        <ScoreCircle
                            score={
                                report.overall_score.breakdown
                                    .value_communication
                            }
                            label="Value Communication"
                        />
                        <ScoreCircle
                            score={
                                report.overall_score.breakdown
                                    .conversation_control
                            }
                            label="Conversation Control"
                        />
                        <ScoreCircle
                            score={
                                report.overall_score.breakdown
                                    .emotional_intelligence
                            }
                            label="Emotional Intelligence"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Conversation Metrics */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Conversation Metrics
                        </h3>
                        <div className="space-y-2">
                            <MetricRow
                                label="Rep Talk Ratio"
                                value={`${(report.conversation_metrics.talk_ratio_rep * 100).toFixed(0)}%`}
                                isGood={
                                    report.conversation_metrics
                                        .talk_ratio_rep <= 0.7
                                }
                            />
                            <MetricRow
                                label="Prospect Talk Ratio"
                                value={`${(report.conversation_metrics.talk_ratio_prospect * 100).toFixed(0)}%`}
                                isGood={
                                    report.conversation_metrics
                                        .talk_ratio_prospect >= 0.3
                                }
                            />
                            <MetricRow
                                label="Questions Asked"
                                value={
                                    report.conversation_metrics.questions_asked
                                }
                            />
                            <MetricRow
                                label="Open Questions"
                                value={
                                    report.conversation_metrics.open_questions
                                }
                                isGood={
                                    report.conversation_metrics
                                        .open_questions >= 5
                                }
                            />
                            <MetricRow
                                label="Interruptions"
                                value={
                                    report.conversation_metrics.interruptions
                                }
                                isGood={
                                    report.conversation_metrics.interruptions <=
                                    1
                                }
                            />
                            <MetricRow
                                label="Avg Response Time"
                                value={`${report.conversation_metrics.avg_response_latency_seconds.toFixed(1)}s`}
                            />
                        </div>
                    </div>

                    {/* Discovery Signals */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Discovery & Qualification
                        </h3>
                        <div className="space-y-3">
                            <BooleanBadge
                                value={report.discovery_signals.pain_identified}
                                label="Pain Point Identified"
                            />
                            <BooleanBadge
                                value={
                                    report.discovery_signals
                                        .current_tools_identified
                                }
                                label="Current Tools Discovered"
                            />
                            <BooleanBadge
                                value={
                                    report.discovery_signals.budget_discussed
                                }
                                label="Budget Discussed"
                            />
                            <BooleanBadge
                                value={
                                    report.discovery_signals
                                        .decision_process_identified
                                }
                                label="Decision Process Identified"
                            />
                            <div className="flex items-center gap-2 pt-2">
                                <span className="text-sm text-gray-700">
                                    Timeline Discussion:
                                </span>
                                <span className="text-sm font-semibold capitalize">
                                    {
                                        report.discovery_signals
                                            .timeline_discussed
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Objection Handling */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Objection Handling
                        </h3>
                        <div className="space-y-2">
                            <MetricRow
                                label="Objections Detected"
                                value={
                                    report.objection_handling
                                        .objections_detected
                                }
                            />
                            <MetricRow
                                label="Acknowledgment Quality"
                                value={
                                    report.objection_handling
                                        .acknowledgment_quality
                                }
                            />
                            <MetricRow
                                label="Evidence Used"
                                value={report.objection_handling.evidence_used}
                            />
                            <MetricRow
                                label="Follow-up Questions"
                                value={
                                    report.objection_handling
                                        .follow_up_questions
                                }
                            />
                        </div>
                    </div>

                    {/* Value Communication */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Value Communication
                        </h3>
                        <div className="space-y-2">
                            <MetricRow
                                label="Value Clarity"
                                value={report.value_communication.value_clarity}
                            />
                            <MetricRow
                                label="Feature vs Benefit"
                                value={
                                    report.value_communication
                                        .feature_vs_benefit_balance
                                }
                            />
                            <div className="py-2 border-b border-gray-100">
                                <BooleanBadge
                                    value={
                                        report.value_communication
                                            .roi_quantified
                                    }
                                    label="ROI Quantified"
                                />
                            </div>
                            <MetricRow
                                label="Personalization"
                                value={
                                    report.value_communication.personalization
                                }
                            />
                        </div>
                    </div>

                    {/* Emotional Intelligence */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Emotional Intelligence
                        </h3>
                        <div className="space-y-2">
                            <MetricRow
                                label="Empathy"
                                value={report.emotional_intelligence.empathy}
                            />
                            <MetricRow
                                label="Listening Signals"
                                value={
                                    report.emotional_intelligence
                                        .listening_signals
                                }
                            />
                            <MetricRow
                                label="Rapport Building"
                                value={
                                    report.emotional_intelligence
                                        .rapport_building
                                }
                            />
                            <MetricRow
                                label="Tone Adaptation"
                                value={
                                    report.emotional_intelligence
                                        .tone_adaptation
                                }
                            />
                        </div>
                    </div>

                    {/* Prospect Engagement */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Prospect Engagement
                        </h3>
                        <div className="space-y-2">
                            <MetricRow
                                label="Trust Change"
                                value={`${report.prospect_engagement.trust_change >= 0 ? "+" : ""}${(report.prospect_engagement.trust_change * 100).toFixed(0)}%`}
                                isGood={
                                    report.prospect_engagement.trust_change > 0
                                }
                            />
                            <MetricRow
                                label="Engagement Level"
                                value={
                                    report.prospect_engagement.engagement_level
                                }
                            />
                            <MetricRow
                                label="Objection Frequency"
                                value={
                                    report.prospect_engagement
                                        .objection_frequency
                                }
                            />
                            <MetricRow
                                label="Conversation Momentum"
                                value={
                                    report.prospect_engagement
                                        .conversation_momentum
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Deal Progression */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Deal Progression
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MetricRow
                            label="Buying Interest"
                            value={report.deal_progression.buying_interest}
                        />
                        <MetricRow
                            label="Next Step Clarity"
                            value={report.deal_progression.next_step_clarity}
                        />
                        <div className="py-2">
                            <BooleanBadge
                                value={
                                    report.deal_progression.commitment_secured
                                }
                                label="Commitment Secured"
                            />
                        </div>
                    </div>
                </div>

                {/* Top Feedback */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg shadow-sm p-6 mb-6 border border-red-200">
                    <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center">
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
                        Top Coaching Feedback
                    </h3>
                    <ul className="space-y-3">
                        {report.top_feedback.map((feedback, index) => (
                            <li key={index} className="flex items-start">
                                <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                    {index + 1}
                                </span>
                                <p className="text-gray-800 flex-1">
                                    {feedback}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Strengths */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm p-6 mb-6 border border-green-200">
                    <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center">
                        <svg
                            className="w-5 h-5 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Strengths
                    </h3>
                    <ul className="space-y-3">
                        {report.strengths.map((strength, index) => (
                            <li key={index} className="flex items-start">
                                <svg
                                    className="flex-shrink-0 w-5 h-5 text-green-600 mr-3 mt-0.5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <p className="text-gray-800 flex-1">
                                    {strength}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Practice Recommendations */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 mb-6 border border-blue-200">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">
                        Practice Recommendations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-blue-700 font-semibold mb-1">
                                Focus Area
                            </div>
                            <div className="text-gray-900">
                                {report.practice_recommendations.focus_area}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-blue-700 font-semibold mb-1">
                                Recommended Exercise
                            </div>
                            <div className="text-gray-900">
                                {
                                    report.practice_recommendations
                                        .recommended_exercise
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex gap-3">
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

                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                            Session ID:{" "}
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {report.session_overview.session_id}
                            </code>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
