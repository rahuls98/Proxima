import { Field } from "@/app/(app)/training/context-builder/schema";

interface FieldInputProps {
    field: Field;
    value: string | number | boolean | string[] | null;
    onChange: (value: string | number | boolean | string[] | null) => void;
}

export function FieldInput({ field, value, onChange }: FieldInputProps) {
    if (field.type === "text") {
        return (
            <input
                type="text"
                placeholder={
                    typeof field.dummy_value === "string"
                        ? field.dummy_value
                        : ""
                }
                value={(value as string) || ""}
                onChange={(e) => onChange(e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-100"
            />
        );
    }

    if (field.type === "dropdown") {
        return (
            <select
                value={(value as string) || ""}
                onChange={(e) => onChange(e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-100 bg-white"
            >
                <option value="">Select {field.label}</option>
                {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    if (field.type === "multi-select") {
        const selectedValues = (value as string[]) || [];
        return (
            <div className="space-y-2 border border-zinc-300 rounded-md p-3 bg-white max-h-48 overflow-y-auto">
                {field.options?.map((opt) => (
                    <label
                        key={opt}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <input
                            type="checkbox"
                            checked={selectedValues.includes(opt)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    onChange([...selectedValues, opt]);
                                } else {
                                    onChange(
                                        selectedValues.filter((v) => v !== opt)
                                    );
                                }
                            }}
                            className="w-4 h-4 rounded border-zinc-300"
                        />
                        <span className="text-sm text-zinc-700">{opt}</span>
                    </label>
                ))}
            </div>
        );
    }

    if (field.type === "slider_0_1") {
        const numValue = (value as number) ?? 0.5;
        return (
            <div className="space-y-2">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={numValue}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-zinc-600">
                    <span>0.0</span>
                    <span className="font-semibold text-zinc-900">
                        {numValue.toFixed(2)}
                    </span>
                    <span>1.0</span>
                </div>
            </div>
        );
    }

    if (field.type === "slider_1_5") {
        const numValue = (value as number) ?? 3;
        return (
            <div className="space-y-2">
                <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={numValue}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-zinc-600">
                    <span>1</span>
                    <span className="font-semibold text-zinc-900">
                        {numValue}
                    </span>
                    <span>5</span>
                </div>
            </div>
        );
    }

    if (field.type === "slider_low_high") {
        const options = ["Low", "Medium", "High"];
        const selectedIdx = options.indexOf(value as string) ?? 1;
        return (
            <select
                value={selectedIdx}
                onChange={(e) => onChange(options[parseInt(e.target.value)])}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-100 bg-white"
            >
                {options.map((opt, idx) => (
                    <option key={opt} value={idx}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    if (field.type === "boolean") {
        return (
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={(value as boolean) || false}
                    onChange={(e) => onChange(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-300"
                />
                <span className="text-sm text-zinc-700">Enabled</span>
            </label>
        );
    }

    if (field.type === "file") {
        return (
            <div className="space-y-2">
                <input
                    type="file"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        onChange(file ? file.name : null);
                    }}
                    className="block w-full text-sm text-zinc-500 file:mr-3 file:py-2 file:px-3 file:border file:border-zinc-300 file:rounded-md file:text-sm file:font-semibold file:bg-zinc-50 hover:file:bg-zinc-100"
                />
                {value && (
                    <p className="text-xs text-zinc-600">
                        Selected: <span className="font-medium">{value}</span>
                    </p>
                )}
            </div>
        );
    }

    return null;
}
