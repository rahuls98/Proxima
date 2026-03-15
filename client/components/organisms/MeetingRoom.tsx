"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";

import { IconButton } from "@/components/atoms/IconButton";
import { ChatComposer } from "@/components/molecules/ChatComposer";
import { ChatTranscript } from "@/components/molecules/ChatTranscript";
import { ParticipantTile } from "@/components/molecules/ParticipantTile";
import { PersonaConfiguringOverlay } from "@/components/molecules/PersonaConfiguringOverlay";
import { startScreenFrameCapture } from "@/lib/proxima-agent/screen-share";
import { ProximaAgentService } from "@/lib/proxima-agent/service";
import { saveTrainingSessionWithReport } from "@/lib/training-history";
import { generateSessionReport } from "@/lib/api";
import { getSessionContext } from "@/lib/session-context";
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

type MeetingRoomProps = {
    initialSessionId?: string;
};

export function MeetingRoom({ initialSessionId }: MeetingRoomProps) {
    const router = useRouter();
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
    const [pendingAttachment, setPendingAttachment] = useState<File | null>(
        null
    );
    const [sessionId, setSessionId] = useState<string | null>(
        initialSessionId ?? null
    );
    const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(
        null
    );
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [sessionContext, setSessionContext] = useState<
        Record<string, unknown> | null
    >(null);
    const [prospectName, setProspectName] = useState<string | null>(null);
    const [prospectTone, setProspectTone] = useState<string | null>(null);
    const [isPersonaReady, setIsPersonaReady] = useState(false);
    const [personaError, setPersonaError] = useState<string | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [coachPopup, setCoachPopup] = useState<string | null>(null);
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
    const coachPopupTimeoutRef = useRef<number | null>(null);

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
            setTranscript((prev) => [
                ...prev,
                {
                    id,
                    role,
                    text,
                    createdAt: new Date().toISOString(),
                },
            ]);
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
                    // Store session ID for report generation
                    if (event.session_id) {
                        setSessionId(event.session_id);
                    }
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
                case "audio":
                    markSpeaker("agent");
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
                case "coach_intervention":
                    appendTranscript("coach", `Coaching Tip: ${event.hint}`);
                    setCoachPopup(`Coaching Tip: ${event.hint}`);
                    if (coachPopupTimeoutRef.current) {
                        window.clearTimeout(coachPopupTimeoutRef.current);
                    }
                    coachPopupTimeoutRef.current = window.setTimeout(() => {
                        setCoachPopup(null);
                    }, 5000);
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
        let cancelled = false;

        serviceRef.current = new ProximaAgentService({
            mode: "training",
            sessionId: initialSessionId,
            systemInstruction: undefined,
            onEvent: handleEvent,
        });

        const applyContext = (
            context: Awaited<ReturnType<typeof getSessionContext>> | null
        ) => {
            if (!context) {
                return;
            }

            if (context.session_context) {
                setSessionContext(
                    (context.session_context as Record<string, unknown>) || null
                );
                const draftName =
                    (context.session_context?.prospect_name as
                        | string
                        | undefined) || null;
                setProspectName(draftName);
                const tone =
                    (context.session_context?.voice_tone as
                        | string
                        | undefined) || null;
                setProspectTone(tone);
            }

            if (context.persona_instruction) {
                serviceRef.current?.setSystemInstruction(
                    context.persona_instruction
                );
                setIsPersonaReady(true);
            }
        };

        const init = async () => {
            try {
                if (!initialSessionId) {
                    return;
                }

                setPersonaError(null);
                let context = await getSessionContext(initialSessionId);
                let attempts = 0;
                while (
                    attempts < 20 &&
                    (!context || !context.persona_instruction)
                ) {
                    await new Promise((resolve) =>
                        window.setTimeout(resolve, 300)
                    );
                    context = await getSessionContext(initialSessionId);
                    attempts += 1;
                }
                if (cancelled) {
                    return;
                }
                if (!context || !context.persona_instruction) {
                    setPersonaError(
                        "Persona is not ready yet. Please return to the context builder."
                    );
                    return;
                }
                applyContext(context);
            } catch (error) {
                console.error("Failed to load session context:", error);
                setPersonaError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load persona context."
                );
            }
        };

        init();

        return () => {
            cancelled = true;
            serviceRef.current?.destroy();
            serviceRef.current = null;
            if (speakerTimeoutRef.current) {
                window.clearTimeout(speakerTimeoutRef.current);
            }
            if (coachPopupTimeoutRef.current) {
                window.clearTimeout(coachPopupTimeoutRef.current);
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
    }, [handleEvent, initialSessionId]);

    useEffect(() => {
        if (!screenShareVideoRef.current) {
            return;
        }
        screenShareVideoRef.current.srcObject = screenShareStream;
    }, [screenShareStream]);

    useEffect(() => {
        if (sessionStartedAt === null) {
            setElapsedSeconds(0);
            return;
        }

        const interval = window.setInterval(() => {
            const next = Math.max(
                0,
                Math.floor((Date.now() - sessionStartedAt) / 1000)
            );
            setElapsedSeconds(next);
        }, 1000);

        return () => {
            window.clearInterval(interval);
        };
    }, [sessionStartedAt]);

    const connect = async () => {
        if (!serviceRef.current) {
            return;
        }

        try {
            setState("connecting");
            stateRef.current = "connecting";
            setMessage("Connecting...");
            await serviceRef.current.connect();
            setSessionStartedAt(Date.now());
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

    const endSession = async () => {
        const activeSessionId = sessionId ?? initialSessionId ?? null;

        stopScreenShare(false);
        serviceRef.current?.disconnect();
        setState("disconnected");
        stateRef.current = "disconnected";
        setSessionStartedAt(null);
        setMessage("Session ended.");
        appendTranscript("system", "Session ended.");
        currentBotMessageIdRef.current = null;
        currentUserMessageIdRef.current = null;
        setActiveSpeaker(null);

        // Save session to training history if we have a session ID and transcript
        if (activeSessionId && transcript.length > 0) {
            setIsGeneratingReport(true);
            // Extract persona info from session context
            let personaName: string | undefined;
            let jobTitle: string | undefined;

            if (sessionContext) {
                try {
                    personaName = sessionContext.prospect_name as
                        | string
                        | undefined;
                    jobTitle = sessionContext.job_title as string | undefined;
                } catch (error) {
                    console.error("Failed to parse session context:", error);
                }
            }

            // Generate and cache the report
            try {
                const report = await generateSessionReport(activeSessionId);
                const durationSeconds =
                    report.session_overview.session_duration_seconds ?? 0;
                const minutes = Math.floor(durationSeconds / 60);
                const seconds = durationSeconds % 60;

                await saveTrainingSessionWithReport(
                    {
                        id: activeSessionId,
                        timestamp:
                            report.session_overview.session_start_time ||
                            new Date().toISOString(),
                        transcriptLength: transcript.length,
                        personaName,
                        jobTitle,
                        scenario: report.session_overview.scenario,
                        duration: `${minutes}m ${seconds
                            .toString()
                            .padStart(2, "0")}s`,
                    },
                    report
                );
            } catch (error) {
                console.error("Failed to generate report:", error);
                // Still save the session without the report
                await saveTrainingSessionWithReport(
                    {
                        id: activeSessionId,
                        timestamp: new Date().toISOString(),
                        transcriptLength: transcript.length,
                        personaName,
                        jobTitle,
                    },
                    {
                        session_overview: {
                            session_id: activeSessionId,
                            scenario: "Training Session",
                            prospect_persona: personaName ?? "Prospect",
                            difficulty: "Intermediate",
                            session_duration_seconds: 0,
                            session_start_time: new Date().toISOString(),
                        },
                        overall_score: {
                            score: 0,
                            performance_level: "Unavailable",
                            breakdown: {
                                discovery: 0,
                                objection_handling: 0,
                                value_communication: 0,
                                conversation_control: 0,
                                emotional_intelligence: 0,
                            },
                        },
                        conversation_metrics: {
                            talk_ratio_rep: 0,
                            talk_ratio_prospect: 0,
                            questions_asked: 0,
                            open_questions: 0,
                            interruptions: 0,
                            avg_response_latency_seconds: 0,
                        },
                        discovery_signals: {
                            pain_identified: false,
                            current_tools_identified: false,
                            budget_discussed: false,
                            decision_process_identified: false,
                            timeline_discussed: "not_discussed",
                        },
                        objection_handling: {
                            objections_detected: 0,
                            acknowledgment_quality: "Unavailable",
                            evidence_used: "Unavailable",
                            follow_up_questions: "Unavailable",
                        },
                        value_communication: {
                            value_clarity: "Unavailable",
                            feature_vs_benefit_balance: "Unavailable",
                            roi_quantified: false,
                            personalization: "Unavailable",
                        },
                        emotional_intelligence: {
                            empathy: "Unavailable",
                            listening_signals: "Unavailable",
                            rapport_building: "Unavailable",
                            tone_adaptation: "Unavailable",
                        },
                        prospect_engagement: {
                            trust_change: 0,
                            engagement_level: "Unavailable",
                            objection_frequency: 0,
                            conversation_momentum: "Unavailable",
                        },
                        deal_progression: {
                            buying_interest: "Unavailable",
                            next_step_clarity: "Unavailable",
                            commitment_secured: false,
                        },
                        top_feedback: [],
                        strengths: [],
                        practice_recommendations: {
                            focus_area: "Unavailable",
                            recommended_exercise: "Unavailable",
                        },
                    }
                );
            }

            // Navigate to session report page
            router.push(`/training/${activeSessionId}/report`);
            return;
        }

        router.push("/training/context-builder");
    };

    const onAttach = () => {
        fileInputRef.current?.click();
    };
    const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        event.target.value = "";

        if (!selectedFile) {
            return;
        }

        setPendingAttachment(selectedFile);
    };

    const sendPendingAttachment = async () => {
        if (!pendingAttachment) {
            return;
        }

        if (!serviceRef.current) {
            return;
        }

        try {
            setIsUploadingFile(true);
            appendTranscript(
                "system",
                `Uploading ${pendingAttachment.name}...`
            );
            await serviceRef.current.uploadFile(pendingAttachment);
            appendTranscript("system", `Attached: ${pendingAttachment.name}`);
            setPendingAttachment(null);
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

    if (!isPersonaReady) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-surface-base">
                <PersonaConfiguringOverlay
                    fixed
                    message={
                        personaError ||
                        "Preparing your training agent with the generated persona..."
                    }
                />
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-surface-base text-text-main">
            {isGeneratingReport ? (
                <PersonaConfiguringOverlay
                    fixed
                    message="Generating your session report..."
                />
            ) : null}
            <header className="h-20 px-8 bg-surface-base border-b border-border-subtle flex items-center justify-between z-50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <span
                                className="material-symbols-outlined text-surface-base"
                                style={{ fontVariationSettings: '"FILL" 1' }}
                            >
                                psychology
                            </span>
                        </div>
                        <span className="text-text-main font-bold text-lg tracking-tight">
                            Proxima AI
                        </span>
                    </div>
                    <div className="h-4 w-px bg-border-subtle" />
                    <span className="text-text-muted font-medium text-sm">
                        Live Training Session
                    </span>
                </div>
                <div className="flex items-center gap-3 ml-2 border-l border-border-subtle pl-6">
                    <div className="text-right">
                        <p className="text-xs font-medium text-text-main">
                            Alex Rivera
                        </p>
                        <p className="text-[10px] text-primary">
                            Enterprise Pro
                        </p>
                    </div>
                    <img
                        alt="Alex Rivera Profile"
                        className="w-10 h-10 rounded-full object-cover border border-border-subtle"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHpsw-nuUHl3j0e9JxnsSe9YBDdfI_9Xv4y4gA4PqOsF8DdUjhVH4Yk1LU_Y5dgRBpoANUJSgDxKUBnjlaTLFC3jX6wU88F_3YCJl204uG8w8qGdOGCR3PddmP3QOobXUYxulAanHCcKewW8B_RTNvTxpTU2ucv7w9Hw0OZbifaSse3sEaDb-a-l5aIpOwCkjxNY0kQWGpxSGTsFZ9-iHcRA-_5iYJF7J8E55pYuH2Qzb9CGF31D46RCKcYvaEKu60l4-DFx_biht5"
                    />
                </div>
            </header>

            <main className="flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_400px] gap-4 bg-surface-base p-4 md:p-6">
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
                                                className="aspect-[16/9] bg-surface-panel"
                                            />
                                            <ParticipantTile
                                                name={
                                                    prospectName || "Prospect"
                                                }
                                                subtitle="Training Agent"
                                                isSpeaking={
                                                    activeSpeaker === "agent"
                                                }
                                                toneLabel={prospectTone}
                                                compact
                                                className="aspect-[16/9] bg-surface-panel"
                                            />
                                        </div>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-border-subtle bg-surface-panel">
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
                                <div className="grid min-h-[320px] w-full max-w-6xl grid-cols-2 gap-6">
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
                                        name={prospectName || "Prospect"}
                                        subtitle="Training Agent"
                                        isSpeaking={activeSpeaker === "agent"}
                                        toneLabel={prospectTone}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <div className="flex flex-col items-center gap-3">
                            {coachPopup && !isScreenShareActive ? (
                                <div className="max-w-[560px] rounded-2xl border border-primary/40 bg-surface-panel/95 px-4 py-3 text-center text-sm font-medium text-text-main shadow-lg backdrop-blur-md">
                                    {coachPopup}
                                </div>
                            ) : null}
                            <div className="flex items-center gap-3 rounded-full border border-border-subtle bg-surface-panel/95 px-4 py-3 backdrop-blur-md shadow-2xl">
                            {state === "disconnected" ||
                            state === "error" ||
                            state === "connecting" ? (
                                <IconButton
                                    label="Join Session"
                                    icon={
                                        <span
                                            className="material-symbols-outlined"
                                            style={{
                                                fontVariationSettings:
                                                    '"FILL" 1',
                                            }}
                                        >
                                            login
                                        </span>
                                    }
                                    onClick={connect}
                                    disabled={state === "connecting"}
                                    showLabel
                                />
                            ) : null}
                            <IconButton
                                label={
                                    state === "connected"
                                        ? "Mute Microphone"
                                        : "Unmute Microphone"
                                }
                                icon={
                                    <span className="material-symbols-outlined">
                                        {state === "connected"
                                            ? "mic"
                                            : "mic_off"}
                                    </span>
                                }
                                onClick={toggleMute}
                                disabled={
                                    state !== "connected" && state !== "muted"
                                }
                                showLabel
                            />
                            <IconButton
                                label={
                                    isScreenShareActive
                                        ? "Stop Screen Share"
                                        : "Start Screen Share"
                                }
                                icon={
                                    <span className="material-symbols-outlined">
                                        present_to_all
                                    </span>
                                }
                                onClick={toggleScreenShare}
                                disabled={
                                    state === "disconnected" ||
                                    state === "connecting"
                                }
                                showLabel
                            />
                            <IconButton
                                label="End Session"
                                icon={
                                    <span className="material-symbols-outlined">
                                        call_end
                                    </span>
                                }
                                onClick={endSession}
                                disabled={state === "connecting"}
                                danger
                                showLabel
                            />
                            </div>
                        </div>
                    </div>
                </div>

                <section className="flex min-w-[320px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel/30">
                    <header className="h-16 px-6 border-b border-border-subtle flex items-center justify-between bg-surface-panel/50">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                            Live Transcript
                        </h2>
                        <div className="flex items-center gap-2 px-3 py-1 bg-danger/10 rounded-full border border-danger/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                            <span className="text-[10px] text-danger font-bold uppercase tracking-widest">
                                LIVE{" "}
                                {Math.floor(elapsedSeconds / 60)
                                    .toString()
                                    .padStart(2, "0")}
                                :
                                {(elapsedSeconds % 60)
                                    .toString()
                                    .padStart(2, "0")}
                            </span>
                        </div>
                    </header>
                    <div className="px-4 py-2 border-b border-border-subtle/60 bg-surface-panel/30">
                        <p className="text-xs text-text-muted">{message}</p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto p-3 bg-surface-base themed-scrollbar">
                        <ChatTranscript
                            transcript={transcript}
                            sessionStartedAt={sessionStartedAt}
                        />
                    </div>
                    <ChatComposer
                        onAttach={onAttach}
                        attachmentName={pendingAttachment?.name ?? null}
                        onSendAttachment={sendPendingAttachment}
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
            </main>
        </div>
    );
}
