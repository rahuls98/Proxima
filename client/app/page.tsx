"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
    const router = useRouter();

    const handleOpenDashboard = () => {
        router.push("/dashboard");
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface-base p-8 text-text-main">
            <section className="w-full max-w-xl rounded-2xl border border-border-subtle bg-surface-panel p-8">
                <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-white">
                    Proxima AI
                </h1>
                <p className="text-text-muted mb-8 leading-relaxed">
                    AI-powered sales training and context management platform.
                    Build prospect context, extract knowledge graphs, and
                    prepare for high-impact conversations.
                </p>
                <button
                    onClick={handleOpenDashboard}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary hover:opacity-90 px-6 py-3 text-sm font-bold text-surface-base transition-opacity"
                >
                    <span className="material-symbols-outlined">dashboard</span>
                    Open Proxima
                </button>
            </section>
        </div>
    );
}
