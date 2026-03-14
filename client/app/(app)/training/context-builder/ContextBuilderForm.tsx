"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SESSION_CONTEXT_BUILDER_SCHEMA } from "./schema";
import { Button } from "@/components/atoms/Button";
import { ContextSection } from "@/components/molecules/ContextSection";
import { AdditionalFileContext } from "@/components/molecules/AdditionalFileContext";
import { PersonaConfiguringOverlay } from "@/components/molecules/PersonaConfiguringOverlay";
import { generatePersonaInstruction } from "@/lib/api";
import { savePersona, getPersonaById } from "@/lib/persona-storage";

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
    value: string;
    file: File | null;
}

export function ContextBuilderForm() {
    const searchParams = useSearchParams();
    const personaId = searchParams?.get("personaId");

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
    >([{ id: 1, key: "", value: "", file: null }]);
    const [fileCounter, setFileCounter] = useState(2);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedPersona, setGeneratedPersona] = useState<string | null>(
        null
    );
    const [error, setError] = useState<string | null>(null);

    // Load persona data if personaId is provided
    useEffect(() => {
        if (personaId) {
            const persona = getPersonaById(personaId);
            if (persona) {
                // Prefill form with persona's session context
                setFormValues(persona.sessionContext as FormValues);

                // Prefill additional text context
                const additionalTextContext = persona.sessionContext
                    .additional_text_context as
                    | AdditionalTextItem[]
                    | undefined;
                if (additionalTextContext && additionalTextContext.length > 0) {
                    setAdditionalText(additionalTextContext);
                }

                // Set the existing persona instruction
                setGeneratedPersona(persona.personaInstruction);

                // Update staging keys so session can use this persona immediately
                localStorage.setItem(
                    "proxima_persona_instruction",
                    persona.personaInstruction
                );
                localStorage.setItem(
                    "proxima_session_context",
                    JSON.stringify(persona.sessionContext)
                );
            }
        }
    }, [personaId]);

    function handleFieldChange(
        fieldKey: string,
        value: string | number | boolean | string[] | null
    ) {
        setFormValues((prev) => ({
            ...prev,
            [fieldKey]: value,
        }));
    }

    function addAdditionalFile() {
        setAdditionalFiles((prev) => [
            ...prev,
            { id: fileCounter, key: "", value: "", file: null },
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

    function updateAdditionalFileValue(id: number, value: string) {
        setAdditionalFiles((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, value, file: null } : item
            )
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
                    .filter((f) => f.key && (f.file || f.value.trim()))
                    .map((f) => ({
                        key: f.key,
                        source_type: f.file ? "file" : "text",
                        filename: f.file?.name || "",
                        value: f.value || "",
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

            // Save the persona for future reuse
            savePersona(sessionContext, data.persona_instruction);
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
        <div className="space-y-8 relative">
            {isSubmitting && (
                <PersonaConfiguringOverlay message="Processing uploaded CRM data and documents to build a highly accurate, context-aware simulation..." />
            )}

            {/* Error Messages */}
            {error && (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl">
                    <p className="text-danger text-sm font-medium">Error</p>
                    <p className="text-danger text-sm mt-1">{error}</p>
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

            {/* Knowledge Inputs Section */}
            <section className="bg-surface-panel rounded-2xl border border-border-subtle p-6 space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <span className="material-symbols-outlined !text-[20px]">
                                menu_book
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                            7. Knowledge Inputs
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={addAdditionalFile}
                        className="px-4 py-2 bg-surface-hover border border-border-subtle rounded-lg text-xs font-bold text-white hover:border-primary transition-all"
                    >
                        + ADD SOURCE
                    </button>
                </div>

                <div className="space-y-6">
                    <AdditionalFileContext
                        items={additionalFiles}
                        onAdd={addAdditionalFile}
                        onRemove={removeAdditionalFile}
                        onUpdateKey={updateAdditionalFileKey}
                        onUpdateValue={updateAdditionalFileValue}
                        onUpdateFile={updateAdditionalFile}
                        showHeader={false}
                        showAddButton={false}
                    />
                </div>
            </section>

            {/* Generated Persona Instruction */}
            {generatedPersona && (
                <div className="space-y-4">
                    <hr className="border-border-subtle" />
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-border-subtle pb-3">
                            Generated Persona System Instruction
                        </h3>
                        <div className="p-4 bg-success/10 border border-success/20 rounded-xl">
                            <p className="text-success text-sm font-medium mb-3">
                                ✓ Persona instruction successfully generated
                            </p>
                            <div className="bg-surface-base p-4 rounded-xl border border-border-subtle max-h-96 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#22313a_#141c21] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-surface-panel [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-subtle [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-primary/70">
                                <p className="text-text-main text-sm whitespace-pre-wrap font-mono">
                                    {generatedPersona}
                                </p>
                            </div>
                            <p className="text-success text-xs mt-3">
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
