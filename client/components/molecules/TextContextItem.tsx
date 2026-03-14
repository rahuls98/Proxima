import { Input } from "@/components/atoms/Input";
import { TextArea } from "@/components/atoms/TextArea";

type TextContextItemProps = {
    id: number;
    keyValue: string;
    value: string;
    onKeyChange: (value: string) => void;
    onValueChange: (value: string) => void;
    onRemove: () => void;
};

export function TextContextItem({
    keyValue,
    value,
    onKeyChange,
    onValueChange,
    onRemove,
}: TextContextItemProps) {
    return (
        <div className="grid grid-cols-[180px_1fr_auto] gap-3 items-start bg-surface-panel border border-border-subtle rounded-xl p-3">
            <Input
                type="text"
                placeholder="key"
                value={keyValue}
                onChange={(e) => onKeyChange(e.target.value)}
            />
            <TextArea
                placeholder="value"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                rows={3}
            />
            <button
                type="button"
                onClick={onRemove}
                className="mt-1 border border-border-subtle rounded-lg text-text-main hover:text-danger hover:border-danger/30 px-2 py-2 text-sm transition-colors"
            >
                ✕
            </button>
        </div>
    );
}
