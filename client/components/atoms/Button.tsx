import type { ReactNode } from "react";

type ButtonProps = {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    type?: "button" | "submit" | "reset";
    className?: string;
};

export function Button({
    children,
    onClick,
    disabled = false,
    variant = "secondary",
    type = "button",
    className = "",
}: ButtonProps) {
    const baseClass =
        "px-6 py-3 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50";
    const variantClass = {
        primary:
            "bg-primary text-surface-base hover:opacity-90 shadow-lg shadow-primary/10",
        secondary:
            "bg-surface-panel border border-border-subtle text-text-main hover:bg-surface-hover",
        ghost: "text-text-main hover:bg-surface-hover border border-transparent",
        danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
    }[variant];

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseClass} ${variantClass} ${className}`}
        >
            {children}
        </button>
    );
}
