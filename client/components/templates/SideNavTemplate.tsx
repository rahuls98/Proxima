"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
    { label: "Dashboard", icon: "dashboard", path: "/dashboard" },
    { label: "Sessions", icon: "video_library", path: "/sessions" },
    { label: "Personas", icon: "groups", path: "/personas" },
    { label: "Settings", icon: "settings", path: "/settings" },
];

export default function SideNavTemplate({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();

    const navigate = (path: string) => {
        router.replace(path);
    };

    const isActive = (path: string) => pathname === path;

    return (
        <div className="h-full w-full flex overflow-hidden bg-surface-base text-text-main">
            <aside className="w-56 flex-shrink-0 bg-surface-base border-r border-border-subtle flex flex-col z-40">
                <div className="h-20 flex-shrink-0 flex items-center px-6 border-b border-border-subtle">
                    <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => router.push("/")}
                    >
                        <div className="w-8 h-8 rounded-lg bg-primary text-surface-base flex items-center justify-center">
                            <span
                                className="material-symbols-outlined"
                                style={{ fontVariationSettings: '"FILL" 1' }}
                            >
                                psychology
                            </span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            Proxima AI
                        </h1>
                    </div>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                                isActive(item.path)
                                    ? "bg-surface-panel text-primary font-semibold"
                                    : "text-text-muted hover:bg-surface-hover hover:text-text-main"
                            }`}
                        >
                            <span className="material-symbols-outlined">
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4">
                    <div className="rounded-lg border border-yellow-300 bg-yellow-50/90 px-3 py-2 text-xs text-yellow-900">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-yellow-700 text-base">
                                warning
                            </span>
                            <span className="font-semibold">Trial mode</span>
                        </div>
                        <div className="mt-1">
                            Proxima is currently in trial mode to prevent
                            misuse. Sessions <b>will not be saved</b>.
                            <br />
                            <br />
                            You can still use the core training session feature
                            via the context builder.
                            <br />
                            <br />
                            <span className="block mt-1">
                                Are you a hackathon judge?{" "}
                                <a
                                    href="mailto:rahs98@gmail.com"
                                    className="underline"
                                >
                                    Request full access
                                </a>
                            </span>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-border-subtle">
                    <button
                        onClick={() => navigate("/training/context-builder")}
                        className="w-full bg-primary text-surface-base font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        <span className="material-symbols-outlined">add</span>
                        New Training
                    </button>
                </div>
            </aside>
            <main className="flex-1 min-w-0 flex flex-col h-full bg-surface-base">
                {children}
            </main>
        </div>
    );
}
