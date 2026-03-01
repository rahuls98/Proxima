"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Heading } from "@/components/atoms/Heading";
import { TextContextItem } from "@/components/molecules/TextContextItem";
import { FileContextItem } from "@/components/molecules/FileContextItem";

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
        <main className="min-h-screen bg-zinc-50 p-4 text-zinc-900">
            <div className="w-full max-w-2xl mx-auto">
                <Heading size="lg">Build Prospect Context</Heading>
                <p className="text-sm text-zinc-600 mb-8">
                    Add any combination of text or file context items. Each item
                    needs a unique key.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Text Items */}
                    <section>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-700 mb-3">
                            Text Context
                        </h3>
                        <div className="space-y-2">
                            {textItems.map((item) => (
                                <TextContextItem
                                    key={item.id}
                                    id={item.id}
                                    keyValue={item.key}
                                    value={item.value}
                                    onKeyChange={(value) =>
                                        updateTextItem(item.id, "key", value)
                                    }
                                    onValueChange={(value) =>
                                        updateTextItem(item.id, "value", value)
                                    }
                                    onRemove={() => removeTextItem(item.id)}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addTextItem}
                            className="mt-3 w-full border border-dashed border-zinc-300 rounded-md text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 text-sm py-2 transition-colors"
                        >
                            + Add Text Item
                        </button>
                    </section>

                    <hr className="border-zinc-200" />

                    {/* File Items */}
                    <section>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-700 mb-3">
                            File Context
                        </h3>
                        <div className="space-y-2">
                            {fileItems.map((item) => (
                                <FileContextItem
                                    key={item.id}
                                    id={item.id}
                                    keyValue={item.key}
                                    fileName={item.file?.name}
                                    onKeyChange={(value) =>
                                        updateFileKey(item.id, value)
                                    }
                                    onFileChange={(file) =>
                                        updateFileInput(item.id, file)
                                    }
                                    onRemove={() => removeFileItem(item.id)}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addFileItem}
                            className="mt-3 w-full border border-dashed border-zinc-300 rounded-md text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 text-sm py-2 transition-colors"
                        >
                            + Add File Item
                        </button>
                    </section>

                    <hr className="border-zinc-200" />

                    <Button type="submit" disabled={loading} variant="primary">
                        {loading
                            ? "Building context..."
                            : "Build Unified Context"}
                    </Button>
                </form>

                {(result || error) && (
                    <div className="mt-8 bg-white border border-zinc-200 rounded-lg p-5">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-700 mb-3">
                            {error
                                ? "Error"
                                : `Unified Context (${meta?.text} text, ${meta?.files} file)`}
                        </h3>
                        <p
                            className={`text-sm leading-relaxed whitespace-pre-wrap ${error ? "text-red-600" : "text-zinc-700"}`}
                        >
                            {error ?? result}
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
