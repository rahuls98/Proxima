export default function SideNavLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex">
            <aside className="w-64 bg-white text-zinc-900 flex flex-col border-r border-zinc-200">
                <div className="p-6 border-b border-zinc-200">
                    <h1 className="text-xl font-bold">Proxima</h1>
                </div>
                <nav className="flex-1 px-4 py-6">
                    <ul className="space-y-2">
                        <li>
                            <a
                                href="/dashboard"
                                className="block px-4 py-2 rounded-md hover:bg-zinc-100 transition-colors text-sm"
                            >
                                Dashboard
                            </a>
                        </li>
                        <li>
                            <a
                                href="/knowledge-base"
                                className="block px-4 py-2 rounded-md hover:bg-zinc-100 transition-colors text-sm"
                            >
                                Knowledge Base
                            </a>
                        </li>
                        <li>
                            <a
                                href="/training"
                                className="block px-4 py-2 rounded-md hover:bg-zinc-100 transition-colors text-sm"
                            >
                                Training
                            </a>
                        </li>
                    </ul>
                </nav>
            </aside>
            <main className="flex-1 flex flex-col bg-zinc-50">{children}</main>
        </div>
    );
}
