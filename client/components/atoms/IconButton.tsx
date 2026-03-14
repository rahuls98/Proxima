import type { ReactNode } from "react";

type IconButtonProps = {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    showLabel?: boolean;
};

export function IconButton({
    label,
    icon,
    onClick,
    disabled = false,
    danger = false,
    showLabel = false,
}: IconButtonProps) {
    const base = showLabel
        ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        : "flex h-11 w-11 items-center justify-center rounded-lg border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";
    const tone = danger
        ? "border-danger/20 bg-danger/10 text-danger hover:bg-danger/20"
        : "border-border-subtle bg-surface-hover text-text-main hover:bg-surface-panel";

    return (
        <button
            type="button"
            className={`${base} ${tone}`}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
        >
            {icon}
            {showLabel ? <span>{label}</span> : null}
        </button>
    );
}
