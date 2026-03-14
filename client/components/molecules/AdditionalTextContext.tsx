import { Input } from "@/components/atoms/Input";
import { TextArea } from "@/components/atoms/TextArea";

interface AdditionalTextItem {
    id: number;
    key: string;
    value: string;
}

interface AdditionalTextContextProps {
    items: AdditionalTextItem[];
    onAdd: () => void;
    onRemove: (id: number) => void;
    onUpdateKey: (id: number, key: string) => void;
    onUpdateValue: (id: number, value: string) => void;
}

export function AdditionalTextContext({
    items,
    onAdd,
    onRemove,
    onUpdateKey,
    onUpdateValue,
}: AdditionalTextContextProps) {
    return (
        <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
                Custom Text Context
            </h4>
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
                            <TextArea
                                placeholder="Value"
                                value={item.value}
                                onChange={(e) =>
                                    onUpdateValue(item.id, e.target.value)
                                }
                                rows={3}
                            />
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
            <button
                type="button"
                onClick={onAdd}
                className="w-full border-2 border-dashed border-border-subtle rounded-lg text-text-muted hover:text-primary hover:border-primary/50 text-sm py-3 transition-colors"
            >
                + Add Text Item
            </button>
        </div>
    );
}
