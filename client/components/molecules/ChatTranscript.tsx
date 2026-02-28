import type { TranscriptItem } from "@/lib/proxima-agent/types";

type ChatTranscriptProps = {
    transcript: TranscriptItem[];
};

export function ChatTranscript({ transcript }: ChatTranscriptProps) {
    return (
        <div className="space-y-2 text-sm">
            {transcript.length === 0 ? (
                <p className="text-zinc-500"></p>
            ) : (
                transcript.map((entry) => (
                    <div
                        key={entry.id}
                        className={
                            entry.role === "user"
                                ? "flex justify-end"
                                : entry.role === "bot"
                                  ? "flex justify-start"
                                  : "flex justify-center"
                        }
                    >
                        <p
                            className={
                                entry.role === "user"
                                    ? "max-w-[85%] rounded-2xl rounded-br-md bg-zinc-900 px-3 py-2 text-zinc-100"
                                    : entry.role === "bot"
                                      ? "max-w-[85%] rounded-2xl rounded-bl-md bg-zinc-100 px-3 py-2 text-zinc-900"
                                      : "max-w-[90%] rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500"
                            }
                        >
                            {entry.text}
                        </p>
                    </div>
                ))
            )}
        </div>
    );
}
