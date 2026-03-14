import type { ReactNode } from "react";
import { Heading } from "@/components/atoms/Heading";

type SectionHeaderProps = {
    title: string;
    action?: ReactNode;
};

export function SectionHeader({ title, action }: SectionHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <Heading size="md">{title}</Heading>
            {action ? <div>{action}</div> : null}
        </div>
    );
}
