type SessionMetricCardProps = {
    label: string;
    value: string;
    note?: string;
};

export function SessionMetricCard({
    label,
    value,
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
            {note ? (
                <div className="text-[11px] font-bold text-text-muted uppercase">
                    {note}
                </div>
            ) : null}
        </div>
    );
}
