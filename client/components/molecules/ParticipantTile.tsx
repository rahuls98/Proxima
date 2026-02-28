import type { ReactNode } from "react";

type ParticipantTileProps = {
    name: string;
    subtitle?: string;
    isSpeaking?: boolean;
    children?: ReactNode;
};

export function ParticipantTile({
    name,
    subtitle,
    isSpeaking = false,
    children,
}: ParticipantTileProps) {
    return (
        <div
            className={`relative flex min-h-[220px] flex-1 flex-col justify-end overflow-hidden rounded-2xl border bg-zinc-900 p-4 text-white ${
                isSpeaking
                    ? "border-emerald-400 ring-2 ring-emerald-300"
                    : "border-zinc-700"
            }`}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-700/30 to-zinc-950/90" />
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold">{name}</p>
                    {subtitle ? (
                        <p className="text-xs text-zinc-300">{subtitle}</p>
                    ) : null}
                </div>
                {isSpeaking ? (
                    <span className="rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
                        Talking
                    </span>
                ) : null}
            </div>
            {children}
        </div>
    );
}
