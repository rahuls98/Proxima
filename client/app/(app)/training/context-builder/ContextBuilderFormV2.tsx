"use client";

import { useState } from "react";
import { Input } from "@/components/atoms/Input";
import { AdditionalFileContext } from "@/components/molecules/AdditionalFileContext";

type AdditionalFileItem = {
    id: number;
    key: string;
    value: string;
    file: File | null;
};

export function ContextBuilderFormV2() {
    const [additionalFiles, setAdditionalFiles] = useState<
        AdditionalFileItem[]
    >([{ id: 1, key: "", value: "", file: null }]);
    const [fileCounter, setFileCounter] = useState(2);

    const addAdditionalFile = () => {
        setAdditionalFiles((prev) => [
            ...prev,
            { id: fileCounter, key: "", value: "", file: null },
        ]);
        setFileCounter((c) => c + 1);
    };

    const removeAdditionalFile = (id: number) => {
        setAdditionalFiles((prev) => prev.filter((item) => item.id !== id));
    };

    const updateAdditionalFileKey = (id: number, key: string) => {
        setAdditionalFiles((prev) =>
            prev.map((item) => (item.id === id ? { ...item, key } : item))
        );
    };

    const updateAdditionalFileValue = (id: number, value: string) => {
        setAdditionalFiles((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, value, file: null } : item
            )
        );
    };

    const updateAdditionalFile = (id: number, file: File | null) => {
        setAdditionalFiles((prev) =>
            prev.map((item) => (item.id === id ? { ...item, file } : item))
        );
    };

    return (
        <div className="space-y-8">
            <section className="bg-surface-panel rounded-2xl border border-border-subtle p-6 space-y-8">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <span className="material-symbols-outlined !text-[20px]">
                            person
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                        Prospect Identity
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Prospect Name
                        </label>
                        <Input type="text" placeholder="e.g. Sarah Mitchell" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Job Title
                        </label>
                        <Input type="text" placeholder="e.g. VP of Marketing" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Department
                        </label>
                        <Input type="text" placeholder="e.g. Marketing" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Company Name
                        </label>
                        <Input type="text" placeholder="e.g. GrowthStack" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Company Size
                        </label>
                        <Input
                            type="text"
                            placeholder="e.g. 500-1000 employees"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Industry
                        </label>
                        <Input type="text" placeholder="e.g. B2B SaaS" />
                    </div>
                </div>
            </section>

            <section className="bg-surface-panel rounded-2xl border border-border-subtle p-6 space-y-8">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <span className="material-symbols-outlined !text-[20px]">
                            work
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                        Business Context
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Buying Stage
                        </label>
                        <Input
                            type="text"
                            placeholder="e.g. Early Evaluation"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Current Initiative
                        </label>
                        <Input
                            type="text"
                            placeholder="e.g. Marketing automation overhaul"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Current Tools
                        </label>
                        <Input
                            type="text"
                            placeholder="e.g. HubSpot, Salesforce"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Budget Status
                        </label>
                        <Input
                            type="text"
                            placeholder="e.g. Pending Approval"
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-text-muted mb-1 block">
                            Decision Timeline
                        </label>
                        <Input type="text" placeholder="e.g. 3-6 months" />
                    </div>
                </div>
            </section>

            <section className="bg-surface-panel rounded-2xl border border-border-subtle p-6 space-y-8">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <span className="material-symbols-outlined !text-[20px]">
                                menu_book
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                            Knowledge Inputs
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={addAdditionalFile}
                        className="px-4 py-2 bg-surface-hover border border-border-subtle rounded-lg text-xs font-bold text-white hover:border-primary transition-all"
                    >
                        + ADD SOURCE
                    </button>
                </div>

                <AdditionalFileContext
                    items={additionalFiles}
                    onAdd={addAdditionalFile}
                    onRemove={removeAdditionalFile}
                    onUpdateKey={updateAdditionalFileKey}
                    onUpdateValue={updateAdditionalFileValue}
                    onUpdateFile={updateAdditionalFile}
                    showHeader={false}
                    showAddButton={false}
                />
            </section>
        </div>
    );
}
