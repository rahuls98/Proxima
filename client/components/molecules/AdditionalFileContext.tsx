import { Input } from "@/components/atoms/Input";

interface AdditionalFileItem {
    id: number;
    key: string;
    value: string;
    file: File | null;
}

interface AdditionalFileContextProps {
    items: AdditionalFileItem[];
    onAdd: () => void;
    onRemove: (id: number) => void;
    onUpdateKey: (id: number, key: string) => void;
    onUpdateValue: (id: number, value: string) => void;
    onUpdateFile: (id: number, file: File | null) => void;
    showHeader?: boolean;
    showAddButton?: boolean;
}

export function AdditionalFileContext({
    items,
    onAdd,
    onRemove,
    onUpdateKey,
    onUpdateValue,
    onUpdateFile,
    showHeader = true,
    showAddButton = true,
}: AdditionalFileContextProps) {
    return (
        <div className="space-y-4">
            {showHeader ? (
                <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
                    Custom File Context
                </h4>
            ) : null}
            <div className="space-y-3">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex gap-3 items-start p-4 bg-surface-panel rounded-xl border border-border-subtle"
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
                                <Input
                                    type="text"
                                    placeholder="Value"
                                    value={
                                        item.file ? item.file.name : item.value
                                    }
                                    disabled={Boolean(item.file)}
                                    onChange={(e) =>
                                        onUpdateValue(item.id, e.target.value)
                                    }
                                    className="pr-12"
                                />
                                <input
                                    id={`knowledge-file-${item.id}`}
                                    type="file"
                                    onChange={(e) =>
                                        onUpdateFile(
                                            item.id,
                                            e.target.files?.[0] ?? null
                                        )
                                    }
                                    className="hidden"
                                    aria-label="Select file"
                                />
                                <label
                                    htmlFor={`knowledge-file-${item.id}`}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-surface-hover border border-border-subtle text-text-muted hover:text-primary hover:border-primary/40 transition-colors flex items-center justify-center cursor-pointer"
                                    title="Attach file"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">
                                        attach_file
                                    </span>
                                </label>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="mt-2 px-2 py-1 text-xs bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>
            {showAddButton ? (
                <button
                    type="button"
                    onClick={onAdd}
                    className="w-full border-2 border-dashed border-border-subtle rounded-lg text-text-muted hover:text-primary hover:border-primary/50 text-sm py-3 transition-colors"
                >
                    + Add File Item
                </button>
            ) : null}
        </div>
    );
}
