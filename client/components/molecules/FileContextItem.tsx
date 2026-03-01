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
        <div className="grid grid-cols-[180px_1fr_auto] gap-2 items-center">
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
                <div className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-500 pointer-events-none bg-white">
                    {fileName || "Choose file..."}
                </div>
            </div>
            <button
                type="button"
                onClick={onRemove}
                className="border border-zinc-300 rounded-md text-zinc-600 hover:text-red-600 hover:border-red-300 px-2 py-2 text-sm transition-colors"
            >
                ✕
            </button>
        </div>
    );
}
