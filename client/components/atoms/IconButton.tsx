import type { ReactNode } from "react";

type IconButtonProps = {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
};

export function IconButton({
    label,
    icon,
    onClick,
    disabled = false,
    danger = false,
}: IconButtonProps) {
    const base =
        "flex h-12 w-12 items-center justify-center rounded-full border text-sm transition disabled:cursor-not-allowed disabled:opacity-50";
    const tone = danger
        ? "border-red-300 bg-red-500 text-white hover:bg-red-600"
        : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100";

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
        </button>
    );
}
