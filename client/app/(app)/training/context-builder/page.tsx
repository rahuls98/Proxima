"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { AppPageHeader } from "@/components/molecules/AppPageHeader";
import { PersonaConfiguringOverlay } from "@/components/molecules/PersonaConfiguringOverlay";
import {
    ContextBuilderForm,
    type ContextBuilderFormHandle,
} from "./ContextBuilderForm";

export default function BuildContextPage() {
    const router = useRouter();
    const [isBuildingPersona, setIsBuildingPersona] = useState(false);
    const formRef = useRef<ContextBuilderFormHandle | null>(null);

    const createSessionId = () => {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
            return `sess_${crypto.randomUUID()}`;
        }

        return `sess_${Date.now().toString(36)}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;
    };

    const handleInitializeTraining = async () => {
        if (isBuildingPersona) {
            return;
        }

        setIsBuildingPersona(true);

        const sessionId = createSessionId();
        const result = await formRef.current?.generatePersona(sessionId);
        if (!result) {
            setIsBuildingPersona(false);
            return;
        }

        router.push(`/training/${sessionId}`);
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-surface-base">
            <AppPageHeader title="Context Builder" />

            <div className="flex-1 overflow-y-auto p-8 space-y-10 [scrollbar-width:thin] [scrollbar-color:#22313a_#141c21] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-surface-panel [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-subtle [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-primary/70">
                <ContextBuilderForm ref={formRef} />
                <div className="pt-2 pb-8 flex justify-end">
                    <Button
                        variant="primary"
                        onClick={handleInitializeTraining}
                        disabled={isBuildingPersona}
                    >
                        Initialize Training
                    </Button>
                </div>
            </div>

            {isBuildingPersona ? (
                <PersonaConfiguringOverlay
                    fixed
                    message="Building a context-aware simulation profile for your training session..."
                />
            ) : null}
        </div>
    );
}
