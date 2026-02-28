import type { ReactNode } from "react";

type HeadingProps = {
    children: ReactNode;
};

export function Heading({ children }: HeadingProps) {
    return <h2 className="text-sm font-medium">{children}</h2>;
}
