"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Heading } from "@/components/atoms/Heading";
import { generateSessionReport, type RealSessionReport } from "@/lib/api";
import { getTrainingReport } from "@/lib/training-report-storage";
import { SessionReport as SessionReportComponent } from "@/components/molecules/SessionReport";

export default function SessionReportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");

    const [report, setReport] = useState<RealSessionReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasFetchedRef = useRef(false);

    useEffect(() => {
        if (!sessionId) {
            setError("No session ID provided");
            setIsLoading(false);
            return;
        }

        if (hasFetchedRef.current) {
            return;
        }
        hasFetchedRef.current = true;

        const loadReport = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // First, check if we have the report in storage
                const cachedReport = await getTrainingReport(sessionId);
                if (cachedReport) {
                    setReport(cachedReport);
                    setIsLoading(false);
                    return;
                }

                // If not cached, generate it from the API
                const freshReport = await generateSessionReport(sessionId);
                setReport(freshReport);
                setIsLoading(false);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load session report"
                );
                setIsLoading(false);
            }
        };

        loadReport();
    }, [sessionId]);

    if (isLoading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-zinc-600">
                        Loading performance report...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex-1 p-8">
                <div className="max-w-2xl">
                    <Heading size="lg">Session Report Error</Heading>
                    <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800">
                            {error || "Report not found"}
                        </p>
                    </div>
                    <div className="mt-6">
                        <Button
                            variant="primary"
                            onClick={() => router.push("/training")}
                        >
                            Back to Training
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Use the SessionReport component which already supports the backend structure
    return (
        <SessionReportComponent
            report={report}
            onClose={() => router.push("/training")}
        />
    );
}
