import type { ReactNode } from "react";

type ParticipantTileProps = {
    name: string;
    subtitle?: string;
    isSpeaking?: boolean;
    toneLabel?: string | null;
    children?: ReactNode;
    className?: string;
    compact?: boolean;
};

export function ParticipantTile({
    name,
    subtitle,
    isSpeaking = false,
    toneLabel = null,
    children,
    className = "",
    compact = false,
}: ParticipantTileProps) {
    const sizeClass = compact
        ? "h-[110px] min-h-0 flex-none p-3"
        : "min-h-[240px] p-5";

    return (
        <div
            className={`relative flex flex-col justify-end overflow-hidden rounded-2xl border bg-surface-panel text-white ${compact ? "" : "flex-1"} ${sizeClass} ${className} ${
                isSpeaking
                    ? "border-primary shadow-[0_0_20px_-2px_rgba(13,185,242,0.4)]"
                    : "border-border-subtle"
            }`}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-surface-base/90" />
            <div className="relative z-10 flex items-center justify-between gap-3">
                <div>
                    <p
                        className={
                            compact
                                ? "text-xs font-semibold text-text-main"
                                : "text-sm font-bold text-text-main"
                        }
                    >
                        {name}
                    </p>
                    {subtitle && !compact ? (
                        <p className="text-xs text-text-muted">{subtitle}</p>
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    {toneLabel ? (
                        <button
                            type="button"
                            title={`Tone: ${toneLabel}`}
                            className={`flex items-center justify-center rounded-full border border-border-subtle bg-surface-hover/70 text-text-muted hover:text-text-main ${
                                compact
                                    ? "w-5 h-5 text-[10px]"
                                    : "w-6 h-6 text-xs"
                            }`}
                        >
                            i
                        </button>
                    ) : null}
                    {isSpeaking ? (
                        <span
                            className={`rounded-full bg-primary/20 border border-primary/30 text-primary font-semibold uppercase tracking-wide ${
                                compact
                                    ? "px-1.5 py-0.5 text-[9px]"
                                    : "px-2 py-1 text-[10px]"
                            }`}
                        >
                            Live
                        </span>
                    ) : null}
                </div>
            </div>
            {children}
        </div>
    );
}
