type SessionMetricCardProps = {
    label: string;
    value: string;
    description?: string;
    note?: string;
};

export function SessionMetricCard({
    label,
    value,
    description,
    note,
}: SessionMetricCardProps) {
    return (
        <div className="bg-surface-panel p-5 rounded-2xl border border-border-subtle">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4">
                {label}
            </div>
            <div className="text-3xl font-extrabold text-white mb-1">
                {value}
            </div>
            {description ? (
                <div className="text-[11px] text-text-muted leading-snug">
                    {description}
                </div>
            ) : null}
            {note ? (
                <div className="text-[11px] font-bold text-text-muted uppercase mt-2">
                    {note}
                </div>
            ) : null}
        </div>
    );
}
