"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/atoms/Button";
import { Heading } from "@/components/atoms/Heading";
import { TextContextItem } from "@/components/molecules/TextContextItem";
import { FileContextItem } from "@/components/molecules/FileContextItem";

const PERSONA_API_URL = "http://localhost:8000/context/persona";
const KNOWLEDGE_GRAPH_API_URL = "http://localhost:8000/context/knowledge-graph";

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

interface KnowledgeGraph {
    nodes: Array<{
        id: string;
        type: string;
        label: string;
        properties: Record<string, unknown>;
    }>;
    edges: Array<{
        from: string;
        to: string;
        relationship: string;
        confidence: number;
    }>;
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
    const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(
        null
    );
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

    function buildFormData() {
        const form = new FormData();
        const validTextItems = textItems.filter(
            (i) => i.key.trim() && i.value.trim()
        );
        const validFileItems = fileItems.filter((i) => i.key.trim() && i.file);

        for (const item of validTextItems) {
            form.append("context_text_keys", item.key.trim());
            form.append("context_text_values", item.value.trim());
        }
        for (const item of validFileItems) {
            form.append("context_file_keys", item.key.trim());
            form.append("context_files", item.file as File);
        }

        return { form, validTextItems, validFileItems };
    }

    async function handleBuildPersona() {
        setError(null);
        setResult(null);

        const { form, validTextItems, validFileItems } = buildFormData();

        if (validTextItems.length === 0 && validFileItems.length === 0) {
            setError(
                "Add at least one text or file context item before submitting."
            );
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(PERSONA_API_URL, {
                method: "POST",
                body: form,
            });
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

    async function handleBuildKnowledgeGraph() {
        setError(null);
        setKnowledgeGraph(null);

        const { form, validTextItems, validFileItems } = buildFormData();

        if (validTextItems.length === 0 && validFileItems.length === 0) {
            setError(
                "Add at least one text or file context item before submitting."
            );
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(KNOWLEDGE_GRAPH_API_URL, {
                method: "POST",
                body: form,
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.detail ?? "Unexpected error.");
            } else {
                let jsonString = data.knowledge_graph;
                jsonString = jsonString
                    .replace(/^```(?:json)?\n/, "")
                    .replace(/\n```$/, "");
                const parsed = JSON.parse(jsonString);
                setKnowledgeGraph(parsed);
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
        <div className="flex-1 p-8">
            <Heading size="lg">Build Prospect Context</Heading>
            <p className="text-sm text-zinc-700 mb-8 mt-2">
                Add any combination of text or file context items. Each item
                needs a unique key.
            </p>

            <div className="w-full max-w-2xl">
                <div className="space-y-8">
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
                            className="mt-3 w-full border border-dashed border-zinc-300 rounded-md text-zinc-700 hover:text-zinc-900 hover:border-zinc-400 text-sm py-2 transition-colors"
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
                            className="mt-3 w-full border border-dashed border-zinc-300 rounded-md text-zinc-700 hover:text-zinc-900 hover:border-zinc-400 text-sm py-2 transition-colors"
                        >
                            + Add File Item
                        </button>
                    </section>

                    <hr className="border-zinc-200" />

                    <div className="flex gap-3">
                        <Button
                            onClick={handleBuildPersona}
                            disabled={loading}
                            variant="primary"
                        >
                            {loading ? "Building..." : "Build Unified Context"}
                        </Button>
                        <Button
                            onClick={handleBuildKnowledgeGraph}
                            disabled={loading}
                            variant="primary"
                        >
                            {loading ? "Building..." : "Build Knowledge Graph"}
                        </Button>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Link href="/training/session">
                            <Button variant="primary">
                                Start Training Session
                            </Button>
                        </Link>
                    </div>
                </div>

                {error && (
                    <div className="mt-8 bg-white border border-red-200 rounded-lg p-5">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-red-700 mb-3">
                            Error
                        </h3>
                        <p className="text-sm leading-relaxed text-red-600">
                            {error}
                        </p>
                    </div>
                )}

                {result && (
                    <div className="mt-8 bg-white border border-zinc-200 rounded-lg p-5">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-700 mb-3">
                            Unified Context ({meta?.text} text, {meta?.files}{" "}
                            file)
                        </h3>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-700">
                            {result}
                        </p>
                    </div>
                )}

                {knowledgeGraph && (
                    <div className="mt-8 bg-white border border-zinc-200 rounded-lg p-5">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-700 mb-5">
                            Knowledge Graph ({meta?.text} text, {meta?.files}{" "}
                            file)
                        </h3>

                        {/* Nodes Section */}
                        {knowledgeGraph.nodes &&
                            knowledgeGraph.nodes.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-semibold text-zinc-700 mb-3">
                                        Entities ({knowledgeGraph.nodes.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {knowledgeGraph.nodes.map((node) => (
                                            <div
                                                key={node.id}
                                                className="bg-zinc-50 border border-zinc-200 rounded p-3 text-xs"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-semibold text-zinc-900">
                                                            {node.label}
                                                        </p>
                                                        <p className="text-zinc-700 text-xs">
                                                            Type: {node.type}
                                                        </p>
                                                        {Object.keys(
                                                            node.properties ||
                                                                {}
                                                        ).length > 0 && (
                                                            <div className="mt-2 text-zinc-700">
                                                                {Object.entries(
                                                                    node.properties
                                                                ).map(
                                                                    ([
                                                                        key,
                                                                        value,
                                                                    ]) => (
                                                                        <p
                                                                            key={
                                                                                key
                                                                            }
                                                                        >
                                                                            <span className="font-medium">
                                                                                {
                                                                                    key
                                                                                }

                                                                                :
                                                                            </span>{" "}
                                                                            {String(
                                                                                value
                                                                            )}
                                                                        </p>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {/* Edges Section */}
                        {knowledgeGraph.edges &&
                            knowledgeGraph.edges.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-zinc-700 mb-3">
                                        Relationships (
                                        {knowledgeGraph.edges.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {knowledgeGraph.edges.map(
                                            (edge, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-blue-50 border border-blue-200 rounded p-3 text-xs"
                                                >
                                                    <p className="text-zinc-900">
                                                        <span className="font-semibold">
                                                            {edge.from}
                                                        </span>
                                                        {" → "}
                                                        <span className="font-semibold">
                                                            {edge.to}
                                                        </span>
                                                    </p>
                                                    <p className="text-zinc-700 mt-1">
                                                        <span className="italic">
                                                            {edge.relationship}
                                                        </span>{" "}
                                                        <span className="text-blue-600 font-medium">
                                                            (confidence:{" "}
                                                            {(
                                                                edge.confidence *
                                                                100
                                                            ).toFixed(0)}
                                                            %)
                                                        </span>
                                                    </p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
}
