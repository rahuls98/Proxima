# Proxima Agent Library: WebSocket Client for Gemini Live

Browser-based WebSocket client for real-time audio/video streaming with Gemini Live API.

## Overview

`ProximaAgentService` manages a complete client-side training session:

1. **Audio I/O**: Captures microphone input, plays back agent speech
2. **Video Streaming**: Captures and sends screen share frames
3. **Message Protocol**: Bidirectional JSON messaging with Gemini Live backend
4. **Event Handling**: Emits events (audio, transcriptions, state changes)
5. **Error Recovery**: Handles connection failures and automatic reconnection

## Architecture

```
User
  ↓ (Microphone)
  ├─→ AudioContext → Resampler → PCM Buffering → WebSocket
  ↓
┌─────────────────────────────────────────────────┐
│ ProximaAgentService                             │
│ - WebSocket connection management               │
│ - Audio capture and playback                    │
│ - Message routing                               │
│ - Event emission                                │
└─────────────────────────────────────────────────┘
  ↓ ↓ ↓
WS   Audio  Events
  ↓
Server (Gemini Live)
```

### Task Model

Internal tasks run concurrently:

- **Reader Loop**: Listens for server messages, processes them
- **Speaker Loop**: Plays back audio from server
- **Writer Loop** (Optional): Automatic retry queue for failed sends

## Usage

### Basic Connection

```typescript
import { ProximaAgentService } from "@/lib/proxima-agent/service";

const service = new ProximaAgentService({
    mode: "training",
    systemInstruction: "You are a sales training AI...",
    onEvent: (event) => {
        console.log("Event:", event);
    },
});

// Connect and start streaming
await service.connect();
await service.startAudioStream();

// Send user message
await service.sendMessage({ type: "user_message", text: "Hello" });

// Disconnect
await service.disconnect();
```

### With Form Data

```typescript
// After generating persona from form
const resp = await generatePersonaInstruction(sessionContext);

const service = new ProximaAgentService({
    mode: "training",
    systemInstruction: resp.persona_instruction,
    onEvent: handleEvent,
});

await service.connect();
```

### Screen Share

```typescript
// Start capturing screen
await service.startScreenShare();

// Send frames (browser handles this internally via Screen Capture API)
// OR manually send frames:
await service.sendScreenFrame(imageData, "image/jpeg");

// Stop capturing
await service.stopScreenShare();
```

## API Reference

### ProximaAgentService Constructor

```typescript
constructor(options: ProximaAgentServiceOptions)
```

**Options**:

| Field               | Type            | Default       | Description                                     |
| ------------------- | --------------- | ------------- | ----------------------------------------------- |
| `mode`              | string          | "training"    | Agent mode (query param: `?mode=training`)      |
| `systemInstruction` | string?         | undefined     | Custom system prompt (overrides server default) |
| `wsUrl`             | string?         | auto-detected | WebSocket URL (usually not needed)              |
| `onEvent`           | (event) => void | required      | Event handler callback                          |

### Methods

#### async connect(): Promise<void>

Establish WebSocket connection to server.

**Flow**:

1. Create WebSocket to `ws://localhost:8000/ws/proxima-agent?mode=training&system_instruction=...`
    - System instruction is passed in URL (if provided) to avoid reconnection on init
2. Wait for `session_ready` event
3. Start automatic message reader loop

**Note**: System instruction is now passed via URL query parameter instead of a separate message, avoiding the need to reconnect the Gemini session after initial connection.

**Throws**: Error if WebSocket fails to connect

**Example**:

```typescript
try {
    await service.connect();
    console.log("Connected!");
} catch (err) {
    console.error("Connection failed:", err);
}
```

#### async startAudioStream(): Promise<void>

Enable microphone input and start streaming to server.

**Requires**: Browser permission to access microphone (shows permission dialog)

**Flow**:

1. Request microphone access via `getUserMedia()`
2. Create AudioContext and capture node
3. Start sending audio frames (encoded as PCM)
4. Send `stream_start` message to server

**Throws**: Error if microphone denied or unavailable

**Example**:

```typescript
await service.startAudioStream();
// Audio is now being sent to server
```

#### async stopAudioStream(): Promise<void>

Disable microphone input and stop streaming.

**Flow**:

1. Send `stream_stop` message to server
2. Stop capturing from microphone
3. Close audio connections

**Example**:

```typescript
await service.stopAudioStream();
// Audio streaming paused
```

#### async startScreenShare(): Promise<void>

Start capturing screen/window and stream to server.

**Requires**: Browser permission to access screen (shows system dialog)

**Flow**:

1. Request screen access via `getDisplayMedia()`
2. Extract video stream and start frame capture
3. Send `screen_share_start` message to server
4. Continuously send frames at ~30 FPS

**Throws**: Error if screen capture denied or unavailable

**Example**:

```typescript
await service.startScreenShare();
// Screen frames are now being sent
```

#### async stopScreenShare(): Promise<void>

Stop capturing screen and clear frame buffer.

**Flow**:

1. Send `screen_share_stop` message
2. Stop frame capture loop
3. Close video stream

**Example**:

```typescript
await service.stopScreenShare();
```

#### async sendMessage(message: ProximaAgentOutboundMessage): Promise<void>

Send JSON message to server.

**Message Types**:

```typescript
// Text message
{ type: "user_message", text: "Hello" }

// Health check
{ type: "ping" }

// Update persona
{ type: "set_system_instruction", instruction: "new prompt..." }

// Session control
{ type: "stream_start" | "stream_stop" }
{ type: "screen_share_start" | "screen_share_stop" }
{ type: "disconnect" | "end_session" }

// File upload
{
  type: "file_upload",
  fileName: "document.pdf",
  mimeType: "application/pdf",
  data: "base64-encoded-file"
}
```

**Example**:

```typescript
await service.sendMessage({
    type: "user_message",
    text: "Can you explain that again?",
});
```

#### async sendScreenFrame(imageData: Uint8Array, mimeType: string): Promise<void>

Manually send a screen frame (usually not needed; automatic capture is preferred).

**Parameters**:

- `imageData`: JPEG/PNG image bytes
- `mimeType`: "image/jpeg" or "image/png"

**Example**:

```typescript
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
// ...draw on canvas...
canvas.toBlob((blob) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        service.sendScreenFrame(data, "image/jpeg");
    };
    reader.readAsArrayBuffer(blob);
});
```

#### async disconnect(): Promise<void>

Close WebSocket connection and clean up resources.

**Flow**:

1. Stop audio and video streams
2. Send `disconnect` message
3. Close WebSocket
4. Clean up event listeners

**Example**:

```typescript
await service.disconnect();
```

## Events

Events are emitted via the `onEvent` callback. Event types:

### Audio Events

```typescript
{
    type: "audio";
    mimeType: "audio/pcm;rate=24000";
    audioData: Float32Array; // PCM samples
}
```

### Transcription Events

```typescript
{
    type: "text";
    text: "Agent speech transcription";
}

{
    type: "user_text";
    text: "User speech transcription";
}
```

### State Events

```typescript
{
    type: "stream_started" | "stream_stopped";
}

{
    type: "turn_complete" | "interruption";
}

{
    type: "waiting_for_input";
}
```

### System Events

```typescript
{
    type: "session_ready";
    mode: "training";
}

{
    type: "pong"; // Response to ping
}

{
    type: "warning" | "error";
    message: string;
}

{
    type: "file_uploaded";
    fileId: string;
    fileName: string;
    mimeType: string;
}
```

### Connection Events

```typescript
{
    type: "connected" | "disconnected";
}

{
    type: "connection_error";
    error: Error;
}
```

## Audio Processing Pipeline

### Input (Microphone → Server)

```
Microphone
    ↓ (raw samples, browser sample rate)
    ↓ downsampleBuffer(192kHz → 16kHz)
    ↓ floatTo16BitPcm()
    ↓ Uint8Array
    ↓ WebSocket binary frame
    ↓ Server receives PCM at 16kHz
```

### Output (Server → Playback)

```
Server sends base64-encoded PCM frames
    ↓ base64ToBytes()
    ↓ pcm16ToFloat32()
    ↓ Resample to AudioContext rate
    ↓ Create AudioBufferSourceNode
    ↓ Connect to audio output
    ↓ Play
    ↓ OnEvent("audio", audioData)
```

### Sample Rates

- **Input**: Microphone's native rate (typically 48 kHz) → Downsampled to 16 kHz
- **Output Server**: 24 kHz (from Gemini Live API)
- **Output Client**: Resampled to AudioContext sample rate (typically 48 kHz)

## Type Definitions

See [types.ts](./types.ts) for complete type definitions:

```typescript
// Service options
type ProximaAgentServiceOptions = {
  wsUrl?: string;
  mode?: string;
  systemInstruction?: string;
  onEvent: (event: ProximaAgentEvent) => void;
};

// Message types
type ProximaAgentOutboundMessage =
  | { type: "stream_start" | "stream_stop" }
  | { type: "screen_share_start" | "screen_share_stop" }
  | { type: "user_message"; text: string }
  | { type: "set_system_instruction"; instruction: string }
  | { type: "ping" | "disconnect" | "end_session" }
  | ... more message types;

// Event types
type ProximaAgentEvent =
  | { type: "audio"; audioData: Float32Array; mimeType: string }
  | { type: "text" | "user_text"; text: string }
  | { type: "stream_started" | "stream_stopped" }
  | ... more event types;
```

## Error Handling

### Connection Failures

```typescript
const service = new ProximaAgentService({
    onEvent: (event) => {
        if (event.type === "connection_error") {
            console.error("Connection failed:", event.error);
            // Attempt manual reconnection
            setTimeout(() => service.connect(), 1000);
        }
    },
});
```

### Permission Denied

```typescript
async function requestMicrophone() {
    try {
        await service.startAudioStream();
    } catch (err) {
        if (err.name === "NotAllowedError") {
            console.error("Microphone permission denied");
            // Show UI message to user
        }
    }
}
```

### Audio Playback Issues

If audio doesn't play:

1. Check browser console for errors
2. Verify `onEvent` callbacks are being called for audio events
3. Check AudioContext state: `audioContext.state` should be "running"
4. Check speaker volume and system audio settings

## Debugging

### Enable Logging

```typescript
const service = new ProximaAgentService({
    onEvent: (event) => {
        console.group("ProximaEvent");
        console.log("Type:", event.type);
        console.log("Data:", event);
        console.groupEnd();
    },
});
```

### Monitor WebSocket Traffic

In browser DevTools:

1. Open Network tab
2. Filter by WS (WebSocket)
3. Click on `/ws/proxima-agent` connection
4. View Messages tab to see all sent/received frames

### Check Audio Context State

```typescript
// In browser console
console.log(audioContext.state); // "running" or "suspended"
console.log(audioContext.sampleRate); // Typical 48000
```

## Performance Tips

1. **Reuse service instance**: Don't create new instances repeatedly
2. **Batch messages**: Send multiple items in one message when possible
3. **Audio quality**: Default 16 kHz mono is optimal for latency
4. **Screen share**: Use H.264 codec if available for better compression
5. **Memory**: Disconnect when not in use to clean up resources

## Browser Compatibility

| Feature                  | Chrome | Firefox | Safari | Edge |
| ------------------------ | ------ | ------- | ------ | ---- |
| WebSocket                | ✓      | ✓       | ✓      | ✓    |
| getUserMedia (audio)     | ✓      | ✓       | ✓      | ✓    |
| getDisplayMedia (screen) | ✓      | ✓       | ⚠️     | ✓    |
| AudioContext             | ✓      | ✓       | ✓      | ✓    |
| WebWorker                | ✓      | ✓       | ✓      | ✓    |

⚠️ Safari screen share requires iOS 15.1+

## Testing

### Unit Tests

```typescript
import { ProximaAgentService } from "@/lib/proxima-agent/service";

describe("ProximaAgentService", () => {
    it("should connect successfully", async () => {
        const events: any[] = [];
        const service = new ProximaAgentService({
            onEvent: (e) => events.push(e),
        });

        await service.connect();
        const readyEvent = events.find((e) => e.type === "session_ready");
        expect(readyEvent).toBeDefined();
    });
});
```

### Integration Tests

1. Open app in browser
2. Click "Connect to Agent"
3. Verify microphoneaccess prompt
4. Speak a sentence
5. Verify response from agent
6. Check DevTools Network for WebSocket frames

## Troubleshooting

### Service Won't Connect

**Symptom**: `onEvent` never receives `session_ready`

**Checks**:

1. Backend server running on port 8000: `curl http://localhost:8000/health`
2. WebSocket endpoint available: `ws://localhost:8000/ws/proxima-agent`
3. Browser console for connection errors
4. Check CORS/firewall settings

### Audio Not Playing

**Symptom**: No audio events received despite agent responding

**Checks**:

1. `audioContext.state === "running"`
2. `onEvent` callbacks executing for audio events
3. Speaker volume not muted
4. Check browser audio output device selected

### Microphone Not Capturing

**Symptom**: No audio being sent to server

**Checks**:

1. User granted microphone permission (check browser settings)
2. `navigator.mediaDevices.getUserMedia` available
3. Called `startAudioStream()` successfully
4. Microphone not in use by another application

### High Latency or Stuttering

**Checks**:

1. Network latency: `ping backend-server` should be < 50ms
2. CPU load: Check browser Task Manager
3. Browser tab-switching causes audio interruption (expected)
4. Test with audio-only (no screen share) to isolate

## Future Enhancements

- [ ] Codec selection (opus, g711)
- [ ] Automatic bit rate adaptation
- [ ] Echo cancellation and noise suppression
- [ ] Voice activity detection (VAD)
- [ ] Multi-modal sentiment analysis (audio + face expressions)
- [ ] Local recording of session
- [ ] Speech-to-text confidence scores
- [ ] Real-time captioning support
