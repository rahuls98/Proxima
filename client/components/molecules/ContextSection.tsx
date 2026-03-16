import { Section } from "@/app/(app)/training/context-builder/schema";
import { FieldInput } from "@/components/atoms/FieldInput";

interface ContextSectionProps {
    section: Section;
    values: Record<string, string | number | boolean | string[] | null>;
    onFieldChange: (
        fieldKey: string,
        value: string | number | boolean | string[] | null
    ) => void;
}

export function ContextSection({
    section,
    values,
    onFieldChange,
}: ContextSectionProps) {
    const resolveDefaultValue = (
        field: Section["fields"][number]
    ): string | number | boolean | string[] | null => {
        if (field.dummy_value !== undefined && field.dummy_value !== null) {
            return field.dummy_value;
        }

        switch (field.type) {
            case "dropdown":
                return field.options?.[0] ?? "";
            case "slider_1_5":
                return 3;
            case "slider_0_1":
                return 0.5;
            case "slider_low_high":
                return "Medium";
            case "boolean":
                return false;
            case "multi-select":
                return field.options?.slice(0, 2) ?? [];
            case "file":
                return null;
            case "text":
            default:
                return `Sample ${field.label}`;
        }
    };

    section.fields.forEach((field) => {
        if (values[field.key] === null || values[field.key] === undefined) {
            onFieldChange(field.key, resolveDefaultValue(field));
        }
    });

    const sectionMeta: Record<string, { title: string; icon: string }> = {
        "Prospect Identity": {
            title: "1. Prospect Identity",
            icon: "person",
        },
        "Business Context": {
            title: "2. Business Context",
            icon: "work",
        },
        "KPIs & Success Metrics": {
            title: "3. KPIs & Success Metrics",
            icon: "bar_chart",
        },
        "Objection Profile": {
            title: "4. Objection Profile",
            icon: "warning",
        },
        "Personality & Communication": {
            title: "5. Voice & Personality",
            icon: "mic",
        },
        "Voice Configuration": {
            title: "5. Voice & Personality",
            icon: "mic",
        },
        "Training Script Integration": {
            title: "6. Training Script Integration",
            icon: "description",
        },
    };

    const meta = sectionMeta[section.section_name] ?? {
        title: section.section_name,
        icon: "article",
    };

    return (
        <section className="bg-surface-panel rounded-2xl border border-border-subtle p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <span className="material-symbols-outlined !text-[20px]">
                        {meta.icon}
                    </span>
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    {meta.title}
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.fields.map((field) => (
                    <div
                        key={field.key}
                        className={`space-y-2 ${field.type === "text" && (field.key.includes("context") || field.key.includes("notes")) ? "md:col-span-2" : ""}`}
                    >
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            {field.label}
                            {field.required && (
                                <span className="text-danger ml-1">*</span>
                            )}
                        </label>
                        {field.notes && (
                            <p className="text-xs text-text-placeholder italic">
                                {field.notes}
                            </p>
                        )}
                        <FieldInput
                            field={field}
                            value={values[field.key]}
                            onChange={(value) =>
                                onFieldChange(field.key, value)
                            }
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}
