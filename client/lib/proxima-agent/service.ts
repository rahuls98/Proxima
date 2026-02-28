import {
    base64ToBytes,
    downsampleBuffer,
    floatTo16BitPcm,
    INPUT_BUFFER_SIZE,
    pcm16ToFloat32,
    sampleRateFromMimeType,
    TARGET_SAMPLE_RATE,
} from "./audio";
import type { ProximaAgentEvent, ProximaAgentInboundMessage } from "./types";

type ProximaAgentServiceOptions = {
    wsUrl?: string;
    mode?: string;
    onEvent: (event: ProximaAgentEvent) => void;
};

export class ProximaAgentService {
    private readonly wsUrl: string;
    private readonly mode: string;
    private readonly onEvent: (event: ProximaAgentEvent) => void;

    private websocket: WebSocket | null = null;
    private inputAudioContext: AudioContext | null = null;
    private inputMediaStream: MediaStream | null = null;
    private inputSource: MediaStreamAudioSourceNode | null = null;
    private inputProcessor: ScriptProcessorNode | null = null;
    private inputSilenceGain: GainNode | null = null;

    private playbackAudioContext: AudioContext | null = null;
    private playbackCursor = 0;
    private playbackNodes: AudioBufferSourceNode[] = [];

    private streamEnabled = false;
    private intentionalClose = false;

    constructor(options: ProximaAgentServiceOptions) {
        this.mode = options.mode ?? "training";
        this.wsUrl = options.wsUrl ?? this.defaultWebSocketUrl();
        this.onEvent = options.onEvent;
    }

    async connect() {
        await this.ensureSocket();
        await this.ensureMicPipeline();
        this.startStream();
    }

    startStream() {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.streamEnabled = true;
        this.websocket.send(JSON.stringify({ type: "stream_start" }));
    }

    stopStream() {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.streamEnabled = false;
        this.websocket.send(JSON.stringify({ type: "stream_stop" }));
    }

    disconnect() {
        this.streamEnabled = false;
        this.stopMic();
        this.stopPlayback();

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.intentionalClose = true;
            this.websocket.send(JSON.stringify({ type: "disconnect" }));
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

            const protocol = window.location.protocol === "https:" ? "wss" : "ws";
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
