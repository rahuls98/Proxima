"use client";

import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { SESSION_CONTEXT_BUILDER_SCHEMA } from "./schema";
import { ContextSection } from "@/components/molecules/ContextSection";
import { AdditionalFileContext } from "@/components/molecules/AdditionalFileContext";
import { generatePersonaInstruction } from "@/lib/api";
import { savePersona, getPersonaById } from "@/lib/persona-storage";
import { createDraft, updateDraft } from "@/lib/session-draft";

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

type GenerateResult = {
    sessionContext: Record<string, unknown>;
    personaInstruction: string;
};

export type ContextBuilderFormLegacyHandle = {
    generatePersona: () => Promise<GenerateResult | null>;
};

export const ContextBuilderFormLegacy = forwardRef<
    ContextBuilderFormLegacyHandle
>(function ContextBuilderFormLegacy(_, ref) {
    const searchParams = useSearchParams();
    const personaId = searchParams?.get("personaId");

    const filteredSections = useMemo(
        () =>
            SESSION_CONTEXT_BUILDER_SCHEMA.sections
                .map((section) => ({
                    ...section,
                    fields: section.fields.filter(
                        (field) => field.key !== "prospect_name"
                    ),
                }))
                .filter((section) => section.fields.length > 0),
        []
    );

    const [formValues, setFormValues] = useState<FormValues>(() => {
        const initial: FormValues = {};
        filteredSections.forEach((section) => {
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

    const [error, setError] = useState<string | null>(null);
    const [draftId, setDraftId] = useState<string | null>(null);

    useEffect(() => {
        if (!personaId) {
            return;
        }

        const loadPersona = async () => {
            try {
                const persona = await getPersonaById(personaId);
                if (!persona) {
                    return;
                }

                setFormValues(persona.sessionContext as FormValues);

                const additionalTextContext = persona.sessionContext
                    .additional_text_context as
                    | AdditionalTextItem[]
                    | undefined;
                if (additionalTextContext && additionalTextContext.length > 0) {
                    setAdditionalText(additionalTextContext);
                }

                const draft = await createDraft({
                    persona_instruction: persona.personaInstruction,
                    session_context: persona.sessionContext as Record<
                        string,
                        unknown
                    >,
                });
                setDraftId(draft.id);
            } catch (loadError) {
                console.error("Failed to load persona:", loadError);
            }
        };

        loadPersona();
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

    const generatePersona = async (): Promise<GenerateResult | null> => {
        setError(null);

        const requiredErrors: string[] = [];
        filteredSections.forEach((section) => {
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
            return null;
        }

        try {
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

            const data = await generatePersonaInstruction(sessionContext);
            sessionContext.prospect_name = data.prospect_name;

            await savePersona(sessionContext, data.persona_instruction);

            const draftPayload = {
                persona_instruction: data.persona_instruction,
                session_context: sessionContext,
            };

            if (draftId) {
                await updateDraft(draftId, draftPayload);
            } else {
                const draft = await createDraft(draftPayload);
                setDraftId(draft.id);
            }

            return {
                sessionContext,
                personaInstruction: data.persona_instruction,
            };
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "An unknown error occurred"
            );
            console.error("Submission error:", err);
            return null;
        }
    };

    useImperativeHandle(ref, () => ({
        generatePersona,
    }));

    return (
        <div className="space-y-8 relative">
            {/* Main Schema Sections */}
            {filteredSections.map((section) => (
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

            {error && (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl">
                    <p className="text-danger text-sm font-medium">Error</p>
                    <p className="text-danger text-sm mt-1">{error}</p>
                </div>
            )}
        </div>
    );
});
