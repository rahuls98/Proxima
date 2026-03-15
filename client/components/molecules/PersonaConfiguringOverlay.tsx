type PersonaConfiguringOverlayProps = {
    message: string;
    fixed?: boolean;
};

export function PersonaConfiguringOverlay({
    message,
    fixed = false,
}: PersonaConfiguringOverlayProps) {
    return (
        <div
            className={`${fixed ? "fixed inset-0" : "absolute inset-0 rounded-2xl"} z-50 flex items-center justify-center bg-surface-base/85 backdrop-blur-xl`}
        >
            <div className="w-full max-w-[420px] p-10 bg-surface-panel rounded-3xl border border-border-subtle shadow-2xl flex flex-col items-center text-center">
                <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary !text-[40px]">
                        psychology
                    </span>
                    <div className="absolute inset-0 rounded-full border-2 border-surface-hover border-t-primary animate-spin" />
                </div>
                <br />
                <p className="text-sm text-text-muted leading-relaxed">
                    {message}
                </p>
            </div>
        </div>
    );
}
