"use client";

import { useEffect, useState } from "react";
import { Heading } from "@/components/atoms/Heading";
import {
    getTrainingMetricsAggregate,
    getPerformanceTrend,
    getAllTrainingMetrics,
    type MetricsAggregate,
    type TrainingMetricDataPoint,
} from "@/lib/training-metrics-storage";

function StatCard({
    label,
    value,
    subtitle,
    trend,
}: {
    label: string;
    value: string | number;
    subtitle?: string;
    trend?: "up" | "down" | "neutral";
}) {
    const trendColors = {
        up: "text-green-600",
        down: "text-red-600",
        neutral: "text-gray-600",
    };

    const trendIcons = {
        up: "↗",
        down: "↘",
        neutral: "→",
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">{label}</div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            {subtitle && (
                <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
            )}
            {trend && (
                <div className={`text-sm mt-2 ${trendColors[trend]}`}>
                    {trendIcons[trend]} {trend}
                </div>
            )}
        </div>
    );
}

function ScoreBar({
    label,
    score,
    max = 100,
}: {
    label: string;
    score: number;
    max?: number;
}) {
    const percentage = (score / max) * 100;
    const color =
        score >= 75
            ? "bg-green-500"
            : score >= 60
              ? "bg-yellow-500"
              : "bg-red-500";

    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-700">{label}</span>
                <span className="text-sm font-semibold text-gray-900">
                    {score}
                </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [aggregate, setAggregate] = useState<MetricsAggregate | null>(null);
    const [metrics, setMetrics] = useState<TrainingMetricDataPoint[]>([]);
    const [trend, setTrend] = useState<{
        recent_avg: number;
        comparison_avg: number;
        trend: "improving" | "declining" | "stable";
        change_percent: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [aggregateData, trendData, allMetrics] =
                    await Promise.all([
                        getTrainingMetricsAggregate(),
                        getPerformanceTrend(7, 30),
                        getAllTrainingMetrics(),
                    ]);

                setAggregate(aggregateData);
                setTrend(trendData);
                setMetrics(allMetrics);
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-zinc-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!aggregate || aggregate.total_sessions === 0) {
        return (
            <div className="flex-1 p-8">
                <Heading size="lg">Dashboard</Heading>
                <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-600 mb-4">
                        No training data available yet.
                    </p>
                    <p className="text-sm text-gray-500">
                        Complete some training sessions to see your analytics
                        here.
                    </p>
                </div>
            </div>
        );
    }

    const getTrendDirection = (): "up" | "down" | "neutral" => {
        if (!trend) return "neutral";
        if (trend.trend === "improving") return "up";
        if (trend.trend === "declining") return "down";
        return "neutral";
    };

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <Heading size="lg">Training Dashboard</Heading>
                <p className="text-gray-600 mt-2">
                    Your AI sales training performance overview
                </p>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                    <StatCard
                        label="Total Sessions"
                        value={aggregate.total_sessions}
                        subtitle="All time"
                    />
                    <StatCard
                        label="Overall Score"
                        value={aggregate.avg_overall_score}
                        subtitle="Average performance"
                        trend={getTrendDirection()}
                    />
                    <StatCard
                        label="Talk Ratio"
                        value={`${(aggregate.avg_talk_ratio_rep * 100).toFixed(0)}%`}
                        subtitle="Your speaking time"
                    />
                    <StatCard
                        label="Avg Questions"
                        value={aggregate.avg_questions_asked}
                        subtitle="Per session"
                    />
                </div>

                {/* Performance Trend */}
                {trend && (
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Performance Trend
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <div className="text-sm text-gray-600 mb-1">
                                    Last 7 Days
                                </div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {trend.recent_avg}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 mb-1">
                                    Previous Period (30d)
                                </div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {trend.comparison_avg}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 mb-1">
                                    Change
                                </div>
                                <div
                                    className={`text-2xl font-bold ${
                                        trend.trend === "improving"
                                            ? "text-green-600"
                                            : trend.trend === "declining"
                                              ? "text-red-600"
                                              : "text-gray-900"
                                    }`}
                                >
                                    {trend.change_percent > 0 ? "+" : ""}
                                    {trend.change_percent}%
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Skill Breakdown */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Skill Breakdown
                        </h3>
                        <ScoreBar
                            label="Discovery"
                            score={aggregate.avg_discovery_score}
                        />
                        <ScoreBar
                            label="Objection Handling"
                            score={aggregate.avg_objection_score}
                        />
                        <ScoreBar
                            label="Value Communication"
                            score={aggregate.avg_value_comm_score}
                        />
                        <ScoreBar
                            label="Conversation Control"
                            score={aggregate.avg_conversation_control}
                        />
                        <ScoreBar
                            label="Emotional Intelligence"
                            score={aggregate.avg_emotional_intelligence}
                        />
                    </div>

                    {/* Performance Distribution */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Performance Distribution
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                                <div>
                                    <div className="font-semibold text-green-900">
                                        Excellent (80+)
                                    </div>
                                    <div className="text-sm text-green-700">
                                        Top tier performance
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-green-600">
                                    {
                                        aggregate.performance_distribution
                                            .excellent
                                    }
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div>
                                    <div className="font-semibold text-yellow-900">
                                        Good (60-79)
                                    </div>
                                    <div className="text-sm text-yellow-700">
                                        Solid performance
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-yellow-600">
                                    {aggregate.performance_distribution.good}
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                                <div>
                                    <div className="font-semibold text-red-900">
                                        Needs Improvement (&lt;60)
                                    </div>
                                    <div className="text-sm text-red-700">
                                        Focus area
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-red-600">
                                    {
                                        aggregate.performance_distribution
                                            .needs_improvement
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Common Patterns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Strengths */}
                    {aggregate.most_common_strengths.length > 0 && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm p-6 border border-green-200">
                            <h3 className="text-lg font-bold text-green-900 mb-4">
                                Most Common Strengths
                            </h3>
                            <ul className="space-y-2">
                                {aggregate.most_common_strengths.map(
                                    (strength, index) => (
                                        <li
                                            key={index}
                                            className="flex items-start"
                                        >
                                            <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                                {index + 1}
                                            </span>
                                            <span className="text-gray-800">
                                                {strength}
                                            </span>
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Feedback */}
                    {aggregate.most_common_feedback.length > 0 && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-blue-200">
                            <h3 className="text-lg font-bold text-blue-900 mb-4">
                                Most Common Coaching Feedback
                            </h3>
                            <ul className="space-y-2">
                                {aggregate.most_common_feedback.map(
                                    (feedback, index) => (
                                        <li
                                            key={index}
                                            className="flex items-start"
                                        >
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                                {index + 1}
                                            </span>
                                            <span className="text-gray-800">
                                                {feedback}
                                            </span>
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Recent Sessions */}
                {metrics.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Recent Sessions
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        <th className="pb-3">Date</th>
                                        <th className="pb-3">Scenario</th>
                                        <th className="pb-3">Score</th>
                                        <th className="pb-3">Duration</th>
                                        <th className="pb-3">Questions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {metrics.slice(0, 10).map((metric) => (
                                        <tr
                                            key={metric.session_id}
                                            className="text-sm"
                                        >
                                            <td className="py-3 text-gray-600">
                                                {new Date(
                                                    metric.timestamp
                                                ).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 text-gray-900">
                                                {metric.scenario}
                                            </td>
                                            <td className="py-3">
                                                <span
                                                    className={`font-semibold ${
                                                        metric.overall_score >=
                                                        80
                                                            ? "text-green-600"
                                                            : metric.overall_score >=
                                                                60
                                                              ? "text-yellow-600"
                                                              : "text-red-600"
                                                    }`}
                                                >
                                                    {metric.overall_score}
                                                </span>
                                            </td>
                                            <td className="py-3 text-gray-600">
                                                {Math.floor(
                                                    metric.duration_seconds / 60
                                                )}
                                                m
                                            </td>
                                            <td className="py-3 text-gray-600">
                                                {metric.questions_asked}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
