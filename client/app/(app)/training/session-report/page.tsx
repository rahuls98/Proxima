"use client";

import { useSearchParams } from "next/navigation";
import { SessionReportView } from "@/components/molecules/SessionReportView";

export default function SessionReportPage() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");

    return <SessionReportView sessionId={sessionId} />;
}
