"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
} from "react";

import { IconButton } from "@/components/atoms/IconButton";
import { ChatComposer } from "@/components/molecules/ChatComposer";
import { ChatTranscript } from "@/components/molecules/ChatTranscript";
import { ParticipantTile } from "@/components/molecules/ParticipantTile";
import { startScreenFrameCapture } from "@/lib/proxima-agent/screen-share";
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
    const [screenShareStream, setScreenShareStream] =
        useState<MediaStream | null>(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const isScreenShareActive = screenShareStream !== null;

    const serviceRef = useRef<ProximaAgentService | null>(null);
    const stateRef = useRef<ProximaAgentConnectionState>("disconnected");
    const transcriptIdRef = useRef(0);
    const currentBotMessageIdRef = useRef<number | null>(null);
    const currentUserMessageIdRef = useRef<number | null>(null);
    const speakerTimeoutRef = useRef<number | null>(null);
    const screenShareStreamRef = useRef<MediaStream | null>(null);
    const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);
    const screenCaptureCleanupRef = useRef<(() => void) | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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
                case "file_uploaded":
                    appendTranscript(
                        "system",
                        `File uploaded: ${event.fileName}. Proxima is extracting context.`
                    );
                    return;
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
            if (screenCaptureCleanupRef.current) {
                screenCaptureCleanupRef.current();
                screenCaptureCleanupRef.current = null;
            }
            const existingShareStream = screenShareStreamRef.current;
            if (existingShareStream) {
                screenShareStreamRef.current = null;
                existingShareStream
                    .getTracks()
                    .forEach((track) => track.stop());
            }
        };
    }, [handleEvent]);

    useEffect(() => {
        if (!screenShareVideoRef.current) {
            return;
        }
        screenShareVideoRef.current.srcObject = screenShareStream;
    }, [screenShareStream]);

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

    const stopScreenShare = (notify = true) => {
        if (screenCaptureCleanupRef.current) {
            screenCaptureCleanupRef.current();
            screenCaptureCleanupRef.current = null;
        }

        const existingShareStream = screenShareStreamRef.current;
        if (existingShareStream) {
            screenShareStreamRef.current = null;
            existingShareStream.getTracks().forEach((track) => track.stop());
            setScreenShareStream(null);
        }

        serviceRef.current?.stopScreenShare();

        if (notify) {
            appendTranscript("system", "Screen sharing stopped.");
        }
    };

    const endSession = () => {
        stopScreenShare(false);
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

    const onAttach = () => {
        fileInputRef.current?.click();
    };
    const onSendText = (text: string) => {
        if (!serviceRef.current) {
            return;
        }
        serviceRef.current.sendTextMessage(text);
        appendTranscript("user", text);
        currentUserMessageIdRef.current = null;
    };

    const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        event.target.value = "";

        if (!selectedFile || !serviceRef.current) {
            return;
        }

        try {
            setIsUploadingFile(true);
            appendTranscript("system", `Uploading ${selectedFile.name}...`);
            await serviceRef.current.uploadFile(selectedFile);
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to upload file.";
            appendTranscript("system", `Upload failed: ${errorMessage}`);
        } finally {
            setIsUploadingFile(false);
        }
    };

    const toggleScreenShare = async () => {
        if (screenShareStreamRef.current) {
            stopScreenShare();
            return;
        }

        if (
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getDisplayMedia !== "function"
        ) {
            appendTranscript(
                "system",
                "Screen sharing is not supported in this browser."
            );
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false,
            });

            screenShareStreamRef.current = stream;
            setScreenShareStream(stream);
            serviceRef.current?.startScreenShare();
            appendTranscript("system", "Screen sharing started.");

            screenCaptureCleanupRef.current = await startScreenFrameCapture({
                stream,
                onFrame: (frame) => {
                    serviceRef.current?.sendScreenFrame(
                        frame.imageBase64,
                        frame.mimeType
                    );
                },
            });

            const [videoTrack] = stream.getVideoTracks();
            if (videoTrack) {
                videoTrack.addEventListener("ended", () => {
                    if (screenShareStreamRef.current === stream) {
                        stopScreenShare();
                    }
                });
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unable to start screen sharing.";
            appendTranscript("system", `Screen share failed: ${errorMessage}`);
        }
    };

    return (
        <section className="grid h-[calc(100vh-4rem)] w-full grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-4 rounded-2xl bg-zinc-100 p-4">
            <div className="flex min-w-0 flex-col gap-4">
                <div
                    className={`min-h-0 flex flex-1 ${
                        isScreenShareActive
                            ? "items-stretch justify-stretch"
                            : "items-center justify-center"
                    }`}
                >
                    <div
                        className={`flex w-full flex-col gap-4 ${
                            isScreenShareActive
                                ? "max-w-none"
                                : "max-w-[1200px]"
                        }`}
                    >
                        {isScreenShareActive ? (
                            <div className="flex min-h-0 flex-1 flex-col gap-3">
                                <div className="flex shrink-0 justify-center">
                                    <div className="grid w-full max-w-[430px] grid-cols-2 gap-3">
                                        <ParticipantTile
                                            name="You"
                                            subtitle={
                                                state === "muted"
                                                    ? "Muted"
                                                    : "Microphone live"
                                            }
                                            isSpeaking={
                                                activeSpeaker === "user"
                                            }
                                            compact
                                            className="aspect-[16/9] bg-zinc-900/80 backdrop-blur"
                                        />
                                        <ParticipantTile
                                            name="Agent"
                                            subtitle="Training Agent"
                                            isSpeaking={
                                                activeSpeaker === "agent"
                                            }
                                            compact
                                            className="aspect-[16/9] bg-zinc-900/80 backdrop-blur"
                                        />
                                    </div>
                                </div>
                                <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                                    <video
                                        ref={screenShareVideoRef}
                                        className="h-full w-full object-contain"
                                        autoPlay
                                        muted
                                        playsInline
                                    />
                                </div>
                            </div>
                        ) : (
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
                        )}
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
                            label={
                                isScreenShareActive
                                    ? "Stop Share"
                                    : "Share Screen"
                            }
                            icon={<span>🖥️</span>}
                            onClick={toggleScreenShare}
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
                    <p className="mt-1 text-xs text-zinc-700">{message}</p>
                </header>
                <div className="min-h-0 flex-1 overflow-auto p-3">
                    <ChatTranscript transcript={transcript} />
                </div>
                <ChatComposer
                    onAttach={onAttach}
                    onSend={onSendText}
                    disabled={
                        state === "disconnected" ||
                        state === "connecting" ||
                        isUploadingFile
                    }
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={onFileChange}
                    accept="image/*,application/pdf,text/plain,text/markdown,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
            </section>
        </section>
    );
}
