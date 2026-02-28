"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { IconButton } from "@/components/atoms/IconButton";
import { ChatComposer } from "@/components/molecules/ChatComposer";
import { ChatTranscript } from "@/components/molecules/ChatTranscript";
import { ParticipantTile } from "@/components/molecules/ParticipantTile";
import { ProximaAgentService } from "@/lib/proxima-agent/service";
import type {
    ProximaAgentConnectionState,
    ProximaAgentEvent,
    TranscriptItem,
} from "@/lib/proxima-agent/types";

function mergeTextWithOverlap(existing: string, incoming: string): string {
    if (!existing) {
        return incoming;
    }
    if (!incoming) {
        return existing;
    }

    const maxOverlap = Math.min(existing.length, incoming.length);
    for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
        if (existing.slice(-overlap) === incoming.slice(0, overlap)) {
            return existing + incoming.slice(overlap);
        }
    }

    return existing + incoming;
}

export function MeetingRoom() {
    const [state, setState] =
        useState<ProximaAgentConnectionState>("disconnected");
    const [message, setMessage] = useState("Press Join to begin.");
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
    const [activeSpeaker, setActiveSpeaker] = useState<"user" | "agent" | null>(
        null
    );
    const isScreenShareActive = false;

    const serviceRef = useRef<ProximaAgentService | null>(null);
    const stateRef = useRef<ProximaAgentConnectionState>("disconnected");
    const transcriptIdRef = useRef(0);
    const currentBotMessageIdRef = useRef<number | null>(null);
    const currentUserMessageIdRef = useRef<number | null>(null);
    const speakerTimeoutRef = useRef<number | null>(null);

    const markSpeaker = useCallback((speaker: "user" | "agent") => {
        setActiveSpeaker(speaker);
        if (speakerTimeoutRef.current) {
            window.clearTimeout(speakerTimeoutRef.current);
        }
        speakerTimeoutRef.current = window.setTimeout(() => {
            setActiveSpeaker(stateRef.current === "connected" ? "user" : null);
        }, 1200);
    }, []);

    const appendTranscript = useCallback(
        (role: TranscriptItem["role"], text: string) => {
            transcriptIdRef.current += 1;
            const id = transcriptIdRef.current;
            setTranscript((prev) => [...prev, { id, role, text }]);
            return id;
        },
        []
    );

    const updateTranscriptText = useCallback((id: number, text: string) => {
        setTranscript((prev) =>
            prev.map((entry) => (entry.id === id ? { ...entry, text } : entry))
        );
    }, []);

    const appendBotText = useCallback(
        (chunk: string) => {
            if (!chunk) {
                return;
            }

            const existingId = currentBotMessageIdRef.current;
            if (existingId === null) {
                currentBotMessageIdRef.current = appendTranscript("bot", chunk);
                return;
            }

            setTranscript((prev) =>
                prev.map((entry) =>
                    entry.id === existingId
                        ? {
                              ...entry,
                              text: mergeTextWithOverlap(entry.text, chunk),
                          }
                        : entry
                )
            );
        },
        [appendTranscript]
    );

    const handleEvent = useCallback(
        (event: ProximaAgentEvent) => {
            switch (event.type) {
                case "session_ready":
                    if (
                        stateRef.current === "connecting" ||
                        stateRef.current === "disconnected"
                    ) {
                        setState("muted");
                        stateRef.current = "muted";
                        setMessage(
                            `Connected (${event.mode ?? "training"} mode). Unmute to begin speaking.`
                        );
                    }
                    return;
                case "stream_started":
                    setState("connected");
                    stateRef.current = "connected";
                    setMessage("Live conversation in progress.");
                    appendTranscript("system", "Microphone unmuted.");
                    setActiveSpeaker("user");
                    return;
                case "stream_stopped":
                    setState("muted");
                    stateRef.current = "muted";
                    setMessage("Microphone muted.");
                    appendTranscript("system", "Microphone muted.");
                    setActiveSpeaker(null);
                    return;
                case "user_text": {
                    markSpeaker("user");
                    const existingId = currentUserMessageIdRef.current;
                    if (existingId === null) {
                        currentUserMessageIdRef.current = appendTranscript(
                            "user",
                            event.text
                        );
                    } else {
                        updateTranscriptText(existingId, event.text);
                    }
                    return;
                }
                case "text":
                    markSpeaker("agent");
                    currentUserMessageIdRef.current = null;
                    appendBotText(event.text);
                    return;
                case "turn_complete":
                    currentBotMessageIdRef.current = null;
                    if (stateRef.current === "connected") {
                        setMessage("Live conversation in progress.");
                    }
                    return;
                case "waiting_for_input":
                    if (stateRef.current === "connected") {
                        setMessage("Listening...");
                    }
                    return;
                case "interruption":
                    currentBotMessageIdRef.current = null;
                    appendTranscript("system", "Interrupted.");
                    setActiveSpeaker("user");
                    return;
                case "warning":
                    appendTranscript("system", event.message);
                    return;
                case "error":
                    setState("error");
                    stateRef.current = "error";
                    setMessage(event.message);
                    appendTranscript("system", event.message);
                    return;
                case "socket_closed":
                    setState("error");
                    stateRef.current = "error";
                    setMessage(`Socket closed (${event.code}).`);
                    appendTranscript(
                        "system",
                        `Socket closed (${event.code}).`
                    );
                    return;
                default:
                    return;
            }
        },
        [appendBotText, appendTranscript, markSpeaker, updateTranscriptText]
    );

    useEffect(() => {
        serviceRef.current = new ProximaAgentService({
            mode: "training",
            onEvent: handleEvent,
        });

        return () => {
            serviceRef.current?.destroy();
            serviceRef.current = null;
            if (speakerTimeoutRef.current) {
                window.clearTimeout(speakerTimeoutRef.current);
            }
        };
    }, [handleEvent]);

    const connect = async () => {
        if (!serviceRef.current) {
            return;
        }

        try {
            setState("connecting");
            stateRef.current = "connecting";
            setMessage("Connecting...");
            await serviceRef.current.connect();
            appendTranscript("system", "Session joined.");
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to connect to Proxima Agent.";
            setState("error");
            stateRef.current = "error";
            setMessage(errorMessage);
            appendTranscript("system", errorMessage);
        }
    };

    const toggleMute = () => {
        if (!serviceRef.current) {
            return;
        }

        if (state === "muted") {
            serviceRef.current.startStream();
            return;
        }

        if (state === "connected") {
            serviceRef.current.stopStream();
        }
    };

    const endSession = () => {
        serviceRef.current?.disconnect();
        setState("disconnected");
        stateRef.current = "disconnected";
        setMessage("Session ended.");
        appendTranscript("system", "Session ended.");
        currentBotMessageIdRef.current = null;
        currentUserMessageIdRef.current = null;
        setActiveSpeaker(null);
    };

    const notImplemented = (name: string) => {
        window.alert(`${name} is not implemented yet.`);
    };

    const onAttach = () => notImplemented("Attach files");
    const onSendText = (text: string) => {
        window.alert(
            `Text message sending is not implemented yet. Draft length: ${text.length} characters.`
        );
    };

    return (
        <section className="grid h-[calc(100vh-4rem)] w-full grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-4 rounded-2xl bg-zinc-100 p-4">
            <div className="flex min-w-0 flex-col gap-4">
                <div
                    className={`min-h-0 flex flex-1 ${
                        isScreenShareActive
                            ? "items-start justify-center"
                            : "items-center justify-center"
                    }`}
                >
                    <div className="flex w-full max-w-[1200px] flex-col gap-4">
                        {isScreenShareActive ? (
                            <div className="min-h-[320px]">
                                <ParticipantTile
                                    name="Screen Share"
                                    subtitle="Shared Content"
                                />
                            </div>
                        ) : null}

                        <div className="grid min-h-[260px] grid-cols-2 gap-4">
                            <ParticipantTile
                                name="You"
                                subtitle={
                                    state === "muted"
                                        ? "Muted"
                                        : "Microphone live"
                                }
                                isSpeaking={activeSpeaker === "user"}
                            />
                            <ParticipantTile
                                name="Agent"
                                subtitle="Training Agent"
                                isSpeaking={activeSpeaker === "agent"}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-center">
                    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-sm">
                        {state === "disconnected" ||
                        state === "error" ||
                        state === "connecting" ? (
                            <IconButton
                                label="Join"
                                icon={
                                    <span className="text-[10px] font-bold">
                                        Join
                                    </span>
                                }
                                onClick={connect}
                                disabled={state === "connecting"}
                            />
                        ) : null}
                        <IconButton
                            label={state === "connected" ? "Mute" : "Unmute"}
                            icon={<span>🎤</span>}
                            onClick={toggleMute}
                            disabled={
                                state !== "connected" && state !== "muted"
                            }
                        />
                        <IconButton
                            label="Share Screen"
                            icon={<span>🖥️</span>}
                            onClick={() => notImplemented("Share screen")}
                            disabled={
                                state === "disconnected" ||
                                state === "connecting"
                            }
                        />
                        <IconButton
                            label="Camera"
                            icon={<span>📷</span>}
                            onClick={() => notImplemented("Camera control")}
                            disabled={
                                state === "disconnected" ||
                                state === "connecting"
                            }
                        />
                        <IconButton
                            label="More"
                            icon={<span>⋯</span>}
                            onClick={() => notImplemented("More actions")}
                            disabled={
                                state === "disconnected" ||
                                state === "connecting"
                            }
                        />
                        <IconButton
                            label="End Session"
                            icon={<span>⏹</span>}
                            onClick={endSession}
                            disabled={
                                state === "disconnected" ||
                                state === "connecting"
                            }
                            danger
                        />
                    </div>
                </div>
            </div>

            <section className="flex min-w-[320px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <header className="border-b border-zinc-200 px-4 py-3">
                    <h2 className="text-sm font-semibold">Chat</h2>
                    <p className="mt-1 text-xs text-zinc-500">{message}</p>
                </header>
                <div className="min-h-0 flex-1 overflow-auto p-3">
                    <ChatTranscript transcript={transcript} />
                </div>
                <ChatComposer
                    onAttach={onAttach}
                    onSend={onSendText}
                    disabled={
                        state === "disconnected" || state === "connecting"
                    }
                />
            </section>
        </section>
    );
}
