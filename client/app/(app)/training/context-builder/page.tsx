"use client";

import Link from "next/link";
import { Button } from "@/components/atoms/Button";
import { Heading } from "@/components/atoms/Heading";
import { ContextBuilderForm } from "./ContextBuilderForm";

export default function BuildContextPage() {
    return (
        <div className="flex-1 p-8">
            <Heading size="lg">Build Session Context</Heading>
            <p className="text-sm text-zinc-700 mb-8 mt-2">
                Configure prospect details, business context, KPIs, objection
                profile, personality, voice settings, and training scripts. Add
                any custom context items as needed.
            </p>

            <div className="w-full max-w-4xl">
                <ContextBuilderForm />
            </div>

            <div className="mt-8 flex gap-3">
                <Link href="/training/session">
                    <Button variant="primary">Start Training Session</Button>
                </Link>
            </div>
        </div>
    );
}
