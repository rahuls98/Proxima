export const TARGET_SAMPLE_RATE = 16000;
export const INPUT_BUFFER_SIZE = 1024;

export function downsampleBuffer(
    input: Float32Array,
    inputRate: number,
    targetRate: number
) {
    if (inputRate === targetRate) {
        return input;
    }

    const ratio = inputRate / targetRate;
    const outputLength = Math.round(input.length / ratio);
    const output = new Float32Array(outputLength);
    let outputIndex = 0;
    let inputIndex = 0;

    while (outputIndex < outputLength) {
        const nextInputIndex = Math.round((outputIndex + 1) * ratio);
        let sum = 0;
        let count = 0;

        for (
            let i = inputIndex;
            i < nextInputIndex && i < input.length;
            i += 1
        ) {
            sum += input[i];
            count += 1;
        }

        output[outputIndex] = count > 0 ? sum / count : 0;
        outputIndex += 1;
        inputIndex = nextInputIndex;
    }

    return output;
}

export function floatTo16BitPcm(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < input.length; i += 1) {
        const sample = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(
            i * 2,
            sample < 0 ? sample * 0x8000 : sample * 0x7fff,
            true
        );
    }

    return buffer;
}

export function base64ToBytes(base64: string) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function pcm16ToFloat32(bytes: Uint8Array) {
    const sampleCount = Math.floor(bytes.length / 2);
    const float32 = new Float32Array(sampleCount);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    for (let i = 0; i < sampleCount; i += 1) {
        float32[i] = view.getInt16(i * 2, true) / 0x8000;
    }

    return float32;
}

export function sampleRateFromMimeType(mimeType: string | undefined) {
    if (!mimeType) {
        return 24000;
    }

    const match = mimeType.match(/rate=(\d+)/);
    return match ? Number(match[1]) : 24000;
}
