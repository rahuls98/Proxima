import type { ProximaAgentConnectionState } from "@/lib/proxima-agent/types";

import { Button } from "@/components/atoms/Button";

type ControlRowProps = {
    state: ProximaAgentConnectionState;
    onConnect: () => void;
    onToggleMute: () => void;
    onDisconnect: () => void;
};

export function ControlRow({
    state,
    onConnect,
    onToggleMute,
    onDisconnect,
}: ControlRowProps) {
    return (
        <div className="flex gap-3">
            <Button
                variant="primary"
                onClick={onConnect}
                disabled={
                    state === "connecting" ||
                    state === "connected" ||
                    state === "muted"
                }
            >
                Connect
            </Button>
            <Button
                onClick={onToggleMute}
                disabled={state !== "connected" && state !== "muted"}
            >
                {state === "muted" ? "Unmute" : "Mute"}
            </Button>
            <Button
                onClick={onDisconnect}
                disabled={state === "disconnected" || state === "connecting"}
            >
                Disconnect
            </Button>
        </div>
    );
}
