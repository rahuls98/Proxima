import { Input } from "@/components/atoms/Input";

type FileContextItemProps = {
    id: number;
    keyValue: string;
    fileName?: string;
    onKeyChange: (value: string) => void;
    onFileChange: (file: File | null) => void;
    onRemove: () => void;
};

export function FileContextItem({
    keyValue,
    fileName,
    onKeyChange,
    onFileChange,
    onRemove,
}: FileContextItemProps) {
    return (
        <div className="grid grid-cols-[180px_1fr_auto] gap-3 items-center bg-surface-panel border border-border-subtle rounded-xl p-3">
            <Input
                type="text"
                placeholder="key"
                value={keyValue}
                onChange={(e) => onKeyChange(e.target.value)}
            />
            <div className="relative">
                <input
                    type="file"
                    accept=".pdf,.txt,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mp3"
                    onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Select file"
                />
                <div className="rounded-xl border border-border-subtle px-4 py-3 text-sm text-text-main pointer-events-none bg-surface-base">
                    {fileName || "Choose file..."}
                </div>
            </div>
            <button
                type="button"
                onClick={onRemove}
                className="border border-border-subtle rounded-lg text-text-main hover:text-danger hover:border-danger/30 px-2 py-2 text-sm transition-colors"
            >
                ✕
            </button>
        </div>
    );
}
