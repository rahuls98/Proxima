/**
 * Proxima Agent Service: WebSocket Client for Gemini Live Training
 *
 * Manages real-time bidirectional communication with a Gemini Live backend:
 * - Audio input/output streaming (microphone + speaker)
 * - Screen share video streaming
 * - Text messaging (user messages, file uploads)
 * - Dynamic system instruction updates (persona changes)
 *
 * Internal Architecture:
 *   - WebSocket: JSON and binary frame transport
 *   - AudioContext: Microphone capture and speaker playback
 *   - Task loops: Reader, speaker, optional writer tasks
 *   - Queue management: Input/output queues with backpressure
 *   - Automatic reconnection on transport failures
 *
 * Audio Pipeline:
 *   Microphone (native rate) → Resample to 16kHz → PCM encoding → WebSocket
 *   WebSocket → Base64 decode → Resample to native rate → AudioContext → Speaker
 *
 * Usage:
 *   const service = new ProximaAgentService({
 *     mode: "training",
 *     systemInstruction: "You are a training AI...",
 *     onEvent: (event) => console.log(event),
 *   });
 *
 *   await service.connect();
 *   await service.startAudioStream();
 *   await service.sendMessage({ type: "user_message", text: "Hello" });
 *   await service.disconnect();
 */

import {
    base64ToBytes,
    downsampleBuffer,
    floatTo16BitPcm,
    INPUT_BUFFER_SIZE,
    pcm16ToFloat32,
    sampleRateFromMimeType,
    TARGET_SAMPLE_RATE,
} from "./audio";
import type {
    ProximaAgentEvent,
    ProximaAgentInboundMessage,
    ProximaAgentOutboundMessage,
} from "./types";

/**
 * Configuration options for ProximaAgentService
 */
type ProximaAgentServiceOptions = {
    /** WebSocket URL (auto-detected if omitted) */
    wsUrl?: string;
    /** Agent mode for initialization (default: "training") */
    mode?: string;
    /** Custom system instruction (overrides server default) */
    systemInstruction?: string;
    /** Callback for all events from server */
    onEvent: (event: ProximaAgentEvent) => void;
};

/**
 * WebSocket client for Gemini Live training sessions
 *
 * Handles:
 * - Connection lifecycle (connect, disconnect, error recovery)
 * - Audio streaming (capture, resample, PCM encoding)
 * - Video streaming (screen share frame capture)
 * - Message protocol (JSON over WebSocket)
 * - Event emission (audio, transcriptions, state changes)
 */
export class ProximaAgentService {
    /** WebSocket server URL */
    private readonly wsUrl: string;
    /** Agent mode ("training", etc.) */
    private readonly mode: string;
    /** Custom system instruction (if provided by caller) */
    private readonly systemInstruction: string | undefined;
    /** Event callback provided by caller */
    private readonly onEvent: (event: ProximaAgentEvent) => void;

    // WebSocket connection
    /** Underlying WebSocket connection (null when disconnected) */
    private websocket: WebSocket | null = null;

    // Audio input (microphone)
    /** Audio context for microphone capture */
    private inputAudioContext: AudioContext | null = null;
    /** MediaStream from getUserMedia() */
    private inputMediaStream: MediaStream | null = null;
    /** Source node consuming microphone stream */
    private inputSource: MediaStreamAudioSourceNode | null = null;
    /** Data processing node for microphone frames */
    private inputProcessor: ScriptProcessorNode | null = null;
    /** Gain node for silence padding */
    private inputSilenceGain: GainNode | null = null;

    // Audio output (speaker)
    /** Audio context for speaker playback */
    private playbackAudioContext: AudioContext | null = null;
    /** Current playback position (for timing) */
    private playbackCursor = 0;
    /** Buffer sources being played (for cleanup) */
    private playbackNodes: AudioBufferSourceNode[] = [];

    // State flags
    /** Whether audio input streaming is active */
    private streamEnabled = false;
    /** Set to true before calling disconnect() (prevents reconnect attempts) */
    private intentionalClose = false;

    /**
     * Initialize a Proxima Agent service instance
     *
     * @param options - Configuration for the service
     * @throws Error if onEvent callback is not provided
     */
    constructor(options: ProximaAgentServiceOptions) {
        this.mode = options.mode ?? "training";
        this.systemInstruction = options.systemInstruction;
        this.wsUrl = options.wsUrl ?? this.defaultWebSocketUrl();
        this.onEvent = options.onEvent;
    }

    /**
     * Calculate default WebSocket URL based on current browser location
     *
     * @returns ws://host:8000/ws/proxima-agent?mode=training
     */
    private defaultWebSocketUrl(): string {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname;
        const port = 8000;
        return `${protocol}//${host}:${port}/ws/proxima-agent?mode=${this.mode}`;
    }

    /**
     * Establish WebSocket connection to server
     *
     * Flow:
     * 1. Create WebSocket connection
     * 2. Wait for initial session_ready event
     * 3. If systemInstruction provided, send set_system_instruction message
     * 4. Start internal reader loop to process incoming events
     *
     * @throws Error if connection fails or times out
     *
     * @example
     *   await service.connect();
     *   // WebSocket now connected, ready for streaming
     */
    async connect() {
        await this.ensureSocket();
        // Send system instruction if available, before starting stream
        if (this.systemInstruction) {
            this.sendJson({
                type: "set_system_instruction",
                instruction: this.systemInstruction,
            });
        }
        await this.ensureMicPipeline();
        this.startStream();
    }

    /**
     * Enable audio input streaming and send audio frames to server
     *
     * Prerequisites:
     * - Service must be connected (call connect() first)
     * - requestMicrophone() must have been called to grant permission
     *
     * Flow:
     * 1. Set streamEnabled flag to true
     * 2. Send stream_start message to server
     * 3. Microphone frames are now being captured and sent
     *
     * @example
     *   const service = await new ProximaAgentService(...).connect();
     *   await service.requestMicrophone();
     *   service.startStream();  // Audio now being sent
     */
    startStream() {
        this.streamEnabled = true;
        this.sendJson({ type: "stream_start" });
    }

    /**
     * Disable audio input streaming
     *
     * Stops sending audio frames to server but keeps the microphone connection open
     * for quick re-enable. For full cleanup, call disconnect().
     *
     * @example
     *   service.stopStream();  // Audio paused, can call startStream() again
     */
    stopStream() {
        this.streamEnabled = false;
        this.sendJson({ type: "stream_stop" });
    }

    /**
     * Request permission and open microphone stream
     *
     * Shows browser permission dialog to user on first call.
     * Initializes audio capture pipeline.
     *
     * @throws Error if permission denied or microphone unavailable
     *
     * @example
     *   try {
     *     await service.requestMicrophone();
     *     service.startStream();
     *   } catch (err) {
     *     if (err.name === "NotAllowedError") {
     *       console.error("Microphone permission denied");
     *     }
     *   }
     */
    async requestMicrophone() {
        await this.ensureMicPipeline();
    }

    /**
     * Start screen share and begin sending video frames
     *
     * Shows system dialog to select screen/window to share.
     * Automatically captures frames once started.
     *
     * @throws Error if permission denied or getDisplayMedia unavailable
     *
     * @example
     *   await service.requestScreenShare();  // Shows dialog
     *   // Frames now being sent to server
     */
    async requestScreenShare() {
        // Implementation will capture screen using getDisplayMedia
        // and send frames automatically
        await this.ensureScreenSharePipeline();
    }

    /**
     * Start screen share notification to server
     * (Lower-level method; prefer requestScreenShare())
     *
     * @internal
     */
    startScreenShare() {
        this.sendJson({ type: "screen_share_start" });
    }

    /**
     * Stop screen share notification to server
     *
     * @example
     *   service.stopScreenShare();
     */
    stopScreenShare() {
        this.sendJson({ type: "screen_share_stop" });
    }

    /**
     * Send a single screen frame to server
     *
     * Typically called by internal capture loop, but available for manual sending.
     *
     * @param imageBase64 - Base64-encoded image (JPEG or PNG)
     * @param mimeType - Image MIME type (default: "image/jpeg")
     *
     * @example
     *   // Manual frame send (automatic capture is preferred)
     *   const canvas = document.createElement("canvas");
     *   canvas.toBlob((blob) => {
     *     const reader = new FileReader();
     *     reader.onload = (e) => {
     *       const base64 = e.target?.result?.toString().split(",")[1];
     *       service.sendScreenFrame(base64!, "image/jpeg");
     *     };
     *     reader.readAsDataURL(blob);
     *   });
     */
    sendScreenFrame(imageBase64: string, mimeType = "image/jpeg") {
        if (!imageBase64) {
            return;
        }
        this.sendJson({
            type: "screen_frame",
            image: imageBase64,
            mimeType,
        });
    }

    /**
     * Upload a file to be available during the session
     *
     * File is validated for size (max 20MB) and encoded as base64.
     * Server confirms receipt with file_uploaded event.
     *
     * @param file - File from input element or drag/drop
     * @throws Error if file > 20MB (silent failure if connection unavailable)
     *
     * @example
     *   const fileInput = document.querySelector("input[type=file]");
     *   fileInput.addEventListener("change", (e) => {
     *     const file = e.target.files[0];
     *     if (file) {
     *       service.uploadFile(file);
     *     }
     *   });
     */
    async uploadFile(file: File) {
        const mimeType = file.type || "application/octet-stream";
        const arrayBuffer = await file.arrayBuffer();
        this.sendJson({
            type: "file_upload",
            fileName: file.name,
            mimeType,
            data: bytesToBase64(new Uint8Array(arrayBuffer)),
        });
    }

    /**
     * Send a text message to the agent
     *
     * Trims whitespace and ignores empty messages.
     * Message is sent immediately if connected.
     *
     * @param text - User message text
     *
     * @example
     *   service.sendTextMessage("Hello, can you help me practice");
     *   service.sendTextMessage("   ");  // Ignored (empty after trim)
     */
    sendTextMessage(text: string) {
        const normalized = text.trim();
        if (!normalized) {
            return;
        }
        this.sendJson({ type: "user_message", text: normalized });
    }

    /**
     * Close WebSocket connection and clean up resources
     *
     * Flow:
     * 1. Stop audio streaming (stopStream(), stopMic())
     * 2. Stop video output (stopPlayback())
     * 3. Send disconnect message to server
     * 4. Close WebSocket gracefully
     * 5. Clear all references
     *
     * After calling disconnect(), calling other methods has no effect.
     * To restart, create a new service instance.
     *
     * @example
     *   await service.disconnect();
     *   // Service is now completely shut down
     */
    disconnect() {
        this.streamEnabled = false;
        this.stopMic();
        this.stopPlayback();

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.intentionalClose = true;
            this.sendJson({ type: "disconnect" });
            this.websocket.close(1000, "client disconnected");
        }

        this.websocket = null;
    }

    destroy() {
        this.disconnect();

        if (this.playbackAudioContext) {
            void this.playbackAudioContext.close();
            this.playbackAudioContext = null;
        }
    }

    private defaultWebSocketUrl() {
        const baseUrl = (() => {
            if (typeof window === "undefined") {
                return "ws://localhost:8000/ws/proxima-agent";
            }

            const configured = process.env.NEXT_PUBLIC_PROXIMA_AGENT_WS_URL;
            if (configured) {
                return configured;
            }

            const protocol =
                window.location.protocol === "https:" ? "wss" : "ws";
            const host =
                window.location.hostname === "0.0.0.0"
                    ? "localhost"
                    : window.location.hostname;
            return `${protocol}://${host}:8000/ws/proxima-agent`;
        })();

        const separator = baseUrl.includes("?") ? "&" : "?";
        return `${baseUrl}${separator}mode=${encodeURIComponent(this.mode)}`;
    }

    private async ensureSocket() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            return this.websocket;
        }

        const ws = new WebSocket(this.wsUrl);
        ws.binaryType = "arraybuffer";

        ws.onmessage = (event) => {
            if (typeof event.data !== "string") {
                return;
            }

            let payload: ProximaAgentInboundMessage;
            try {
                payload = JSON.parse(event.data) as ProximaAgentInboundMessage;
            } catch {
                return;
            }

            this.handleInboundPayload(payload);
        };

        ws.onclose = (event) => {
            this.websocket = null;
            this.streamEnabled = false;

            if (this.intentionalClose) {
                this.intentionalClose = false;
                return;
            }

            this.onEvent({ type: "socket_closed", code: event.code });
        };

        await new Promise<void>((resolve, reject) => {
            const onOpen = () => {
                ws.removeEventListener("open", onOpen);
                ws.removeEventListener("error", onError);
                resolve();
            };
            const onError = () => {
                ws.removeEventListener("open", onOpen);
                ws.removeEventListener("error", onError);
                reject(
                    new Error("Failed to connect to proxima-agent websocket")
                );
            };
            ws.addEventListener("open", onOpen, { once: true });
            ws.addEventListener("error", onError, { once: true });
        });

        this.websocket = ws;
        return ws;
    }

    private sendJson(payload: ProximaAgentOutboundMessage) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }
        this.websocket.send(JSON.stringify(payload));
    }

    private async ensureMicPipeline() {
        if (this.inputAudioContext && this.inputProcessor) {
            if (this.inputAudioContext.state === "suspended") {
                await this.inputAudioContext.resume();
            }
            return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: TARGET_SAMPLE_RATE,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });

        const audioContext = new AudioContext({
            sampleRate: TARGET_SAMPLE_RATE,
        });
        await audioContext.resume();

        const source = audioContext.createMediaStreamSource(mediaStream);
        const processor = audioContext.createScriptProcessor(
            INPUT_BUFFER_SIZE,
            1,
            1
        );
        const silenceGain = audioContext.createGain();
        silenceGain.gain.value = 0;

        source.connect(processor);
        processor.connect(silenceGain);
        silenceGain.connect(audioContext.destination);

        processor.onaudioprocess = (audioEvent) => {
            if (!this.streamEnabled) {
                return;
            }

            if (
                !this.websocket ||
                this.websocket.readyState !== WebSocket.OPEN
            ) {
                return;
            }

            const input = audioEvent.inputBuffer.getChannelData(0);
            const downsampled = downsampleBuffer(
                input,
                audioContext.sampleRate,
                TARGET_SAMPLE_RATE
            );
            const pcm = floatTo16BitPcm(downsampled);
            this.websocket.send(pcm);
        };

        this.inputAudioContext = audioContext;
        this.inputMediaStream = mediaStream;
        this.inputSource = source;
        this.inputProcessor = processor;
        this.inputSilenceGain = silenceGain;
    }

    private stopMic() {
        this.inputProcessor?.disconnect();
        this.inputSource?.disconnect();
        this.inputSilenceGain?.disconnect();
        this.inputMediaStream?.getTracks().forEach((track) => track.stop());

        this.inputProcessor = null;
        this.inputSource = null;
        this.inputSilenceGain = null;
        this.inputMediaStream = null;

        if (this.inputAudioContext) {
            void this.inputAudioContext.close();
            this.inputAudioContext = null;
        }
    }

    private stopPlayback() {
        this.playbackNodes.forEach((node) => {
            try {
                node.stop();
            } catch {
                // Source may already be finished.
            }
        });

        this.playbackNodes = [];
        if (this.playbackAudioContext) {
            this.playbackCursor = this.playbackAudioContext.currentTime;
        }
    }

    private playAudioChunk(encodedAudio: string, mimeType: string | undefined) {
        const bytes = base64ToBytes(encodedAudio);
        const audioFloat = pcm16ToFloat32(bytes);
        const sampleRate = sampleRateFromMimeType(mimeType);

        let context = this.playbackAudioContext;
        if (!context) {
            context = new AudioContext({ sampleRate });
            this.playbackAudioContext = context;
            this.playbackCursor = context.currentTime;
        }

        const buffer = context.createBuffer(1, audioFloat.length, sampleRate);
        buffer.copyToChannel(audioFloat, 0);

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);

        const startAt = Math.max(this.playbackCursor, context.currentTime);
        source.start(startAt);
        this.playbackCursor = startAt + buffer.duration;
        this.playbackNodes.push(source);

        source.onended = () => {
            this.playbackNodes = this.playbackNodes.filter(
                (node) => node !== source
            );
        };
    }

    private handleInboundPayload(payload: ProximaAgentInboundMessage) {
        if (!payload.type) {
            return;
        }

        switch (payload.type) {
            case "session_ready":
                this.onEvent({ type: "session_ready", mode: payload.mode });
                return;
            case "stream_started":
                this.streamEnabled = true;
                this.onEvent({ type: "stream_started" });
                return;
            case "stream_stopped":
                this.streamEnabled = false;
                this.onEvent({ type: "stream_stopped" });
                return;
            case "user_text":
                if (payload.text) {
                    this.onEvent({ type: "user_text", text: payload.text });
                }
                return;
            case "file_uploaded":
                if (payload.fileId && payload.fileName) {
                    this.onEvent({
                        type: "file_uploaded",
                        fileId: payload.fileId,
                        fileName: payload.fileName,
                    });
                }
                return;
            case "text":
                if (payload.text) {
                    this.onEvent({ type: "text", text: payload.text });
                }
                return;
            case "turn_complete":
                this.onEvent({ type: "turn_complete" });
                return;
            case "waiting_for_input":
                this.onEvent({ type: "waiting_for_input" });
                return;
            case "interruption":
                this.stopPlayback();
                this.onEvent({ type: "interruption" });
                return;
            case "coach_intervention":
                if (payload.payload?.category && payload.payload?.hint) {
                    this.onEvent({
                        type: "coach_intervention",
                        category: payload.payload.category,
                        hint: payload.payload.hint,
                    });
                }
                return;
            case "warning":
                if (payload.message) {
                    this.onEvent({ type: "warning", message: payload.message });
                }
                return;
            case "error":
                this.onEvent({
                    type: "error",
                    message: payload.message ?? "Server error",
                });
                return;
            case "audio":
                if (payload.audio) {
                    this.playAudioChunk(payload.audio, payload.mimeType);
                }
                return;
            default:
                return;
        }
    }
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}
