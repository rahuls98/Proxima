import type { ProximaAgentConnectionState } from "@/lib/proxima-agent/types";

type StatusLineProps = {
    state: ProximaAgentConnectionState;
};

export function StatusLine({ state }: StatusLineProps) {
    return (
        <p className="text-sm">
            Status: <span className="font-medium capitalize">{state}</span>
        </p>
    );
}
