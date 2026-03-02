import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

interface AdditionalFileItem {
    id: number;
    key: string;
    file: File | null;
}

interface AdditionalFileContextProps {
    items: AdditionalFileItem[];
    onAdd: () => void;
    onRemove: (id: number) => void;
    onUpdateKey: (id: number, key: string) => void;
    onUpdateFile: (id: number, file: File | null) => void;
}

export function AdditionalFileContext({
    items,
    onAdd,
    onRemove,
    onUpdateKey,
    onUpdateFile,
}: AdditionalFileContextProps) {
    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-700">
                Custom File Context
            </h4>
            <div className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex gap-2 items-start p-3 bg-zinc-50 rounded-md border border-zinc-200"
                    >
                        <div className="flex-1 space-y-2">
                            <Input
                                type="text"
                                placeholder="Key"
                                value={item.key}
                                onChange={(e) =>
                                    onUpdateKey(item.id, e.target.value)
                                }
                            />
                            <div className="relative">
                                <input
                                    type="file"
                                    onChange={(e) =>
                                        onUpdateFile(
                                            item.id,
                                            e.target.files?.[0] ?? null
                                        )
                                    }
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    aria-label="Select file"
                                />
                                <div className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 pointer-events-none bg-white">
                                    {item.file?.name || "Choose file..."}
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="mt-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={onAdd}
                className="w-full border border-dashed border-zinc-300 rounded-md text-zinc-700 hover:text-zinc-900 hover:border-zinc-400 text-sm py-2 transition-colors"
            >
                + Add File Item
            </button>
        </div>
    );
}
