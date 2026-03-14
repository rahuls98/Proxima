import type { ReactNode } from "react";

type SummaryMetricCardProps = {
    title: string;
    indicator?: ReactNode;
    children: ReactNode;
    headerAlign?: "top" | "bottom";
};

export function SummaryMetricCard({
    title,
    indicator,
    children,
    headerAlign = "top",
}: SummaryMetricCardProps) {
    return (
        <article className="bg-surface-panel p-5 rounded-2xl border border-border-subtle flex flex-col h-[239px] hover:border-primary/30 transition-all duration-300">
            <div
                className={`flex justify-between ${
                    headerAlign === "bottom" ? "items-end" : "items-start"
                }`}
            >
                <h3 className="text-text-muted font-medium text-sm">{title}</h3>
                {indicator ? indicator : <span />}
            </div>
            <div className="mt-[15px] flex-1 flex items-end">{children}</div>
        </article>
    );
}
