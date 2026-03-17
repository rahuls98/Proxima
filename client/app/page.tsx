"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
    const router = useRouter();

    return (
        <div className="h-screen w-full bg-surface-base text-text-main flex items-center justify-center px-8">
            <div className="w-full max-w-6xl h-full flex flex-col justify-center">
                {/* TOP: HERO + VALUE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            Rehearse real sales conversations before they happen
                        </h1>

                        <p className="mt-4 text-text-muted leading-relaxed max-w-lg">
                            Practice live conversations with realistic
                            prospects, handle objections in real time, and walk
                            into calls prepared.
                        </p>

                        <div className="mt-6">
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="bg-primary text-surface-base font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity"
                            >
                                <span className="material-symbols-outlined">
                                    arrow_forward
                                </span>
                                Enter Proxima
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: VALUE CARDS */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-surface-panel border border-border-subtle rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-1">
                                Real conversation simulation
                            </h3>
                            <p className="text-text-muted text-sm">
                                Dynamic, interruptible conversations with
                                realistic prospects and multi-participant
                                scenarios.
                            </p>
                        </div>

                        <div className="bg-surface-panel border border-border-subtle rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-1">
                                Context-driven, multimodal training
                            </h3>
                            <p className="text-text-muted text-sm">
                                Ground sessions in real prospects, deal stages,
                                and assets like decks, notes, and files. Proxima
                                interprets multimodal inputs to shape more
                                realistic conversations.
                            </p>
                        </div>

                        <div className="bg-surface-panel border border-border-subtle rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-1">
                                Coaching and insights
                            </h3>
                            <p className="text-text-muted text-sm">
                                Real-time guidance and structured post-session
                                analysis to improve performance.
                            </p>
                        </div>
                    </div>
                </div>

                {/* DIVIDER */}
                <div className="mt-10 border-t border-border-subtle" />

                {/* BOTTOM STRIP: HOW IT WORKS */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="bg-surface-panel border border-border-subtle rounded-2xl p-4">
                        <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">
                            Step 1
                        </p>
                        <p className="text-sm font-semibold text-white mb-1">
                            Define context
                        </p>
                        <p className="text-text-muted text-xs leading-relaxed">
                            Set the prospect, stage, and scenario so the
                            simulation reflects your actual deal.
                        </p>
                    </div>

                    <div className="bg-surface-panel border border-border-subtle rounded-2xl p-4">
                        <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">
                            Step 2
                        </p>
                        <p className="text-sm font-semibold text-white mb-1">
                            Run simulation
                        </p>
                        <p className="text-text-muted text-xs leading-relaxed">
                            Engage in a live, interruptible conversation with AI
                            participants reacting in real time.
                        </p>
                    </div>

                    <div className="bg-surface-panel border border-border-subtle rounded-2xl p-4">
                        <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">
                            Step 3
                        </p>
                        <p className="text-sm font-semibold text-white mb-1">
                            Review and improve
                        </p>
                        <p className="text-text-muted text-xs leading-relaxed">
                            Analyze performance across discovery, clarity, and
                            objection handling before the real call.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
