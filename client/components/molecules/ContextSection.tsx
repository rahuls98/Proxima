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
    return (
        <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-900 border-b border-zinc-200 pb-3">
                {section.section_name}
            </h3>

            <div className="space-y-4">
                {section.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-900">
                            {field.label}
                            {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                            )}
                        </label>
                        {field.notes && (
                            <p className="text-xs text-zinc-600 italic">
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
