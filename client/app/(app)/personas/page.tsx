"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import {
    deletePersona,
    getSavedPersonas,
    togglePersonaPriority,
    type SavedPersona,
} from "@/lib/persona-storage";
import { DUMMY_PERSONA_IMAGES } from "@/lib/ui-dummy-data";
import { PersonaLibraryCard } from "@/components/molecules/PersonaLibraryCard";
import { AppPageHeader } from "@/components/molecules/AppPageHeader";

function getCardsPerRow(viewportWidth: number) {
    const SIDE_NAV_WIDTH = 256;
    const CONTENT_HORIZONTAL_PADDING = 64;
    const GRID_GAP = 24;
    const MIN_CARD_WIDTH = 350;

    const usableWidth = Math.max(
        viewportWidth - SIDE_NAV_WIDTH - CONTENT_HORIZONTAL_PADDING,
        MIN_CARD_WIDTH
    );

    const fitted = Math.floor(
        (usableWidth + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP)
    );
    return Math.min(4, Math.max(1, fitted));
}

function getPageSizeForCardsPerRow(cardsPerRow: number) {
    if (cardsPerRow === 4) {
        return 8;
    }
    if (cardsPerRow === 3) {
        return 9;
    }
    if (cardsPerRow === 2) {
        return 8;
    }
    return 6;
}

export default function PersonasPage() {
    const router = useRouter();
    const [personas, setPersonas] = useState<SavedPersona[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [cardsPerRow, setCardsPerRow] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            setCardsPerRow(getCardsPerRow(window.innerWidth));
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const loadPersonas = async () => {
            try {
                const data = await getSavedPersonas();
                // Sort by descending createdAt (no updatedAt field)
                data.sort((a, b) => {
                    const aDateRaw = a.createdAt;
                    const bDateRaw = b.createdAt;
                    const aDate = aDateRaw ? new Date(aDateRaw).getTime() : 0;
                    const bDate = bDateRaw ? new Date(bDateRaw).getTime() : 0;
                    // If either is NaN, treat as 0 (oldest)
                    const aValid = isNaN(aDate) ? 0 : aDate;
                    const bValid = isNaN(bDate) ? 0 : bDate;
                    return bValid - aValid;
                });
                setPersonas(data);
            } catch (error) {
                console.error("Failed to load personas:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadPersonas();
    }, []);

    const pageSize = getPageSizeForCardsPerRow(cardsPerRow);

    const activePersonas = useMemo(() => personas, [personas]);

    const totalPages = Math.max(1, Math.ceil(activePersonas.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginatedPersonas = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return activePersonas.slice(startIndex, startIndex + pageSize);
    }, [activePersonas, safeCurrentPage, pageSize]);

    const rangeStart =
        activePersonas.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
    const rangeEnd = Math.min(
        safeCurrentPage * pageSize,
        activePersonas.length
    );

    const handleNewTraining = (personaId: string) => {
        router.push(`/training/context-builder?personaId=${personaId}`);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this persona?")) {
            try {
                await deletePersona(id);
                setPersonas(await getSavedPersonas());
            } catch (error) {
                console.error("Failed to delete persona:", error);
            }
        }
    };

    const handleViewDetails = (personaId: string) => {
        router.push(`/personas/${personaId}`);
    };

    const handleTogglePriority = async (personaId: string) => {
        try {
            await togglePersonaPriority(personaId);
            setPersonas(await getSavedPersonas());
        } catch (error) {
            console.error("Failed to toggle priority:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-border-subtle border-t-primary mb-4" />
                    <p className="text-text-muted">Loading personas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full min-w-0 flex flex-col bg-surface-base">
            <AppPageHeader title="Personas" />

            <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
                <section className="flex justify-end mb-8">
                    <Button
                        variant="primary"
                        onClick={() => router.push("/training/context-builder")}
                    >
                        <span className="material-symbols-outlined">
                            person_add
                        </span>
                        Create Persona
                    </Button>
                </section>

                <section className="grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr))] gap-6 pb-12">
                    {paginatedPersonas.length === 0 ? (
                        <article className="col-span-full bg-surface-panel border border-border-subtle rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                            <span className="material-symbols-outlined text-text-muted !text-[30px] mb-3">
                                groups
                            </span>
                            <h3 className="text-base font-bold text-text-main mb-1">
                                No personas found
                            </h3>
                            <p className="text-sm text-text-muted max-w-md">
                                Create your first persona to start running
                                tailored training sessions.
                            </p>
                        </article>
                    ) : (
                        paginatedPersonas.map((persona) => (
                            <PersonaLibraryCard
                                key={persona.id}
                                persona={persona}
                                imageSrc={
                                    (persona.name &&
                                        DUMMY_PERSONA_IMAGES[persona.name]) ||
                                    DUMMY_PERSONA_IMAGES["Priya Nair"]
                                }
                                onQuickStart={handleNewTraining}
                                onViewDetails={handleViewDetails}
                                onTogglePriority={handleTogglePriority}
                                onDelete={handleDelete}
                                showDelete
                            />
                        ))
                    )}
                </section>

                {activePersonas.length > 0 ? (
                    <section className="px-1 pb-6 flex items-center justify-between">
                        <span className="text-xs text-text-muted font-medium">
                            Showing {rangeStart}-{rangeEnd} of{" "}
                            {activePersonas.length} personas
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    setCurrentPage((page) =>
                                        Math.max(1, page - 1)
                                    )
                                }
                                disabled={safeCurrentPage === 1}
                                className="p-2 rounded-lg bg-surface-hover text-text-muted hover:text-text-main transition-colors border border-border-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined">
                                    chevron_left
                                </span>
                            </button>
                            <button className="h-8 min-w-8 px-2 rounded-lg bg-primary text-surface-base text-xs font-bold">
                                {safeCurrentPage}
                            </button>
                            <button
                                onClick={() =>
                                    setCurrentPage((page) =>
                                        Math.min(totalPages, page + 1)
                                    )
                                }
                                disabled={safeCurrentPage >= totalPages}
                                className="p-2 rounded-lg bg-surface-hover text-text-muted hover:text-text-main transition-colors border border-border-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined">
                                    chevron_right
                                </span>
                            </button>
                        </div>
                    </section>
                ) : null}
            </div>
        </div>
    );
}
