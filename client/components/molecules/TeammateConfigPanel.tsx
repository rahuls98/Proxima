"use client";

import { useState, useEffect } from "react";
import {
    ArchetypeInfo,
    BehaviorArchetype,
    TeammateRole,
    getTeammateArchetypes,
} from "@/lib/teammate-config";

export type TeammateSelection = {
    role: TeammateRole | "random";
    archetype: BehaviorArchetype | "random";
};

interface TeammateConfigPanelProps {
    onToggle: (enabled: boolean) => void;
    onSelectionChange: (selection: TeammateSelection) => void;
    enabled: boolean;
    initialSelection?: TeammateSelection;
}

export function TeammateConfigPanel({
    onToggle,
    onSelectionChange,
    enabled,
    initialSelection,
}: TeammateConfigPanelProps) {
    const [archetypes, setArchetypes] = useState<ArchetypeInfo[]>([]);
    const [selectedArchetype, setSelectedArchetype] = useState<
        BehaviorArchetype | "random"
    >(initialSelection?.archetype ?? "random");
    const [selectedRole, setSelectedRole] = useState<TeammateRole | "random">(
        initialSelection?.role ?? "random"
    );

    useEffect(() => {
        setSelectedRole(initialSelection?.role ?? "random");
        setSelectedArchetype(initialSelection?.archetype ?? "random");
    }, [initialSelection?.role, initialSelection?.archetype]);

    useEffect(() => {
        onSelectionChange({ role: selectedRole, archetype: selectedArchetype });
    }, [onSelectionChange, selectedArchetype, selectedRole]);

    // Load available archetypes on mount
    useEffect(() => {
        const loadArchetypes = async () => {
            try {
                const data = await getTeammateArchetypes();
                setArchetypes(data);
            } catch (error) {
                console.error("Failed to load archetypes:", error);
            }
        };
        loadArchetypes();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted">
                    Add a second AI participant to simulate realistic team
                    dynamics for collaborative call practice.
                </p>
                <label className="flex items-center gap-2 text-sm text-text-main whitespace-nowrap pl-4">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => onToggle(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                    />
                    <span className="font-medium">Enable Teammate</span>
                </label>
            </div>

            {enabled && (
                <>
                    <p className="text-xs text-text-muted -mt-2">
                        Teammate settings are applied automatically when you
                        initialize the meeting.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Teammate Role
                            </label>
                            <select
                                value={selectedRole}
                                onChange={(e) =>
                                    setSelectedRole(
                                        e.target.value as
                                            | TeammateRole
                                            | "random"
                                    )
                                }
                                className="w-full bg-surface-base border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            >
                                <option value="random">Random</option>
                                <option value="BDR">
                                    BDR (Business Development Rep)
                                </option>
                                <option value="AE">
                                    AE (Account Executive)
                                </option>
                                <option value="Junior_Rep">
                                    Junior Sales Rep
                                </option>
                                <option value="Senior_Rep">
                                    Senior Sales Rep
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-text-muted mb-1 block">
                                Behavior Archetype
                            </label>
                            <select
                                value={selectedArchetype}
                                onChange={(e) =>
                                    setSelectedArchetype(
                                        e.target.value as
                                            | BehaviorArchetype
                                            | "random"
                                    )
                                }
                                className="w-full bg-surface-base border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            >
                                <option value="random">Random</option>
                                {archetypes.map((archetype) => (
                                    <option
                                        key={archetype.archetype}
                                        value={archetype.archetype}
                                    >
                                        {archetype.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedArchetype !== "random" && (
                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-sm text-text-main">
                            {archetypes.find(
                                (a) => a.archetype === selectedArchetype
                            )?.description || ""}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
