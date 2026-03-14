type ChatComposerProps = {
    onAttach: () => void;
    attachmentName?: string | null;
    onSendAttachment?: () => Promise<void> | void;
    disabled?: boolean;
};

export function ChatComposer({
    onAttach,
    attachmentName,
    onSendAttachment,
    disabled = false,
}: ChatComposerProps) {
    const handleSend = async () => {
        if (!attachmentName || !onSendAttachment) {
            return;
        }

        await onSendAttachment();
    };

    return (
        <div className="border-t border-border-subtle p-3 bg-surface-panel">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        value={attachmentName || ""}
                        onChange={() => undefined}
                        disabled
                        placeholder="Attach a file to send"
                        className="w-full bg-surface-base border border-border-subtle rounded-xl px-4 py-2.5 pr-12 text-sm text-text-main placeholder:text-text-placeholder outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                        type="button"
                        onClick={onAttach}
                        disabled={disabled}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-surface-hover border border-border-subtle text-text-muted hover:text-primary hover:border-primary/40 transition-colors flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Attach file"
                        title="Attach file"
                    >
                        <span className="material-symbols-outlined !text-[18px]">
                            attach_file
                        </span>
                    </button>
                </div>
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={disabled || !attachmentName}
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-surface-base disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Send File
                </button>
            </div>
        </div>
    );
}
