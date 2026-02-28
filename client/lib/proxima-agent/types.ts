export type ProximaAgentConnectionState =
    | "disconnected"
    | "connecting"
    | "connected"
    | "muted"
    | "error";

export type TranscriptRole = "user" | "bot" | "system";

export type TranscriptItem = {
    id: number;
    role: TranscriptRole;
    text: string;
};

export type ProximaAgentInboundMessage = {
    type?:
        | "session_ready"
        | "stream_started"
        | "stream_stopped"
        | "user_text"
        | "text"
        | "audio"
        | "turn_complete"
        | "waiting_for_input"
        | "interruption"
        | "warning"
        | "error"
        | "pong";
    text?: string;
    message?: string;
    mode?: string;
    audio?: string;
    mimeType?: string;
};

export type ProximaAgentEvent =
    | { type: "session_ready"; mode?: string }
    | { type: "stream_started" }
    | { type: "stream_stopped" }
    | { type: "user_text"; text: string }
    | { type: "text"; text: string }
    | { type: "turn_complete" }
    | { type: "waiting_for_input" }
    | { type: "interruption" }
    | { type: "warning"; message: string }
    | { type: "error"; message: string }
    | { type: "socket_closed"; code: number };
