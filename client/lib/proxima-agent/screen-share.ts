export type ScreenFrame = {
    imageBase64: string;
    mimeType: "image/jpeg";
    width: number;
    height: number;
};

type StartScreenFrameCaptureOptions = {
    stream: MediaStream;
    onFrame: (frame: ScreenFrame) => void;
    intervalMs?: number;
    maxWidth?: number;
    quality?: number;
};

export async function startScreenFrameCapture(
    options: StartScreenFrameCaptureOptions
): Promise<() => void> {
    const {
        stream,
        onFrame,
        intervalMs = 1200,
        maxWidth = 1280,
        quality = 0.65,
    } = options;

    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    await video.play();

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
        return () => {
            video.pause();
            video.srcObject = null;
        };
    }

    const capture = () => {
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        if (!sourceWidth || !sourceHeight) {
            return;
        }

        const targetWidth = Math.min(maxWidth, sourceWidth);
        const scale = targetWidth / sourceWidth;
        const targetHeight = Math.round(sourceHeight * scale);

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        context.drawImage(video, 0, 0, targetWidth, targetHeight);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const [, imageBase64] = dataUrl.split(",", 2);
        if (!imageBase64) {
            return;
        }

        onFrame({
            imageBase64,
            mimeType: "image/jpeg",
            width: targetWidth,
            height: targetHeight,
        });
    };

    const intervalId = window.setInterval(capture, intervalMs);
    capture();

    return () => {
        window.clearInterval(intervalId);
        video.pause();
        video.srcObject = null;
    };
}
