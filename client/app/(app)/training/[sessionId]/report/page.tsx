"use client";

import { use } from "react";
import { SessionReportView } from "@/components/molecules/SessionReportView";

type SessionReportPageProps = {
    params: Promise<{
        sessionId: string;
    }>;
};

export default function SessionReportPage({ params }: SessionReportPageProps) {
    const { sessionId } = use(params);
    return <SessionReportView sessionId={sessionId} />;
}
