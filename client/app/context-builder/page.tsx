"use client";

import { useState } from "react";

const API_URL = "http://localhost:8000/context/persona";

interface TextItem {
    id: number;
    key: string;
    value: string;
}

interface FileItem {
    id: number;
    key: string;
    file: File | null;
}

export default function BuildContextPage() {
    const [textItems, setTextItems] = useState<TextItem[]>([
        { id: 1, key: "", value: "" },
    ]);
    const [fileItems, setFileItems] = useState<FileItem[]>([
        { id: 1, key: "", file: null },
    ]);
    const [textCounter, setTextCounter] = useState(2);
    const [fileCounter, setFileCounter] = useState(2);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState<{ text: number; files: number } | null>(
        null
    );

    function addTextItem() {
        setTextItems((prev) => [
            ...prev,
            { id: textCounter, key: "", value: "" },
        ]);
        setTextCounter((c) => c + 1);
    }

    function removeTextItem(id: number) {
        setTextItems((prev) => prev.filter((item) => item.id !== id));
    }

    function updateTextItem(id: number, field: "key" | "value", value: string) {
        setTextItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    }

    function addFileItem() {
        setFileItems((prev) => [
            ...prev,
            { id: fileCounter, key: "", file: null },
        ]);
        setFileCounter((c) => c + 1);
    }

    function removeFileItem(id: number) {
        setFileItems((prev) => prev.filter((item) => item.id !== id));
    }

    function updateFileKey(id: number, key: string) {
        setFileItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, key } : item))
        );
    }

    function updateFileInput(id: number, file: File | null) {
        setFileItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, file } : item))
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setResult(null);
        setMeta(null);

        const validTextItems = textItems.filter(
            (i) => i.key.trim() && i.value.trim()
        );
        const validFileItems = fileItems.filter((i) => i.key.trim() && i.file);

        if (validTextItems.length === 0 && validFileItems.length === 0) {
            setError(
                "Add at least one text or file context item before submitting."
            );
            return;
        }

        const form = new FormData();
        for (const item of validTextItems) {
            form.append("context_text_keys", item.key.trim());
            form.append("context_text_values", item.value.trim());
        }
        for (const item of validFileItems) {
            form.append("context_file_keys", item.key.trim());
            form.append("context_files", item.file as File);
        }

        setLoading(true);
        try {
            const res = await fetch(API_URL, { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) {
                setError(data.detail ?? "Unexpected error.");
            } else {
                setResult(data.unified_context);
                setMeta({
                    text: data.text_items_count,
                    files: data.file_items_count,
                });
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Network error.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#0f0f0f] text-[#e8e8e8] flex justify-center px-4 py-12">
            <div className="w-full max-w-2xl">
                <h1 className="text-xl font-semibold text-white mb-1">
                    Build Prospect Context
                </h1>
                <p className="text-sm text-[#666] mb-8">
                    Add any combination of text or file context items. Each item
                    needs a unique key.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Text Items */}
                    <section>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#555] mb-3">
                            Text Context
                        </p>
                        <div className="space-y-2">
                            {textItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="grid grid-cols-[180px_1fr_auto] gap-2 items-start"
                                >
                                    <input
                                        type="text"
                                        placeholder="key"
                                        value={item.key}
                                        onChange={(e) =>
                                            updateTextItem(
                                                item.id,
                                                "key",
                                                e.target.value
                                            )
                                        }
                                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-sm px-3 py-2 text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-[#444]"
                                    />
                                    <textarea
                                        placeholder="value"
                                        value={item.value}
                                        onChange={(e) =>
                                            updateTextItem(
                                                item.id,
                                                "value",
                                                e.target.value
                                            )
                                        }
                                        rows={3}
                                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-sm px-3 py-2 text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-[#444] resize-y"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeTextItem(item.id)}
                                        className="mt-1 border border-[#2a2a2a] rounded-md text-[#555] hover:text-red-400 hover:border-red-400 px-2 py-2 text-sm transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addTextItem}
                            className="mt-3 w-full border border-dashed border-[#2a2a2a] rounded-md text-[#555] hover:text-[#aaa] hover:border-[#444] text-sm py-2 transition-colors"
                        >
                            + Add Text Item
                        </button>
                    </section>

                    <hr className="border-[#1e1e1e]" />

                    {/* File Items */}
                    <section>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#555] mb-3">
                            File Context
                        </p>
                        <div className="space-y-2">
                            {fileItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="grid grid-cols-[180px_1fr_auto] gap-2 items-center"
                                >
                                    <input
                                        type="text"
                                        placeholder="key"
                                        value={item.key}
                                        onChange={(e) =>
                                            updateFileKey(
                                                item.id,
                                                e.target.value
                                            )
                                        }
                                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-sm px-3 py-2 text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-[#444]"
                                    />
                                    <input
                                        type="file"
                                        accept=".pdf,.txt,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mp3"
                                        onChange={(e) =>
                                            updateFileInput(
                                                item.id,
                                                e.target.files?.[0] ?? null
                                            )
                                        }
                                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-sm px-3 py-2 text-[#888] w-full file:bg-[#2a2a2a] file:border file:border-[#333] file:rounded file:text-[#ccc] file:text-xs file:px-3 file:py-1 file:mr-3 file:cursor-pointer"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeFileItem(item.id)}
                                        className="border border-[#2a2a2a] rounded-md text-[#555] hover:text-red-400 hover:border-red-400 px-2 py-2 text-sm transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addFileItem}
                            className="mt-3 w-full border border-dashed border-[#2a2a2a] rounded-md text-[#555] hover:text-[#aaa] hover:border-[#444] text-sm py-2 transition-colors"
                        >
                            + Add File Item
                        </button>
                    </section>

                    <hr className="border-[#1e1e1e]" />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-semibold rounded-lg py-3 text-sm hover:bg-[#ddd] disabled:bg-[#2a2a2a] disabled:text-[#555] disabled:cursor-not-allowed transition-colors"
                    >
                        {loading
                            ? "Building context..."
                            : "Build Unified Context"}
                    </button>
                </form>

                {(result || error) && (
                    <div className="mt-8 bg-[#141414] border border-[#2a2a2a] rounded-lg p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#555] mb-3">
                            {error
                                ? "Error"
                                : `Unified Context  (${meta?.text} text, ${meta?.files} file)`}
                        </p>
                        <p
                            className={`text-sm leading-relaxed whitespace-pre-wrap ${error ? "text-red-400" : "text-[#ccc]"}`}
                        >
                            {error ?? result}
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
