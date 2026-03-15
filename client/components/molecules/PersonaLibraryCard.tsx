import type { SavedPersona } from "@/lib/persona-storage";
import { useEffect, useState } from "react";

type PersonaLibraryCardProps = {
    persona: SavedPersona;
    imageSrc: string;
    onQuickStart: (personaId: string) => void;
    onViewDetails?: (personaId: string) => void;
    onTogglePriority?: (personaId: string) => void;
    onDelete?: (personaId: string) => void;
    showDelete?: boolean;
};

export function PersonaLibraryCard({
    persona,
    imageSrc,
    onQuickStart,
    onViewDetails,
    onTogglePriority,
    onDelete,
    showDelete = false,
}: PersonaLibraryCardProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const personaName = persona.name || "Unknown Persona";
    const personality =
        (persona.sessionContext?.personality as string | undefined) ||
        "The Pragmatist";
    const company =
        (persona.sessionContext?.company_name as string | undefined) ||
        "Proxima Enterprise";

    // Local date formatting utility
    const formatDate = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "--";
        }
        return date.toISOString().slice(0, 10);
    };

    // Only access sessionStorage on client
    useEffect(() => {
        if (typeof window !== "undefined" && persona.id) {
            const stored = sessionStorage.getItem(
                `persona_image_${persona.id}`
            );
            if (stored) setAvatarUrl(stored);
            else setAvatarUrl(null);
        }
    }, [persona.id]);

    return (
        <article className="group bg-surface-panel border border-border-subtle rounded-2xl p-4 sm:p-6 transition-all hover:border-primary/50 flex flex-col min-h-[320px] w-full min-w-0">
            <div className="flex items-start gap-3 sm:gap-4 mb-5">
                {avatarUrl ? (
                    <img
                        className="w-14 h-14 sm:w-[64px] sm:h-[64px] rounded-xl object-cover border border-border-subtle filter grayscale opacity-80"
                        src={avatarUrl}
                        alt={personaName}
                    />
                ) : (
                    <div className="w-14 h-14 sm:w-[64px] sm:h-[64px] rounded-xl border border-border-subtle bg-surface-hover flex items-center justify-center text-text-muted">
                        <span className="material-symbols-outlined text-2xl">
                            person
                        </span>
                    </div>
                )}
                <div className="flex-1">
                    <h4 className="text-lg font-bold text-text-main leading-tight">
                        {personaName}
                    </h4>
                    <p className="text-sm text-primary font-medium">
                        {persona.jobTitle || "Role not set"}
                    </p>
                    <p className="text-xs text-text-muted">{company}</p>
                </div>
                {showDelete && onDelete ? (
                    <button
                        onClick={() => onDelete(persona.id)}
                        className="material-symbols-outlined text-text-muted cursor-pointer hover:text-danger transition-colors"
                        aria-label="Delete persona"
                    >
                        delete
                    </button>
                ) : null}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2.5 py-1 bg-surface-hover border border-border-subtle text-text-main text-[10px] font-bold rounded uppercase tracking-wider">
                    {personality}
                </span>
                <span className="px-2.5 py-1 bg-surface-hover border border-border-subtle text-text-main text-[10px] font-bold rounded uppercase tracking-wider">
                    {persona.department || "General"}
                </span>
            </div>

            <p className="text-sm text-text-muted leading-relaxed line-clamp-3 mb-auto">
                {persona.jobTitle || "Business leader"} persona calibrated for
                context-rich enterprise sales simulations and coaching drills.
            </p>

            <div className="pt-4 border-t border-border-subtle flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-muted !text-sm">
                        history
                    </span>
                    <span className="text-[11px] text-text-muted">
                        Last used {formatDate(persona.createdAt)}
                    </span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => onTogglePriority?.(persona.id)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${
                            persona.isPriority
                                ? "bg-warning/15 text-warning border-warning/40 hover:bg-warning/20"
                                : "bg-surface-hover text-text-main border-border-subtle hover:bg-surface-panel"
                        }`}
                        aria-label={
                            persona.isPriority
                                ? "Remove from priority personas"
                                : "Mark as priority persona"
                        }
                        title={
                            persona.isPriority
                                ? "Remove priority"
                                : "Mark as priority"
                        }
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{
                                fontVariationSettings: persona.isPriority
                                    ? '"FILL" 1'
                                    : '"FILL" 0',
                            }}
                        >
                            star
                        </span>
                    </button>
                    <button
                        onClick={() => onViewDetails?.(persona.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-hover text-text-main border border-border-subtle hover:bg-surface-panel transition-colors"
                        aria-label="View persona details"
                    >
                        <span className="material-symbols-outlined">
                            visibility
                        </span>
                    </button>
                    <button
                        onClick={() => onQuickStart(persona.id)}
                        className="bg-primary/10 text-primary font-bold px-4 py-1.5 rounded-lg text-xs hover:bg-primary/20 transition-all flex-1 sm:flex-none"
                    >
                        Quick Start
                    </button>
                </div>
            </div>
        </article>
    );
}
