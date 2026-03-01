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
        <div className="grid grid-cols-[180px_1fr_auto] gap-2 items-start">
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
                className="mt-1 border border-zinc-300 rounded-md text-zinc-700 hover:text-red-600 hover:border-red-300 px-2 py-2 text-sm transition-colors"
            >
                ✕
            </button>
        </div>
    );
}
