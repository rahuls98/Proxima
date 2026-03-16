import type { TranscriptItem } from "@/lib/proxima-agent/types";

type ChatTranscriptProps = {
    transcript: TranscriptItem[];
    sessionStartedAt?: number | null;
};

export function ChatTranscript({
    transcript,
    sessionStartedAt,
}: ChatTranscriptProps) {
    const formatTimestamp = (createdAt?: string) => {
        if (sessionStartedAt == null) {
            return "00:00";
        }

        const createdAtMs = createdAt ? new Date(createdAt).getTime() : NaN;
        const referenceMs = Number.isNaN(createdAtMs)
            ? sessionStartedAt
            : createdAtMs;
        const elapsedSeconds = Math.max(
            0,
            Math.floor((referenceMs - sessionStartedAt) / 1000)
        );
        const minutes = Math.floor(elapsedSeconds / 60)
            .toString()
            .padStart(2, "0");
        const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");

        return `${minutes}:${seconds}`;
    };

    return (
        <div className="space-y-2 text-sm">
            {transcript.length === 0 ? (
                <p className="text-text-placeholder text-xs px-1">
                    Start the conversation to see transcript updates.
                </p>
            ) : (
                transcript.map((entry) => (
                    <div
                        key={entry.id}
                        className={
                            entry.role === "user"
                                ? "flex justify-end"
                                : entry.role === "bot" ||
                                    entry.role === "teammate"
                                  ? "flex justify-start"
                                  : entry.role === "coach"
                                    ? "flex justify-center"
                                    : "flex justify-center"
                        }
                    >
                        {entry.role === "user" || entry.role === "bot" ? (
                            <div className="max-w-[85%] space-y-1">
                                <p
                                    className={
                                        entry.role === "user"
                                            ? "rounded-2xl rounded-br-md bg-primary/20 border border-primary/20 px-3 py-2 text-text-main"
                                            : "rounded-2xl rounded-bl-md bg-surface-panel border border-border-subtle px-3 py-2 text-text-main"
                                    }
                                >
                                    {entry.text}
                                </p>
                                <p
                                    className={
                                        entry.role === "user"
                                            ? "text-[10px] text-text-muted text-right px-1"
                                            : "text-[10px] text-text-muted text-left px-1"
                                    }
                                >
                                    {entry.role === "user" ? "You" : "Agent"} •{" "}
                                    {formatTimestamp(entry.createdAt)}
                                </p>
                            </div>
                        ) : (
                            <p
                                className={
                                    entry.role === "coach"
                                        ? "max-w-[92%] rounded-xl bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning"
                                        : "max-w-[90%] rounded-full bg-surface-hover border border-border-subtle px-3 py-1 text-xs text-text-muted"
                                }
                            >
                                {entry.text}
                            </p>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
