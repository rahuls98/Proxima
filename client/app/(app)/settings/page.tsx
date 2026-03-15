"use client";

import { useEffect, useState } from "react";
import { AppPageHeader } from "@/components/molecules/AppPageHeader";

import {
    fetchAvatarGenerationEnabled,
    updateAvatarGenerationEnabled,
} from "@/lib/ai-feature-settings";
import {
    getUserCallContext,
    getUserName,
    setUserCallContext,
    setUserName,
} from "@/lib/user-settings";

export default function SettingsPage() {
    const [avatarGenerationEnabled, setAvatarGenerationEnabledState] =
        useState<boolean>(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [userName, setUserNameState] = useState("");
    const [userCallContext, setUserCallContextState] = useState("");
    const [userNameSaved, setUserNameSaved] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const enabled = await fetchAvatarGenerationEnabled();
                setAvatarGenerationEnabledState(enabled);
                setUserNameState(getUserName() || "");
                setUserCallContextState(getUserCallContext() || "");
            } catch (loadError) {
                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "Failed to load AI feature settings."
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    const toggleAvatarGeneration = async () => {
        if (isSaving || isLoading) {
            return;
        }

        const next = !avatarGenerationEnabled;
        setIsSaving(true);
        setError(null);
        try {
            const persisted = await updateAvatarGenerationEnabled(next);
            setAvatarGenerationEnabledState(persisted);
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Failed to save AI feature settings."
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex-1 h-full min-w-0 flex flex-col bg-surface-base">
            <AppPageHeader title="Settings" />

            <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
                <section className="p-6 space-y-8 max-w-3xl">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">
                            person
                        </span>
                        <h2 className="text-lg font-bold text-text-main">
                            User Settings
                        </h2>
                    </div>
                    <form
                        className="flex items-end gap-4 rounded-xl border border-border-subtle bg-surface-base p-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            setUserName(userName);
                            setUserCallContext(userCallContext);
                            setUserNameSaved(true);
                            setTimeout(() => setUserNameSaved(false), 1200);
                        }}
                    >
                        <div className="flex-1 space-y-4">
                            <label
                                className="block text-sm font-semibold text-text-main mb-1"
                                htmlFor="userNameInput"
                            >
                                Your Name
                            </label>
                            <input
                                id="userNameInput"
                                type="text"
                                className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm bg-surface-panel text-text-main focus:outline-none focus:border-primary"
                                value={userName}
                                onChange={(e) =>
                                    setUserNameState(e.target.value)
                                }
                                placeholder="Enter your name"
                            />

                            <div>
                                <label
                                    className="block text-sm font-semibold text-text-main mb-1"
                                    htmlFor="userCallContextInput"
                                >
                                    About You
                                </label>
                                <textarea
                                    id="userCallContextInput"
                                    className="w-full min-h-24 rounded-lg border border-border-subtle px-3 py-2 text-sm bg-surface-panel text-text-main placeholder:text-text-placeholder focus:outline-none focus:border-primary resize-y"
                                    value={userCallContext}
                                    onChange={(e) =>
                                        setUserCallContextState(e.target.value)
                                    }
                                    placeholder="I am an AE focused on enterprise discovery. I usually aim to qualify urgency, identify blockers, and align next steps with a clear decision timeline."
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-60"
                            disabled={
                                userName.trim() === "" &&
                                userCallContext.trim() === ""
                            }
                        >
                            Save
                        </button>
                        {userNameSaved && (
                            <span className="text-xs text-success ml-2">
                                Saved!
                            </span>
                        )}
                    </form>

                    <hr className="border-border-subtle" />

                    <div className="flex items-center gap-3 mt-8">
                        <span className="material-symbols-outlined text-primary">
                            smart_toy
                        </span>
                        <h2 className="text-lg font-bold text-text-main">
                            AI Features
                        </h2>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-surface-base p-4">
                        <div>
                            <p className="text-sm font-semibold text-text-main">
                                Avatar Generation
                            </p>
                            <p className="text-xs text-text-muted mt-1">
                                Generate persona avatars during context build
                                and show them in the meeting room participant
                                tile.
                            </p>
                            <br />
                            <p className="text-xs text-text-muted">
                                {isLoading
                                    ? "Loading setting..."
                                    : isSaving
                                      ? "Saving setting..."
                                      : "Global setting applies to all sessions and users."}
                            </p>
                            {error ? (
                                <p className="text-xs text-danger">{error}</p>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={toggleAvatarGeneration}
                            disabled={isLoading || isSaving}
                            className={`relative h-7 w-14 rounded-full border transition-colors ${
                                avatarGenerationEnabled
                                    ? "bg-primary/20 border-primary/50"
                                    : "bg-surface-hover border-border-subtle"
                            } ${
                                isLoading || isSaving
                                    ? "opacity-60 cursor-not-allowed"
                                    : ""
                            }`}
                            aria-pressed={avatarGenerationEnabled}
                            aria-label="Toggle avatar generation"
                        >
                            <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${
                                    avatarGenerationEnabled
                                        ? "left-8 bg-primary"
                                        : "left-1 bg-text-muted"
                                }`}
                            />
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
