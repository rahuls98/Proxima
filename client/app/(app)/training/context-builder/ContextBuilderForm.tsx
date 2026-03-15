"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/atoms/Input";
import { AdditionalFileContext } from "@/components/molecules/AdditionalFileContext";
import { generatePersonaInstruction } from "@/lib/api";
import { savePersona, getPersonaById } from "@/lib/persona-storage";
import { createDraft, updateDraft } from "@/lib/session-draft";

type AdditionalFileItem = {
    id: number;
    key: string;
    value: string;
    file: File | null;
};

type FormValues = {
    job_title: string;
    department: string;
    company_name: string;
    company_size: string;
    industry: string;
    buying_stage: string;
    current_initiative: string;
    current_tools: string;
    budget_status: string;
    decision_timeline: string;
};

const REQUIRED_FIELDS: (keyof FormValues)[] = [
    "job_title",
    "department",
    "company_name",
    "company_size",
    "industry",
    "buying_stage",
    "current_initiative",
    "current_tools",
    "budget_status",
    "decision_timeline",
];
type GenerateResult = {
    sessionContext: Record<string, unknown>;
    personaInstruction: string;
};

export type ContextBuilderFormHandle = {
    generatePersona: () => Promise<GenerateResult | null>;
};

const emptyForm: FormValues = {
    job_title: "",
    department: "",
    company_name: "",
    company_size: "",
    industry: "",
    buying_stage: "",
    current_initiative: "",
    current_tools: "",
    budget_status: "",
    decision_timeline: "",
};

export const ContextBuilderForm = forwardRef<ContextBuilderFormHandle>(
    function ContextBuilderForm(_, ref) {
        const searchParams = useSearchParams();
        const personaId = searchParams?.get("personaId");

        const [formValues, setFormValues] = useState<FormValues>(emptyForm);
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

                    const context = persona.sessionContext as Record<
                        string,
                        any
                    >;
                    setFormValues({
                        job_title: context.job_title || "",
                        department: context.department || "",
                        company_name: context.company_name || "",
                        company_size: context.company_size || "",
                        industry: context.industry || "",
                        buying_stage: context.buying_stage || "",
                        current_initiative: context.current_initiative || "",
                        current_tools: context.current_tools || "",
                        budget_status: context.budget_status || "",
                        decision_timeline: context.decision_timeline || "",
                    });

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

        const handleFieldChange = (key: keyof FormValues, value: string) => {
            setFormValues((prev) => ({
                ...prev,
                [key]: value,
            }));
        };

        const addAdditionalFile = () => {
            setAdditionalFiles((prev) => [
                ...prev,
                { id: fileCounter, key: "", value: "", file: null },
            ]);
            setFileCounter((c) => c + 1);
        };

        const removeAdditionalFile = (id: number) => {
            setAdditionalFiles((prev) => prev.filter((item) => item.id !== id));
        };

        const updateAdditionalFileKey = (id: number, key: string) => {
            setAdditionalFiles((prev) =>
                prev.map((item) => (item.id === id ? { ...item, key } : item))
            );
        };

        const updateAdditionalFileValue = (id: number, value: string) => {
            setAdditionalFiles((prev) =>
                prev.map((item) =>
                    item.id === id ? { ...item, value, file: null } : item
                )
            );
        };

        const updateAdditionalFile = (id: number, file: File | null) => {
            setAdditionalFiles((prev) =>
                prev.map((item) => (item.id === id ? { ...item, file } : item))
            );
        };

        const generatePersona = async (): Promise<GenerateResult | null> => {
            setError(null);

            const missing = REQUIRED_FIELDS.filter(
                (key) => !formValues[key]?.trim()
            );
            if (missing.length > 0) {
                setError("Please fill in all required fields.");
                return null;
            }

            try {
                const sessionContext: Record<string, unknown> = {
                    ...formValues,
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
                    err instanceof Error
                        ? err.message
                        : "An unknown error occurred"
                );
                console.error("Submission error:", err);
                return null;
            }
        };

        useImperativeHandle(ref, () => ({
            generatePersona,
        }));

        return (
            <div className="space-y-8">
                <section className="bg-surface-panel rounded-2xl border border-border-subtle p-6 space-y-8">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary flex">
                            <span className="material-symbols-outlined !text-[20px]">
                                person
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                            Prospect Identity
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Job Title
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. VP of Marketing"
                                value={formValues.job_title}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "job_title",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Department
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Marketing"
                                value={formValues.department}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "department",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Company Name
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. GrowthStack"
                                value={formValues.company_name}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "company_name",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Company Size
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. 500-1000 employees"
                                value={formValues.company_size}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "company_size",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Industry
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. B2B SaaS"
                                value={formValues.industry}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "industry",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-surface-panel rounded-2xl border border-border-subtle p-6 space-y-8">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary flex">
                            <span className="material-symbols-outlined !text-[20px]">
                                work
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                            Business Context
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Buying Stage
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Early Evaluation"
                                value={formValues.buying_stage}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "buying_stage",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Current Initiative
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Marketing automation overhaul"
                                value={formValues.current_initiative}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "current_initiative",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Current Tools
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. HubSpot, Salesforce"
                                value={formValues.current_tools}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "current_tools",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Budget Status
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Pending Approval"
                                value={formValues.budget_status}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "budget_status",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Decision Timeline
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. 3-6 months"
                                value={formValues.decision_timeline}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "decision_timeline",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-surface-panel rounded-2xl border border-border-subtle p-6 space-y-8">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary flex">
                                <span className="material-symbols-outlined !text-[20px]">
                                    menu_book
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                                Knowledge Inputs
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
                </section>

                {error && (
                    <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl">
                        <p className="text-danger text-sm font-medium">Error</p>
                        <p className="text-danger text-sm mt-1">{error}</p>
                    </div>
                )}
            </div>
        );
    }
);
