import type { ProximaAgentConnectionState } from "@/lib/proxima-agent/types";

type StatusLineProps = {
    state: ProximaAgentConnectionState;
};

export function StatusLine({ state }: StatusLineProps) {
    const tone =
        state === "connected"
            ? "text-success"
            : state === "connecting"
              ? "text-warning"
              : state === "error"
                ? "text-danger"
                : "text-text-muted";

    return (
        <p className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-panel px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            Status: <span className={`capitalize ${tone}`}>{state}</span>
        </p>
    );
}
