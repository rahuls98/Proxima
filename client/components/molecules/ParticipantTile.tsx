import type { ReactNode } from "react";

type ParticipantTileProps = {
    name: string;
    subtitle?: string;
    isSpeaking?: boolean;
    children?: ReactNode;
    className?: string;
    compact?: boolean;
};

export function ParticipantTile({
    name,
    subtitle,
    isSpeaking = false,
    children,
    className = "",
    compact = false,
}: ParticipantTileProps) {
    const sizeClass = compact
        ? "h-[100px] min-h-0 flex-none p-2"
        : "min-h-[220px] p-4";

    return (
        <div
            className={`relative flex flex-col justify-end overflow-hidden rounded-2xl border bg-zinc-900 text-white ${compact ? "" : "flex-1"} ${sizeClass} ${className} ${
                isSpeaking
                    ? "border-emerald-400 ring-2 ring-emerald-300"
                    : "border-zinc-700"
            }`}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-700/30 to-zinc-950/90" />
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>
                        {name}
                    </p>
                    {subtitle && !compact ? (
                        <p className="text-xs text-zinc-300">{subtitle}</p>
                    ) : null}
                </div>
                {isSpeaking ? (
                    <span
                        className={`rounded-full bg-emerald-500 font-semibold uppercase tracking-wide ${
                            compact
                                ? "px-1.5 py-0.5 text-[9px]"
                                : "px-2 py-1 text-[10px]"
                        }`}
                    >
                        Talking
                    </span>
                ) : null}
            </div>
            {children}
        </div>
    );
}
