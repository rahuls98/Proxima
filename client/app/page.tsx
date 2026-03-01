"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
    const router = useRouter();

    const handleOpenDashboard = () => {
        router.push("/dashboard");
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-8 text-zinc-900">
            <section className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-lg">
                <h1 className="text-3xl font-bold mb-2">Proxima</h1>
                <p className="text-zinc-700 mb-8">
                    AI-powered sales training and context management platform.
                    Build prospect context, extract knowledge graphs, and
                    prepare for high-impact conversations.
                </p>
                <button
                    onClick={handleOpenDashboard}
                    className="inline-block rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-medium text-white transition-colors"
                >
                    Open Proxima
                </button>
            </section>
        </div>
    );
}
