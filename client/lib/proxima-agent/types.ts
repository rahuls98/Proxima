export type ProximaAgentConnectionState =
    | "disconnected"
    | "connecting"
    | "connected"
    | "muted"
    | "error";

export type TranscriptRole = "user" | "bot" | "teammate" | "system" | "coach";

export type TranscriptItem = {
    id: number;
    role: TranscriptRole;
    text: string;
    createdAt?: string;
};

export type CoachingInterventionType =
    | "MONOLOGUE"
    | "STUMBLING"
    | "RESPONSE_ASSIST"
    | "OBJECTION_RECOVERY"
    | "INTERRUPTING";

export type ProximaAgentInboundMessage = {
    type?:
        | "session_ready"
        | "stream_started"
        | "stream_stopped"
        | "file_uploaded"
        | "user_text"
        | "text"
        | "audio"
        | "turn_complete"
        | "waiting_for_input"
        | "interruption"
        | "warning"
        | "error"
        | "pong"
        | "coach_intervention";
    text?: string;
    message?: string;
    mode?: string;
    session_id?: string;
    audio?: string;
    mimeType?: string;
    fileId?: string;
    fileName?: string;
    speaker?: "rep" | "prospect" | "teammate";
    payload?: {
        category?: CoachingInterventionType;
        hint?: string;
    };
};

export type ProximaAgentOutboundMessage =
    | { type: "stream_start" }
    | { type: "stream_stop" }
    | { type: "activity_end" }
    | { type: "ping" }
    | { type: "disconnect" }
    | { type: "end_session" }
    | { type: "screen_share_start" }
    | { type: "screen_share_stop" }
    | { type: "set_system_instruction"; instruction: string }
    | {
          type: "file_upload";
          fileName: string;
          mimeType: string;
          data: string;
      }
    | {
          type: "user_message";
          text: string;
      }
    | {
          type: "screen_frame";
          image: string;
          mimeType?: string;
      };

export type ProximaAgentEvent =
    | { type: "session_ready"; mode?: string; session_id?: string }
    | { type: "stream_started" }
    | { type: "stream_stopped" }
    | { type: "file_uploaded"; fileId: string; fileName: string }
    | { type: "user_text"; text: string }
    | { type: "text"; text: string; speaker?: "prospect" | "teammate" }
    | { type: "audio" }
    | { type: "turn_complete" }
    | { type: "waiting_for_input" }
    | { type: "interruption" }
    | { type: "warning"; message: string }
    | { type: "error"; message: string }
    | { type: "socket_closed"; code: number }
    | {
          type: "coach_intervention";
          category: CoachingInterventionType;
          hint: string;
      };
