"use client";

import { useEffect, useState } from "react";
import type { CoachingInterventionType } from "@/lib/proxima-agent/types";

type CoachingHintProps = {
    category: CoachingInterventionType;
    hint: string;
    onDismiss: () => void;
};

const CATEGORY_CONFIG: Record<
    CoachingInterventionType,
    { emoji: string; label: string; color: string; bgColor: string }
> = {
    MONOLOGUE: {
        emoji: "⏸️",
        label: "Pause & Ask",
        color: "text-amber-900",
        bgColor: "bg-amber-50 border-amber-200",
    },
    STUMBLING: {
        emoji: "🧘",
        label: "Composure",
        color: "text-blue-900",
        bgColor: "bg-blue-50 border-blue-200",
    },
    RESPONSE_ASSIST: {
        emoji: "💡",
        label: "Try This",
        color: "text-emerald-900",
        bgColor: "bg-emerald-50 border-emerald-200",
    },
    OBJECTION_RECOVERY: {
        emoji: "🔄",
        label: "Pivot Strategy",
        color: "text-purple-900",
        bgColor: "bg-purple-50 border-purple-200",
    },
    INTERRUPTING: {
        emoji: "✋",
        label: "Active Listen",
        color: "text-rose-900",
        bgColor: "bg-rose-50 border-rose-200",
    },
};

export function CoachingHint({ category, hint, onDismiss }: CoachingHintProps) {
    const [isVisible, setIsVisible] = useState(false);
    const config = CATEGORY_CONFIG[category];

    useEffect(() => {
        // Fade in animation
        const showTimer = setTimeout(() => setIsVisible(true), 50);

        // Auto-dismiss after 8 seconds
        const dismissTimer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
        }, 8000);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(dismissTimer);
        };
    }, [onDismiss]);

    const handleDismissClick = () => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
    };

    return (
        <div
            className={`
                w-full max-w-md
                transform transition-all duration-300 ease-out
                ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}
            `}
        >
            <div
                className={`
                    ${config.bgColor} ${config.color}
                    rounded-xl border-2 shadow-2xl
                    backdrop-blur-sm
                `}
            >
                <div className="flex items-start gap-3 p-4">
                    <div className="flex-shrink-0 text-2xl">{config.emoji}</div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="text-sm font-bold uppercase tracking-wide">
                                {config.label}
                            </h3>
                            <button
                                onClick={handleDismissClick}
                                className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
                                aria-label="Dismiss coaching hint"
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
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm leading-relaxed">{hint}</p>
                    </div>
                </div>
                <div className="h-1 bg-current opacity-20 rounded-b-lg">
                    <div
                        className="h-full bg-current opacity-50 rounded-b-lg"
                        style={{
                            animation: "shrink 8s linear forwards",
                        }}
                    />
                </div>
            </div>
            <style jsx>{`
                @keyframes shrink {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `}</style>
        </div>
    );
}
