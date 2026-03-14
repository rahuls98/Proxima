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
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20",
    },
    STUMBLING: {
        emoji: "🧘",
        label: "Composure",
        color: "text-primary",
        bgColor: "bg-primary/10 border-primary/20",
    },
    RESPONSE_ASSIST: {
        emoji: "💡",
        label: "Try This",
        color: "text-success",
        bgColor: "bg-success/10 border-success/20",
    },
    OBJECTION_RECOVERY: {
        emoji: "🔄",
        label: "Pivot Strategy",
        color: "text-primary",
        bgColor: "bg-primary/10 border-primary/20",
    },
    INTERRUPTING: {
        emoji: "✋",
        label: "Active Listen",
        color: "text-danger",
        bgColor: "bg-danger/10 border-danger/20",
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
                    rounded-2xl border shadow-2xl
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
            </div>
        </div>
    );
}
