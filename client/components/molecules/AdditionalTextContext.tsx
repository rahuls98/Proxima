import { Button } from "@/components/atoms/Button";
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
        <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-700">
                Custom Text Context
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
                + Add Text Item
            </button>
        </div>
    );
}
