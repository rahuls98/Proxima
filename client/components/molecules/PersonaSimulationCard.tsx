import type { SavedPersona } from "@/lib/persona-storage";

type PersonaSimulationCardProps = {
    persona: SavedPersona;
    imageSrc: string;
    onStartSession?: (personaId: string) => void;
    className?: string;
};

export function PersonaSimulationCard({
    persona,
    imageSrc: _imageSrc,
    onStartSession,
    className = "",
}: PersonaSimulationCardProps) {
    const personaTag = String(
        persona.sessionContext.personality ||
            persona.sessionContext.objection_archetype ||
            persona.sessionContext.discussion_stage ||
            "Simulation Persona"
    )
        .replaceAll("_", " ")
        .trim();

    return (
        <article
            className={`bg-surface-panel rounded-2xl border border-border-subtle overflow-hidden flex flex-col h-full group hover:border-primary/30 transition-all duration-300 ${className}`}
        >
            <div className="p-6 flex flex-col justify-between flex-1">
                <div>
                    <h4 className="text-lg font-bold mb-1 text-white">
                        {persona.name}
                    </h4>
                    <div className="inline-block bg-surface-hover text-primary px-3 py-1 rounded-full text-[10px] font-bold tracking-widest mb-4 uppercase">
                        {personaTag}
                    </div>
                </div>
                <button
                    onClick={() => onStartSession?.(persona.id)}
                    className="w-full py-2.5 rounded-lg border border-border-subtle text-text-main text-xs font-bold hover:bg-surface-hover hover:text-primary transition-all flex items-center justify-center"
                >
                    Start Session
                </button>
            </div>
        </article>
    );
}
