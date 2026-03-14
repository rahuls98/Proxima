import type { ReactNode } from "react";

type HeadingProps = {
    children: ReactNode;
    size?: "sm" | "md" | "lg";
};

export function Heading({ children, size = "md" }: HeadingProps) {
    const sizeClass = {
        sm: "text-lg font-bold tracking-tight text-white",
        md: "text-xl font-bold tracking-tight text-white",
        lg: "text-3xl font-extrabold tracking-tight text-white",
    }[size];

    return <h2 className={sizeClass}>{children}</h2>;
}
