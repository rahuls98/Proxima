"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Heading } from "@/components/atoms/Heading";

export default function TrainingPage() {
    const router = useRouter();

    const handleBuildContext = () => {
        router.replace("/training/context-builder");
    };

    return (
        <div className="flex-1 p-8">
            <Heading size="lg">Training</Heading>
            <div className="mt-6">
                <Button onClick={handleBuildContext} variant="primary">
                    Build Context
                </Button>
            </div>
        </div>
    );
}
