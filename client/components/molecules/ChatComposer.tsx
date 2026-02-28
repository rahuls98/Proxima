import { useState } from "react";

type ChatComposerProps = {
    onAttach: () => void;
    onSend: (text: string) => void;
    disabled?: boolean;
};

export function ChatComposer({
    onAttach,
    onSend,
    disabled = false,
}: ChatComposerProps) {
    const [draft, setDraft] = useState("");

    const handleSend = () => {
        const text = draft.trim();
        if (!text) {
            return;
        }
        onSend(text);
        setDraft("");
    };

    return (
        <div className="border-t border-zinc-200 p-3">
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onAttach}
                    disabled={disabled}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Attach
                </button>
                <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    disabled={disabled}
                    placeholder="Type a message"
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={disabled}
                    className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
