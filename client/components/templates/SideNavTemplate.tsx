"use client";

import { useRouter } from "next/navigation";

export default function SideNavTemplate({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    const navigate = (path: string) => {
        router.replace(path);
    };

    return (
        <div className="min-h-screen flex">
            <aside className="w-64 bg-white text-zinc-900 flex flex-col border-r border-zinc-200">
                <div className="p-6 border-b border-zinc-200">
                    <h1 className="text-xl font-bold">Proxima</h1>
                </div>
                <nav className="flex-1 px-4 py-6">
                    <ul className="space-y-2">
                        <li>
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="w-full text-left block px-4 py-2 rounded-md hover:bg-zinc-100 transition-colors text-sm"
                            >
                                Dashboard
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => navigate("/knowledge-base")}
                                className="w-full text-left block px-4 py-2 rounded-md hover:bg-zinc-100 transition-colors text-sm"
                            >
                                Knowledge Base
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => navigate("/training")}
                                className="w-full text-left block px-4 py-2 rounded-md hover:bg-zinc-100 transition-colors text-sm"
                            >
                                Training
                            </button>
                        </li>
                    </ul>
                </nav>
            </aside>
            <main className="flex-1 flex flex-col bg-zinc-50">{children}</main>
        </div>
    );
}
