"use client";

import Link from "next/link";
import { Button } from "@/components/atoms/Button";
import { Heading } from "@/components/atoms/Heading";

export default function TrainingPage() {
    return (
        <div className="flex-1 p-8">
            <Heading size="lg">Training</Heading>
            <div className="mt-6">
                <Link href="/training/context-builder">
                    <Button variant="primary">Build Context</Button>
                </Link>
            </div>
        </div>
    );
}
