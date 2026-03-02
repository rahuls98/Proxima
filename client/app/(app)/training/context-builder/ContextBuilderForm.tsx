"use client";

import { useState } from "react";
import { SESSION_CONTEXT_BUILDER_SCHEMA } from "./schema";
import { Button } from "@/components/atoms/Button";
import { ContextSection } from "@/components/molecules/ContextSection";
import { AdditionalTextContext } from "@/components/molecules/AdditionalTextContext";
import { AdditionalFileContext } from "@/components/molecules/AdditionalFileContext";
import { generatePersonaInstruction } from "@/lib/api";

interface FormValues {
    [key: string]: string | number | boolean | string[] | null;
}

interface AdditionalTextItem {
    id: number;
    key: string;
    value: string;
}

interface AdditionalFileItem {
    id: number;
    key: string;
    file: File | null;
}

interface PersonaInstructionResponse {
    persona_instruction: string;
    source_fields_count: number;
}

export function ContextBuilderForm() {
    const [formValues, setFormValues] = useState<FormValues>(() => {
        const initial: FormValues = {};
        SESSION_CONTEXT_BUILDER_SCHEMA.sections.forEach((section) => {
            section.fields.forEach((field) => {
                initial[field.key] = field.dummy_value ?? null;
            });
        });
        return initial;
    });

    const [additionalText, setAdditionalText] = useState<AdditionalTextItem[]>([
        { id: 1, key: "", value: "" },
    ]);
    const [additionalFiles, setAdditionalFiles] = useState<
        AdditionalFileItem[]
    >([{ id: 1, key: "", file: null }]);
    const [textCounter, setTextCounter] = useState(2);
    const [fileCounter, setFileCounter] = useState(2);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedPersona, setGeneratedPersona] = useState<string | null>(
        null
    );
    const [error, setError] = useState<string | null>(null);

    function handleFieldChange(
        fieldKey: string,
        value: string | number | boolean | string[] | null
    ) {
        setFormValues((prev) => ({
            ...prev,
            [fieldKey]: value,
        }));
    }

    function addAdditionalText() {
        setAdditionalText((prev) => [
            ...prev,
            { id: textCounter, key: "", value: "" },
        ]);
        setTextCounter((c) => c + 1);
    }

    function removeAdditionalText(id: number) {
        setAdditionalText((prev) => prev.filter((item) => item.id !== id));
    }

    function updateAdditionalText(
        id: number,
        field: "key" | "value",
        value: string
    ) {
        setAdditionalText((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    }

    function addAdditionalFile() {
        setAdditionalFiles((prev) => [
            ...prev,
            { id: fileCounter, key: "", file: null },
        ]);
        setFileCounter((c) => c + 1);
    }

    function removeAdditionalFile(id: number) {
        setAdditionalFiles((prev) => prev.filter((item) => item.id !== id));
    }

    function updateAdditionalFileKey(id: number, key: string) {
        setAdditionalFiles((prev) =>
            prev.map((item) => (item.id === id ? { ...item, key } : item))
        );
    }

    function updateAdditionalFile(id: number, file: File | null) {
        setAdditionalFiles((prev) =>
            prev.map((item) => (item.id === id ? { ...item, file } : item))
        );
    }

    function handleSubmit() {
        // Validate required fields
        const requiredErrors: string[] = [];
        SESSION_CONTEXT_BUILDER_SCHEMA.sections.forEach((section) => {
            section.fields.forEach((field) => {
                if (field.required && !formValues[field.key]) {
                    requiredErrors.push(`${field.label} is required`);
                }
            });
        });

        if (requiredErrors.length > 0) {
            setError(
                "Please fill in required fields:\n" + requiredErrors.join("\n")
            );
            return;
        }

        // Proceed with submission
        submitToBackend();
    }

    async function submitToBackend() {
        setIsSubmitting(true);
        setError(null);
        setGeneratedPersona(null);

        try {
            // Prepare the session context payload
            const sessionContext = {
                ...formValues,
                additional_text_context: additionalText.filter(
                    (t) => t.key && t.value
                ),
                additional_files_context: additionalFiles
                    .filter((f) => f.key && f.file)
                    .map((f) => ({
                        key: f.key,
                        filename: f.file?.name || "",
                    })),
            };

            // Call the persona instruction endpoint
            const data = await generatePersonaInstruction(sessionContext);
            setGeneratedPersona(data.persona_instruction);

            // Store in localStorage for later use in live session
            localStorage.setItem(
                "proxima_persona_instruction",
                data.persona_instruction
            );
            localStorage.setItem(
                "proxima_session_context",
                JSON.stringify(sessionContext)
            );
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "An unknown error occurred"
            );
            console.error("Submission error:", err);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-8">
            {/* Error Messages */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800 text-sm font-medium">Error</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
            )}

            {/* Main Schema Sections */}
            {SESSION_CONTEXT_BUILDER_SCHEMA.sections.map((section) => (
                <ContextSection
                    key={section.section_name}
                    section={section}
                    values={formValues}
                    onFieldChange={handleFieldChange}
                />
            ))}

            <hr className="border-zinc-200" />

            {/* Additional Context Section */}
            <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-900 border-b border-zinc-200 pb-3">
                    Additional Context
                </h3>

                <div className="space-y-6">
                    <AdditionalTextContext
                        items={additionalText}
                        onAdd={addAdditionalText}
                        onRemove={removeAdditionalText}
                        onUpdateKey={(id, key) =>
                            updateAdditionalText(id, "key", key)
                        }
                        onUpdateValue={(id, value) =>
                            updateAdditionalText(id, "value", value)
                        }
                    />

                    <AdditionalFileContext
                        items={additionalFiles}
                        onAdd={addAdditionalFile}
                        onRemove={removeAdditionalFile}
                        onUpdateKey={updateAdditionalFileKey}
                        onUpdateFile={updateAdditionalFile}
                    />
                </div>
            </section>

            {/* Submit Button */}
            <div className="flex gap-3">
                <Button
                    onClick={handleSubmit}
                    variant="primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? "Generating Persona..."
                        : "Save Session Context"}
                </Button>
            </div>

            {/* Generated Persona Instruction */}
            {generatedPersona && (
                <div className="space-y-4">
                    <hr className="border-zinc-200" />
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-900 border-b border-zinc-200 pb-3">
                            Generated Persona System Instruction
                        </h3>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-green-800 text-sm font-medium mb-3">
                                ✓ Persona instruction successfully generated
                            </p>
                            <div className="bg-white p-4 rounded border border-zinc-200 max-h-96 overflow-y-auto">
                                <p className="text-zinc-700 text-sm whitespace-pre-wrap font-mono">
                                    {generatedPersona}
                                </p>
                            </div>
                            <p className="text-green-700 text-xs mt-3">
                                This instruction is saved and will be used for
                                your live training session.
                            </p>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
