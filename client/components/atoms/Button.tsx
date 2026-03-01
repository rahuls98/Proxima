import type { ReactNode } from "react";

type ButtonProps = {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "primary" | "secondary";
    type?: "button" | "submit" | "reset";
};

export function Button({
    children,
    onClick,
    disabled = false,
    variant = "secondary",
    type = "button",
}: ButtonProps) {
    const baseClass =
        "rounded-md px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50";
    const variantClass =
        variant === "primary"
            ? "bg-black text-white"
            : "border border-zinc-300 bg-white text-zinc-900";

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseClass} ${variantClass}`}
        >
            {children}
        </button>
    );
}
