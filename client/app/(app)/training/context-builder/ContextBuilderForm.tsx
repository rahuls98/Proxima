"use client";

import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
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
    company_name: string;
    location: string;
    industry: string;
    // Persona fields
    discussion_stage: string;
    objection_archetype: string;
    skepticism_level: string;
    negotiation_toughness: string;
    decision_style: string;
    trust_level_at_start: string;
};

const REQUIRED_FIELDS: (keyof FormValues)[] = [
    "job_title",
    "company_name",
    "location",
    "industry",
    "discussion_stage",
    "objection_archetype",
    "skepticism_level",
    "negotiation_toughness",
    "decision_style",
    "trust_level_at_start",
];
type GenerateResult = {
    sessionContext: Record<string, unknown>;
    personaInstruction: string;
};

export type ContextBuilderFormHandle = {
    generatePersona: (sessionId: string) => Promise<GenerateResult | null>;
};

const emptyForm: FormValues = {
    job_title: "",
    company_name: "",
    location: "",
    industry: "",
    discussion_stage: "",
    objection_archetype: "",
    skepticism_level: "",
    negotiation_toughness: "",
    decision_style: "",
    trust_level_at_start: "",
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

        const randomizePersonaConfiguration = (
            base: FormValues
        ): FormValues => {
            const archetypes = ["skeptic", "visionary", "guardian"];
            const decisionStyles = [
                "Data-Driven",
                "Consensus-Based",
                "Intuitive",
                "Top-Down",
            ];
            const discussionStages = [
                "Awareness",
                "Consideration",
                "Decision",
                "Expansion",
            ];

            return {
                ...base,
                discussion_stage:
                    discussionStages[
                        Math.floor(Math.random() * discussionStages.length)
                    ],
                objection_archetype:
                    archetypes[Math.floor(Math.random() * archetypes.length)],
                decision_style:
                    decisionStyles[
                        Math.floor(Math.random() * decisionStyles.length)
                    ],
                skepticism_level: String(Math.floor(Math.random() * 5) + 1),
                negotiation_toughness: String(
                    Math.floor(Math.random() * 5) + 1
                ),
                trust_level_at_start: String(Math.floor(Math.random() * 5) + 1),
            };
        };

        const [formValues, setFormValues] = useState<FormValues>(emptyForm);
        const [additionalFiles, setAdditionalFiles] = useState<
            AdditionalFileItem[]
        >([{ id: 1, key: "", value: "", file: null }]);
        const [fileCounter, setFileCounter] = useState(2);

        const [error, setError] = useState<string | null>(null);
        const [submitAttempted, setSubmitAttempted] = useState(false);

        // Randomize Persona section values on mount (if not loading existing persona)
        useEffect(() => {
            if (!personaId) {
                setFormValues((prev) => randomizePersonaConfiguration(prev));
            }
        }, [personaId]);
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
                        company_name: context.company_name || "",
                        location: context.location || "",
                        industry: context.industry || "",
                        discussion_stage: context.discussion_stage || "",
                        objection_archetype: context.objection_archetype || "",
                        skepticism_level:
                            String(context.skepticism_level || "") || "",
                        negotiation_toughness:
                            String(context.negotiation_toughness || "") || "",
                        decision_style: context.decision_style || "",
                        trust_level_at_start:
                            String(context.trust_level_at_start || "") || "",
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

        // Refs for each required field
        const fieldRefs = {
            job_title: useRef<HTMLDivElement>(null),
            company_name: useRef<HTMLDivElement>(null),
            location: useRef<HTMLDivElement>(null),
            industry: useRef<HTMLDivElement>(null),
            discussion_stage: useRef<HTMLDivElement>(null),
            objection_archetype: useRef<HTMLDivElement>(null),
            skepticism_level: useRef<HTMLDivElement>(null),
            negotiation_toughness: useRef<HTMLDivElement>(null),
            decision_style: useRef<HTMLDivElement>(null),
            trust_level_at_start: useRef<HTMLDivElement>(null),
        };

        const generatePersona = async (
            sessionId: string
        ): Promise<GenerateResult | null> => {
            setError(null);
            setSubmitAttempted(true);

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
                // Scroll to first missing field after DOM updates
                const firstMissing = missing[0];
                setTimeout(() => {
                    const ref = fieldRefs[firstMissing];
                    if (ref && ref.current) {
                        ref.current.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });
                        // Also focus the first input/select inside the errored field for accessibility
                        const input = ref.current.querySelector(
                            "input,select,textarea,button"
                        );
                        if (input && input instanceof HTMLElement) {
                            input.focus();
                        }
                    } else {
                        // fallback: try by id
                        const el = document.getElementById(
                            `field-${firstMissing}`
                        );
                        if (el)
                            el.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                            });
                    }
                }, 0);
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

        // Helper to check if a field is missing and should show error
        const showFieldError = (key: keyof FormValues) =>
            submitAttempted && !formValues[key]?.trim();

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
                        <div
                            className="space-y-1"
                            ref={fieldRefs.job_title}
                            id="field-job_title"
                        >
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Job Title
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. VP of Operations"
                                value={formValues.job_title}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "job_title",
                                        e.target.value
                                    )
                                }
                                className={
                                    showFieldError("job_title")
                                        ? "border-danger"
                                        : ""
                                }
                            />
                            {showFieldError("job_title") && (
                                <span className="text-xs text-danger">
                                    Required
                                </span>
                            )}
                        </div>
                        <div
                            className="space-y-1"
                            ref={fieldRefs.company_name}
                            id="field-company_name"
                        >
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Company Name
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Acme Cloud Corp"
                                value={formValues.company_name}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "company_name",
                                        e.target.value
                                    )
                                }
                                className={
                                    showFieldError("company_name")
                                        ? "border-danger"
                                        : ""
                                }
                            />
                            {showFieldError("company_name") && (
                                <span className="text-xs text-danger">
                                    Required
                                </span>
                            )}
                        </div>
                        <div
                            className="space-y-1"
                            ref={fieldRefs.location}
                            id="field-location"
                        >
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Location
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. North America (EST)"
                                value={formValues.location}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "location",
                                        e.target.value
                                    )
                                }
                                className={
                                    showFieldError("location")
                                        ? "border-danger"
                                        : ""
                                }
                            />
                            {showFieldError("location") && (
                                <span className="text-xs text-danger">
                                    Required
                                </span>
                            )}
                        </div>
                        <div
                            className="space-y-1"
                            ref={fieldRefs.industry}
                            id="field-industry"
                        >
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Industry
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Fintech"
                                value={formValues.industry}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "industry",
                                        e.target.value
                                    )
                                }
                                className={
                                    showFieldError("industry")
                                        ? "border-danger"
                                        : ""
                                }
                            />
                            {showFieldError("industry") && (
                                <span className="text-xs text-danger">
                                    Required
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                {/* Persona Section */}
                <section
                    className="bg-surface-panel rounded-2xl border border-border-subtle p-6"
                    data-purpose="persona-section"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                    ></path>
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                                Persona Configuration
                            </h2>
                        </div>
                        <button
                            type="button"
                            className="bg-surface-hover border border-border-subtle text-text-main hover:bg-surface-base px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-xs font-bold"
                            onClick={() => {
                                setFormValues((prev) =>
                                    randomizePersonaConfiguration(prev)
                                );
                            }}
                        >
                            <span className="material-symbols-outlined !text-[20px]">
                                shuffle
                            </span>
                            Randomize
                        </button>
                    </div>
                    {/* Discussion Stage Dropdown */}
                    <div
                        className="mb-8"
                        ref={fieldRefs.discussion_stage}
                        id="field-discussion_stage"
                    >
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Discussion Stage
                        </label>
                        <select
                            className={`w-full bg-surface-base border rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all ${showFieldError("discussion_stage") ? "border-danger" : "border-border-subtle"}`}
                            value={formValues.discussion_stage || ""}
                            onChange={(e) =>
                                handleFieldChange(
                                    "discussion_stage" as keyof FormValues,
                                    e.target.value
                                )
                            }
                        >
                            <option value="" disabled hidden>
                                Select a stage...
                            </option>
                            <option>Awareness</option>
                            <option>Consideration</option>
                            <option>Decision</option>
                            <option>Expansion</option>
                        </select>
                        {showFieldError("discussion_stage") && (
                            <span className="text-xs text-danger">
                                Required
                            </span>
                        )}
                    </div>
                    <div
                        className="grid grid-cols-3 gap-4 mb-8"
                        ref={fieldRefs.objection_archetype}
                        id="field-objection_archetype"
                    >
                        {[
                            {
                                key: "skeptic",
                                label: "The Skeptic",
                                desc: "Questions data and demands proof at every step.",
                            },
                            {
                                key: "visionary",
                                label: "The Visionary",
                                desc: "Focused on long-term strategy and transformation.",
                            },
                            {
                                key: "guardian",
                                label: "The Guardian",
                                desc: "Protects current workflows and budget stability.",
                            },
                        ].map((arch) => (
                            <div
                                key={arch.key}
                                className={`p-4 rounded-xl border ${formValues.objection_archetype === arch.key ? "border-primary bg-primary/5" : showFieldError("objection_archetype") ? "border-danger" : "border-border-subtle bg-surface-base hover:border-primary/50 transition-all duration-300 cursor-pointer group"}`}
                                onClick={() =>
                                    handleFieldChange(
                                        "objection_archetype" as keyof FormValues,
                                        arch.key
                                    )
                                }
                            >
                                <div
                                    className={`font-bold ${formValues.objection_archetype === arch.key ? "text-primary" : "text-white"} mb-1`}
                                >
                                    {arch.label}
                                </div>
                                <div className="text-xs text-text-muted">
                                    {arch.desc}
                                </div>
                            </div>
                        ))}
                        {showFieldError("objection_archetype") && (
                            <span className="text-xs text-danger">
                                Select one archetype
                            </span>
                        )}
                    </div>
                    {/* Decision Style in its own row */}
                    <div
                        className="mb-8"
                        ref={fieldRefs.decision_style}
                        id="field-decision_style"
                    >
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Decision Style
                        </label>
                        <select
                            className={`w-full bg-surface-base border rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all ${showFieldError("decision_style") ? "border-danger" : "border-border-subtle"}`}
                            value={formValues.decision_style || "Data-Driven"}
                            onChange={(e) =>
                                handleFieldChange(
                                    "decision_style" as keyof FormValues,
                                    e.target.value
                                )
                            }
                        >
                            <option>Data-Driven</option>
                            <option>Consensus-Based</option>
                            <option>Intuitive</option>
                            <option>Top-Down</option>
                        </select>
                        {showFieldError("decision_style") && (
                            <span className="text-xs text-danger">
                                Required
                            </span>
                        )}
                    </div>
                    {/* All sliders in one row */}
                    <div className="grid grid-cols-3 gap-6">
                        {/* Skepticism Level Slider */}
                        <div
                            ref={fieldRefs.skepticism_level}
                            id="field-skepticism_level"
                        >
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Skepticism Level
                            </label>
                            <input
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={formValues.skepticism_level || 3}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "skepticism_level" as keyof FormValues,
                                        e.target.value
                                    )
                                }
                                className={`w-full accent-primary ${showFieldError("skepticism_level") ? "border-danger" : ""}`}
                            />
                            <div className="flex justify-between text-xs text-text-muted mt-1">
                                <span>1</span>
                                <span className="font-semibold text-text-main">
                                    {formValues.skepticism_level || 3}
                                </span>
                                <span>5</span>
                            </div>
                            {showFieldError("skepticism_level") && (
                                <span className="text-xs text-danger">
                                    Required
                                </span>
                            )}
                        </div>
                        {/* Toughness in Negotiation Slider */}
                        <div
                            ref={fieldRefs.negotiation_toughness}
                            id="field-negotiation_toughness"
                        >
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Toughness in Negotiation
                            </label>
                            <input
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={formValues.negotiation_toughness || 3}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "negotiation_toughness" as keyof FormValues,
                                        e.target.value
                                    )
                                }
                                className={`w-full accent-primary ${showFieldError("negotiation_toughness") ? "border-danger" : ""}`}
                            />
                            <div className="flex justify-between text-xs text-text-muted mt-1">
                                <span>1</span>
                                <span className="font-semibold text-text-main">
                                    {formValues.negotiation_toughness || 3}
                                </span>
                                <span>5</span>
                            </div>
                            {showFieldError("negotiation_toughness") && (
                                <span className="text-xs text-danger">
                                    Required
                                </span>
                            )}
                        </div>
                        {/* Initial Trust Score Slider */}
                        <div
                            ref={fieldRefs.trust_level_at_start}
                            id="field-trust_level_at_start"
                        >
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Initial Trust Score
                            </label>
                            <input
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={formValues.trust_level_at_start || 3}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "trust_level_at_start" as keyof FormValues,
                                        e.target.value
                                    )
                                }
                                className={`w-full accent-primary ${showFieldError("trust_level_at_start") ? "border-danger" : ""}`}
                            />
                            <div className="flex justify-between text-xs text-text-muted mt-1">
                                <span>1</span>
                                <span className="font-semibold text-text-main">
                                    {formValues.trust_level_at_start || 3}
                                </span>
                                <span>5</span>
                            </div>
                            {showFieldError("trust_level_at_start") && (
                                <span className="text-xs text-danger">
                                    Required
                                </span>
                            )}
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
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                                Additional Context
                            </h2>
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
                {/* Only show error for non-required errors (e.g., session ID missing, avatar generation, etc.) */}
                {error && !error.includes("required") && (
                    <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl">
                        <p className="text-danger text-sm font-medium">Error</p>
                        <p className="text-danger text-sm mt-1">{error}</p>
                    </div>
                )}
            </div>
        );
    }
);
