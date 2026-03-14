type TrendDirection = "up" | "down" | "flat";

type TrendBadgeProps = {
    direction: TrendDirection;
    value: string;
    suffix?: string;
};

const DIRECTION_LABEL: Record<TrendDirection, string> = {
    up: "Up",
    down: "Down",
    flat: "Flat",
};

const DIRECTION_CLASS: Record<TrendDirection, string> = {
    up: "text-success bg-success/10",
    down: "text-danger bg-danger/10",
    flat: "text-text-muted bg-surface-hover",
};

export function TrendBadge({ direction, value, suffix = "" }: TrendBadgeProps) {
    return (
        <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${DIRECTION_CLASS[direction]}`}
        >
            {DIRECTION_LABEL[direction]} {value}
            {suffix}
        </span>
    );
}
