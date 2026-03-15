import { useEffect, useState } from "react";
import { getUserName } from "@/lib/user-settings";

type AppPageHeaderProps = {
    title: string;
};

export function AppPageHeader({ title }: AppPageHeaderProps) {
    const [userName, setUserName] = useState("");
    useEffect(() => {
        setUserName(getUserName() || "Your Name");
    }, []);
    return (
        <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 border-b border-border-subtle bg-surface-base z-10">
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            <div className="flex items-center gap-3 ml-2 border-l border-border-subtle pl-6">
                <span
                    className="material-symbols-outlined text-primary text-xl"
                    aria-label="User avatar"
                >
                    account_circle
                </span>
                <div className="text-right">
                    <p className="text-xs font-medium text-text-main">
                        {userName}
                    </p>
                </div>
            </div>
        </header>
    );
}
