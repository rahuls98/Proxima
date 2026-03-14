import type { TextareaHTMLAttributes } from "react";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ ...props }: TextAreaProps) {
    return (
        <textarea
            {...props}
            className={`w-full bg-surface-base border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main placeholder:text-text-placeholder focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`}
        />
    );
}
