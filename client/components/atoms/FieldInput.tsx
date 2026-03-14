import { Field } from "@/app/(app)/training/context-builder/schema";

interface FieldInputProps {
    field: Field;
    value: string | number | boolean | string[] | null;
    onChange: (value: string | number | boolean | string[] | null) => void;
}

export function FieldInput({ field, value, onChange }: FieldInputProps) {
    const baseInputClass =
        "w-full bg-surface-base border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main placeholder:text-text-placeholder focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all";

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
                className={baseInputClass}
            />
        );
    }

    if (field.type === "dropdown") {
        return (
            <select
                value={(value as string) || ""}
                onChange={(e) => onChange(e.target.value)}
                className={baseInputClass}
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
            <div className="space-y-2 border border-border-subtle rounded-xl p-4 bg-surface-base max-h-48 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#22313a_#141c21] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-surface-panel [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-subtle [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-primary/70">
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
                            className="h-4 w-4 rounded border border-border-subtle bg-surface-panel accent-primary focus:ring-1 focus:ring-primary focus:ring-offset-0"
                        />
                        <span className="text-sm text-text-main">{opt}</span>
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
                    className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-text-muted">
                    <span>0.0</span>
                    <span className="font-semibold text-text-main">
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
                    className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-text-muted">
                    <span>1</span>
                    <span className="font-semibold text-text-main">
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
                className={baseInputClass}
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
        const checked = (value as boolean) || false;
        return (
            <label className="flex items-center gap-2 cursor-pointer w-fit">
                <span className="text-sm text-text-muted">Script Mode</span>
                <span
                    className={`w-12 h-6 rounded-full relative p-1 transition-colors ${checked ? "bg-primary" : "bg-surface-hover border border-border-subtle"}`}
                >
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span
                        className={`block w-4 h-4 bg-white rounded-full transition-transform ${checked ? "translate-x-6" : "translate-x-0"}`}
                    />
                </span>
            </label>
        );
    }

    if (field.type === "file") {
        return (
            <div className="space-y-2">
                <label className="border-2 border-dashed border-border-subtle rounded-xl p-8 flex flex-col items-center justify-center bg-surface-base hover:bg-surface-hover transition-colors cursor-pointer group">
                    <input
                        type="file"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            onChange(file ? file.name : null);
                        }}
                        className="hidden"
                    />
                    <span className="material-symbols-outlined text-text-muted group-hover:text-primary !text-[40px] mb-2">
                        upload
                    </span>
                    <p className="text-text-main font-medium text-sm">
                        Drop training scripts or PDFs here
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                        Supports PDF, DOCX, TXT (Max 25MB)
                    </p>
                </label>
                {value && (
                    <p className="text-xs text-text-muted">
                        Selected: <span className="font-medium">{value}</span>
                    </p>
                )}
            </div>
        );
    }

    return null;
}
