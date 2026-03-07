"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heading } from "@/components/atoms/Heading";
import { Button } from "@/components/atoms/Button";
import {
    getSavedPersonas,
    deletePersona,
    type SavedPersona,
} from "@/lib/persona-storage";

export default function PersonasPage() {
    const router = useRouter();
    const [personas, setPersonas] = useState<SavedPersona[]>([]);

    useEffect(() => {
        // Load personas from localStorage
        setPersonas(getSavedPersonas());
    }, []);

    const handleNewTraining = (personaId: string) => {
        router.push(`/training/context-builder?personaId=${personaId}`);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this persona?")) {
            deletePersona(id);
            setPersonas(getSavedPersonas());
        }
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex-1 p-8">
            <div className="mb-6">
                <Heading size="lg">Saved Personas</Heading>
                <p className="text-zinc-600 text-sm mt-2">
                    View and reuse your training personas for new sessions
                </p>
            </div>

            {personas.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-zinc-500 mb-4">No personas saved yet</p>
                    <Button
                        onClick={() => router.push("/training/context-builder")}
                        variant="primary"
                    >
                        Create Your First Persona
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {personas.map((persona) => (
                        <div
                            key={persona.id}
                            className="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                                    {persona.name}
                                </h3>
                                {persona.jobTitle && (
                                    <p className="text-sm text-zinc-600 mb-1">
                                        {persona.jobTitle}
                                        {persona.department &&
                                            ` • ${persona.department}`}
                                    </p>
                                )}
                                <p className="text-xs text-zinc-500 mt-2">
                                    Created {formatDate(persona.createdAt)}
                                </p>
                            </div>

                            <div className="border-t border-zinc-200 pt-4 space-y-2">
                                <button
                                    onClick={() =>
                                        handleNewTraining(persona.id)
                                    }
                                    className="w-full px-4 py-2 text-sm rounded-md bg-black text-white hover:bg-zinc-800 transition-colors"
                                >
                                    New Training
                                </button>
                                <button
                                    onClick={() => handleDelete(persona.id)}
                                    className="w-full px-4 py-2 text-sm rounded-md border border-zinc-300 bg-white text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
