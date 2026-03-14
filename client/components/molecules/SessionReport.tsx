import type { SessionReport as SessionReportData } from "@/lib/api";

type SessionReportProps = {
    report: SessionReportData;
    onClose: () => void;
};

export function SessionReport({ report, onClose }: SessionReportProps) {
    const score = report.overall_score.score;

    return (
        <div className="fixed inset-0 bg-surface-base/85 backdrop-blur-md z-50 p-4 flex items-center justify-center">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-surface-panel border border-border-subtle rounded-2xl">
                <div className="sticky top-0 bg-surface-panel/95 backdrop-blur border-b border-border-subtle px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            Session Performance Report
                        </h2>
                        <p className="text-xs text-text-muted uppercase tracking-wider mt-1">
                            {report.session_overview.scenario} |{" "}
                            {report.session_overview.prospect_persona}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg bg-surface-hover border border-border-subtle text-text-main"
                        aria-label="Close report"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-surface-base border border-border-subtle rounded-xl p-4">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">
                                Overall Score
                            </p>
                            <p className="text-3xl font-extrabold text-white">
                                {score}%
                            </p>
                        </div>
                        <div className="bg-surface-base border border-border-subtle rounded-xl p-4">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">
                                Rep Talk Ratio
                            </p>
                            <p className="text-3xl font-extrabold text-white">
                                {Math.round(
                                    report.conversation_metrics.talk_ratio_rep *
                                        100
                                )}
                                %
                            </p>
                        </div>
                        <div className="bg-surface-base border border-border-subtle rounded-xl p-4">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">
                                Questions
                            </p>
                            <p className="text-3xl font-extrabold text-white">
                                {report.conversation_metrics.questions_asked}
                            </p>
                        </div>
                        <div className="bg-surface-base border border-border-subtle rounded-xl p-4">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">
                                Commitment
                            </p>
                            <p
                                className={`text-sm font-bold uppercase tracking-wider mt-2 ${report.deal_progression.commitment_secured ? "text-success" : "text-warning"}`}
                            >
                                {report.deal_progression.commitment_secured
                                    ? "Secured"
                                    : "Not Secured"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-surface-base border border-border-subtle rounded-xl p-5">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
                                Top Feedback
                            </h3>
                            <ul className="space-y-2">
                                {report.top_feedback.map((item, idx) => (
                                    <li
                                        key={idx}
                                        className="text-sm text-text-main flex items-start gap-2"
                                    >
                                        <span className="text-primary font-bold">
                                            {idx + 1}.
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-surface-base border border-border-subtle rounded-xl p-5">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
                                Strengths
                            </h3>
                            <ul className="space-y-2">
                                {report.strengths.map((item, idx) => (
                                    <li
                                        key={idx}
                                        className="text-sm text-text-main flex items-start gap-2"
                                    >
                                        <span className="text-success font-bold">
                                            {idx + 1}.
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="bg-surface-base border border-border-subtle rounded-xl p-5">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
                            Recommended Practice
                        </h3>
                        <p className="text-sm text-text-main mb-2">
                            Focus Area:{" "}
                            {report.practice_recommendations.focus_area}
                        </p>
                        <p className="text-sm text-text-muted">
                            {
                                report.practice_recommendations
                                    .recommended_exercise
                            }
                        </p>
                    </div>

                    <div className="border-t border-border-subtle pt-4 flex items-center justify-between">
                        <p className="text-xs text-text-muted">
                            Session ID: {report.session_overview.session_id}
                        </p>
                        <button
                            onClick={onClose}
                            className="bg-primary text-surface-base font-bold px-6 py-2.5 rounded-lg hover:opacity-90"
                        >
                            Close Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
