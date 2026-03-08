"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/atoms/Button";
import { Heading } from "@/components/atoms/Heading";
import {
    TeammateConfig,
    ArchetypeInfo,
    BehaviorArchetype,
    TeammateRole,
    generateTeammateConfig,
    getTeammateArchetypes,
    getArchetypeLabel,
    getTeammateRoleLabel,
} from "@/lib/teammate-config";

interface TeammateConfigPanelProps {
    onConfigGenerated: (config: TeammateConfig) => void;
    onToggle: (enabled: boolean) => void;
    enabled: boolean;
}

export function TeammateConfigPanel({
    onConfigGenerated,
    onToggle,
    enabled,
}: TeammateConfigPanelProps) {
    const [archetypes, setArchetypes] = useState<ArchetypeInfo[]>([]);
    const [selectedArchetype, setSelectedArchetype] = useState<
        BehaviorArchetype | "random"
    >("random");
    const [selectedRole, setSelectedRole] = useState<TeammateRole | "random">(
        "random"
    );
    const [loading, setLoading] = useState(false);
    const [currentConfig, setCurrentConfig] = useState<TeammateConfig | null>(
        null
    );

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

    const handleGenerateConfig = async () => {
        setLoading(true);
        try {
            const config = await generateTeammateConfig(
                selectedArchetype === "random" ? undefined : selectedArchetype,
                selectedRole === "random"
                    ? undefined
                    : (selectedRole as TeammateRole),
                undefined // Let API randomize name
            );
            setCurrentConfig(config);
            onConfigGenerated(config);
        } catch (error) {
            console.error("Failed to generate teammate config:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 border border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
                <Heading size="md">
                    AI Teammate (Multi-Participant Training)
                </Heading>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => onToggle(e.target.checked)}
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Enable Teammate</span>
                </label>
            </div>

            {enabled && (
                <>
                    <div className="text-sm text-gray-600">
                        Add a second AI participant to simulate realistic team
                        dynamics (BDR + AE calls, shadowing, team coordination).
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
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
                                className="w-full border border-gray-300 rounded px-3 py-2"
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
                            <label className="block text-sm font-medium mb-2">
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
                                className="w-full border border-gray-300 rounded px-3 py-2"
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
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                            {archetypes.find(
                                (a) => a.archetype === selectedArchetype
                            )?.description || ""}
                        </div>
                    )}

                    <div className="flex space-x-2">
                        <Button
                            onClick={handleGenerateConfig}
                            disabled={loading}
                            variant="secondary"
                        >
                            {loading
                                ? "Generating..."
                                : "Generate Teammate Config"}
                        </Button>
                    </div>

                    {currentConfig && (
                        <div className="bg-green-50 border border-green-200 rounded p-4">
                            <div className="font-medium mb-2">
                                Current Configuration:
                            </div>
                            <div className="space-y-1 text-sm">
                                <div>
                                    <strong>Name:</strong>{" "}
                                    {currentConfig.teammate_name}
                                </div>
                                <div>
                                    <strong>Role:</strong>{" "}
                                    {getTeammateRoleLabel(
                                        currentConfig.teammate_role
                                    )}
                                </div>
                                <div>
                                    <strong>Archetype:</strong>{" "}
                                    {getArchetypeLabel(
                                        currentConfig.behavior_archetype
                                    )}
                                </div>
                                <div>
                                    <strong>Interruption Frequency:</strong>{" "}
                                    {currentConfig.interruption_frequency}
                                </div>
                                <div>
                                    <strong>Confidence Level:</strong>{" "}
                                    {currentConfig.confidence_level}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
