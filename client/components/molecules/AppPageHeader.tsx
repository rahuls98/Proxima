type AppPageHeaderProps = {
    title: string;
};

export function AppPageHeader({ title }: AppPageHeaderProps) {
    return (
        <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 border-b border-border-subtle bg-surface-base z-10">
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            <div className="flex items-center gap-3 ml-2 border-l border-border-subtle pl-6">
                <div className="text-right">
                    <p className="text-xs font-medium text-text-main">
                        Alex Rivera
                    </p>
                    <p className="text-[10px] text-primary">Enterprise Pro</p>
                </div>
                <img
                    alt="Alex Rivera Profile"
                    className="w-10 h-10 rounded-full object-cover border border-border-subtle"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHpsw-nuUHl3j0e9JxnsSe9YBDdfI_9Xv4y4gA4PqOsF8DdUjhVH4Yk1LU_Y5dgRBpoANUJSgDxKUBnjlaTLFC3jX6wU88F_3YCJl204uG8w8qGdOGCR3PddmP3QOobXUYxulAanHCcKewW8B_RTNvTxpTU2ucv7w9Hw0OZbifaSse3sEaDb-a-l5aIpOwCkjxNY0kQWGpxSGTsFZ9-iHcRA-_5iYJF7J8E55pYuH2Qzb9CGF31D46RCKcYvaEKu60l4-DFx_biht5"
                />
            </div>
        </header>
    );
}
