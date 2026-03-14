"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppPageHeader } from "@/components/molecules/AppPageHeader";
import { getSavedPersonas } from "@/lib/persona-storage";
import { DUMMY_PERSONA_IMAGES, DUMMY_PERSONAS } from "@/lib/ui-dummy-data";

export default function PersonaDetailsPage() {
    const router = useRouter();
    const params = useParams<{ personaId: string }>();
    const personaId = params.personaId;

    const persona = useMemo(() => {
        const saved = getSavedPersonas();
        const source = saved.length > 0 ? saved : DUMMY_PERSONAS;
        return source.find((entry) => entry.id === personaId) || null;
    }, [personaId]);

    const imageSrc = persona
        ? DUMMY_PERSONA_IMAGES[persona.name] ||
          DUMMY_PERSONA_IMAGES["Priya Nair"]
        : DUMMY_PERSONA_IMAGES["Priya Nair"];

    const contextEntries = persona
        ? Object.entries(persona.sessionContext).filter(
              ([, value]) =>
                  value !== undefined && value !== null && value !== ""
          )
        : [];

    if (!persona) {
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
                        alt={persona.name}
                        className="w-24 h-24 rounded-2xl object-cover border border-border-subtle"
                    />
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-text-main leading-tight">
                                    {persona.name}
                                </h2>
                                <p className="text-primary font-semibold mt-1">
                                    {persona.jobTitle || "Role not set"}
                                </p>
                                <p className="text-sm text-text-muted mt-1">
                                    {persona.department || "General"}
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    router.push(
                                        `/training/context-builder?personaId=${persona.id}`
                                    )
                                }
                                className="bg-primary/10 text-primary font-bold px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors"
                            >
                                Quick Start
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-1 bg-surface-hover border border-border-subtle text-text-main text-[10px] font-bold rounded uppercase tracking-wider">
                                {(persona.sessionContext
                                    .personality as string) || "The Pragmatist"}
                            </span>
                            <span className="px-2.5 py-1 bg-surface-hover border border-border-subtle text-text-main text-[10px] font-bold rounded uppercase tracking-wider">
                                Created{" "}
                                {new Date(
                                    persona.createdAt
                                ).toLocaleDateString()}
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
                        {persona.personaInstruction || "No instruction saved."}
                    </p>
                </section>
            </div>
        </div>
    );
}
