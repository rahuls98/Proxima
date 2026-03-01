import type { ReactNode } from "react";

type HeadingProps = {
    children: ReactNode;
    size?: "sm" | "md" | "lg";
};

export function Heading({ children, size = "md" }: HeadingProps) {
    const sizeClass = {
        sm: "text-sm font-medium",
        md: "text-base font-semibold",
        lg: "text-xl font-semibold",
    }[size];

    return <h2 className={sizeClass}>{children}</h2>;
}
