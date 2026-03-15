"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppPageHeader } from "@/components/molecules/AppPageHeader";
import { getPersonaById, type SavedPersona } from "@/lib/persona-storage";
import { DUMMY_PERSONA_IMAGES } from "@/lib/ui-dummy-data";

export default function PersonaDetailsPage() {
    const router = useRouter();
    const params = useParams<{ personaId: string }>();
    const personaId = params.personaId;

    const [persona, setPersona] = useState<SavedPersona | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPersona = async () => {
            setIsLoading(true);
            try {
                const result = await getPersonaById(personaId);
                setPersona(result);
            } catch (error) {
                console.error("Failed to load persona:", error);
                setPersona(null);
            } finally {
                setIsLoading(false);
            }
        };
        loadPersona();
    }, [personaId]);

    const activePersona = persona;
    const formatDate = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "--";
        }
        return date.toISOString().slice(0, 10);
    };

    const imageSrc =
        activePersona && activePersona.name
            ? DUMMY_PERSONA_IMAGES[activePersona.name] ||
              DUMMY_PERSONA_IMAGES["Priya Nair"]
            : DUMMY_PERSONA_IMAGES["Priya Nair"];

    const contextEntries = activePersona
        ? Object.entries(activePersona.sessionContext).filter(
              ([, value]) =>
                  value !== undefined && value !== null && value !== ""
          )
        : [];

    if (!activePersona && !isLoading) {
        return (
            <div className="flex-1 min-h-0 flex flex-col bg-surface-base">
                <AppPageHeader title="Persona Details" />
                <div className="flex-1 overflow-y-auto p-8 no-scrollbar max-w-7xl mx-auto w-full">
                    <section className="bg-surface-panel border border-border-subtle rounded-2xl p-8 space-y-5">
                        <h2 className="text-2xl font-bold text-text-main">
                            Persona Not Found
                        </h2>
                        <p className="text-sm text-text-muted">
                            This persona no longer exists in your local library.
                        </p>
                        <button
                            onClick={() => router.push("/personas")}
                            className="bg-primary text-surface-base font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Back to Personas
                        </button>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-surface-base">
            <AppPageHeader title="Persona Details" />

            <div className="flex-1 overflow-y-auto p-8 no-scrollbar max-w-7xl mx-auto w-full space-y-8">
                <section className="bg-surface-panel border border-border-subtle rounded-2xl p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[96px_1fr] gap-6 items-start">
                    <img
                        src={imageSrc}
                        alt={activePersona?.name || "Persona"}
                        className="w-24 h-24 rounded-2xl object-cover border border-border-subtle"
                    />
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-text-main leading-tight">
                                    {activePersona.name}
                                </h2>
                                <p className="text-primary font-semibold mt-1">
                                    {activePersona.jobTitle || "Role not set"}
                                </p>
                                <p className="text-sm text-text-muted mt-1">
                                    {activePersona.department || "General"}
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    router.push(
                                        `/training/context-builder?personaId=${activePersona.id}`
                                    )
                                }
                                className="bg-primary/10 text-primary font-bold px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors"
                            >
                                Quick Start
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-1 bg-surface-hover border border-border-subtle text-text-main text-[10px] font-bold rounded uppercase tracking-wider">
                                {(activePersona.sessionContext
                                    .personality as string) || "The Pragmatist"}
                            </span>
                            <span className="px-2.5 py-1 bg-surface-hover border border-border-subtle text-text-main text-[10px] font-bold rounded uppercase tracking-wider">
                                Created{" "}
                                {formatDate(activePersona.createdAt)}
                            </span>
                        </div>
                    </div>
                </section>

                <section className="bg-surface-panel border border-border-subtle rounded-2xl p-6 lg:p-8 space-y-5">
                    <h3 className="text-lg font-bold text-text-main">
                        Session Context
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {contextEntries.map(([key, value]) => (
                            <div
                                key={key}
                                className="bg-surface-hover/40 border border-border-subtle rounded-xl p-4"
                            >
                                <p className="text-[11px] uppercase tracking-wider font-bold text-text-muted mb-1">
                                    {key.replaceAll("_", " ")}
                                </p>
                                <p className="text-sm text-text-main break-words">
                                    {String(value)}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-surface-panel border border-border-subtle rounded-2xl p-6 lg:p-8 space-y-4">
                    <h3 className="text-lg font-bold text-text-main">
                        Persona Instruction
                    </h3>
                    <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                        {activePersona.personaInstruction ||
                            "No instruction saved."}
                    </p>
                </section>
            </div>
        </div>
    );
}
