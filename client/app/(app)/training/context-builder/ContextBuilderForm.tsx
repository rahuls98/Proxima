"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/atoms/Input";
import { AdditionalFileContext } from "@/components/molecules/AdditionalFileContext";
import {
    generatePersonaImageDataUrl,
    generatePersonaInstruction,
} from "@/lib/api";
import { fetchAvatarGenerationEnabled } from "@/lib/ai-feature-settings";
import { savePersona, getPersonaById } from "@/lib/persona-storage";
import { setSessionContext } from "@/lib/session-context";

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
    generatePersona: (sessionId: string) => Promise<GenerateResult | null>;
};

const emptyForm: FormValues = {
    job_title: "VP of Marketing",
    department: "Marketing",
    company_name: "Atlas Growth Co.",
    company_size: "200-500 employees",
    industry: "B2B SaaS",
    buying_stage: "Evaluation",
    current_initiative: "Modernizing lead-to-revenue analytics",
    current_tools: "HubSpot, GA4, Looker",
    budget_status: "Budget approved for Q2",
    decision_timeline: "6-8 weeks",
};

const AVATAR_STORAGE_KEY_PREFIX = "persona_image_";
const AVATAR_MAX_DIMENSION_STEPS = [512, 384, 256, 192];

function isQuotaExceededError(error: unknown): boolean {
    if (!(error instanceof DOMException)) {
        return false;
    }
    return error.name === "QuotaExceededError" || error.code === 22;
}

function clearStoredPersonaImages() {
    if (typeof window === "undefined") {
        return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(AVATAR_STORAGE_KEY_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}

async function resizeAvatarDataUrl(
    inputDataUrl: string,
    maxDimension: number
): Promise<string> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () =>
            reject(new Error("Failed to load generated avatar image."));
        image.src = inputDataUrl;
    });

    const longestEdge = Math.max(img.width, img.height, 1);
    const scale = Math.min(1, maxDimension / longestEdge);
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    if (width === img.width && height === img.height) {
        return inputDataUrl;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to initialize canvas for avatar resizing.");
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
}

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

        const generatePersona = async (
            sessionId: string
        ): Promise<GenerateResult | null> => {
            setError(null);

            if (!sessionId) {
                setError(
                    "Session ID is missing. Please refresh and try again."
                );
                return null;
            }

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
                sessionContext.prospect_gender = data.voice_gender;
                sessionContext.voice_name = data.voice_name;
                sessionContext.voice_gender = data.voice_gender;
                sessionContext.voice_tone = data.voice_tone;

                await savePersona(sessionContext, data.persona_instruction);

                const avatarStorageKey = `${AVATAR_STORAGE_KEY_PREFIX}${sessionId}`;
                if (await fetchAvatarGenerationEnabled()) {
                    // Generate avatar before entering meeting room.
                    let personaImageDataUrl: string;
                    try {
                        personaImageDataUrl =
                            await generatePersonaImageDataUrl(sessionContext);
                    } catch (imgErr) {
                        throw new Error(
                            imgErr instanceof Error
                                ? `Failed to generate persona avatar: ${imgErr.message}`
                                : "Failed to generate persona avatar."
                        );
                    }

                    let stored = false;

                    for (const maxDimension of AVATAR_MAX_DIMENSION_STEPS) {
                        const resizedAvatar = await resizeAvatarDataUrl(
                            personaImageDataUrl,
                            maxDimension
                        );
                        try {
                            sessionStorage.setItem(
                                avatarStorageKey,
                                resizedAvatar
                            );
                            stored = true;
                            break;
                        } catch (storageErr) {
                            if (!isQuotaExceededError(storageErr)) {
                                throw storageErr;
                            }
                            clearStoredPersonaImages();
                        }
                    }

                    if (!stored) {
                        throw new Error(
                            "Failed to cache persona avatar locally due to browser storage limits."
                        );
                    }
                } else {
                    sessionStorage.removeItem(avatarStorageKey);
                }

                const contextPayload = {
                    persona_instruction: data.persona_instruction,
                    session_context: sessionContext,
                };

                await setSessionContext(sessionId, contextPayload);

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
