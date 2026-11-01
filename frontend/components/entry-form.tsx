"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { JournalCard } from "@/components/journal-card";
import { createEntry } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { guidedPrompts } from "@/lib/prompts";
import { Entry } from "@/lib/types";

const moodOptions = ["overwhelmed", "anxious", "uncertain", "neutral", "hopeful", "motivated", "calm", "grateful"];
const tagOptions = ["stress", "school", "relationships", "motivation", "goals", "habits", "future", "reflection"];

export function EntryForm() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("neutral");
  const [selectedTags, setSelectedTags] = useState<string[]>(["reflection"]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEntry, setCreatedEntry] = useState<Entry | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = getStoredUser();
    if (!user) {
      router.push("/signin");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const entry = await createEntry({
        user_id: user.id,
        content,
        mood,
        tags: selectedTags,
      });
      setCreatedEntry(entry);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not save your reflection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setContent("");
    setMood("neutral");
    setSelectedTags(["reflection"]);
    setError("");
    setCreatedEntry(null);
    setSelectedPromptId(null);
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]
    );
  }

  function applyPrompt(promptId: string) {
    const prompt = guidedPrompts.find((item) => item.id === promptId);
    if (!prompt) {
      return;
    }

    setSelectedPromptId(prompt.id);
    setContent(prompt.prompt);
    setMood(prompt.suggestedMood);
    setSelectedTags(prompt.suggestedTags);
  }

  if (createdEntry) {
    return (
      <div className="space-y-6">
        <div className="glass-panel space-y-4 p-6">
          <p className="pill inline-flex">Reflection saved</p>
          <div>
            <h3 className="text-2xl font-semibold text-white">Here&apos;s what MirrorMind noticed</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
              This response now highlights how your newest reflection connects to patterns that have been showing up over time.
            </p>
          </div>
        </div>

        <JournalCard entry={createdEntry} expanded />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Write another reflection
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel space-y-6 p-6">
      <div>
        <p className="pill inline-flex">New reflection</p>
        <h3 className="mt-4 text-2xl font-semibold text-white">What feels worth noticing today?</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
          Write about a thought, emotional moment, or situation that keeps pulling your attention.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">Guided prompts</p>
            <p className="mt-1 text-sm leading-6 text-mist">
              Start with a prompt when you want a little structure, then edit it into your own words.
            </p>
          </div>
          {selectedPromptId ? (
            <button
              type="button"
              onClick={() => setSelectedPromptId(null)}
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-mist transition hover:bg-white/5"
            >
              Clear prompt
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {guidedPrompts.map((prompt) => {
            const active = selectedPromptId === prompt.id;
            return (
              <button
                key={prompt.id}
                type="button"
                onClick={() => applyPrompt(prompt.id)}
                className={`rounded-3xl border p-4 text-left transition ${
                  active
                    ? "border-accent/40 bg-accent/10"
                    : "border-white/10 bg-slate-950/25 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.25em] text-blue">{prompt.category}</p>
                <p className="mt-3 text-base font-medium text-white">{prompt.title}</p>
                <p className="mt-2 text-sm leading-6 text-mist">{prompt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block space-y-2 text-sm text-mist">
        <span>Your reflection</span>
        <textarea
          required
          minLength={10}
          rows={8}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="I noticed I was hardest on myself when..."
          className="w-full rounded-3xl border border-white/10 bg-slate-950/40 px-5 py-4 text-white outline-none transition focus:border-accent"
        />
      </label>

      <label className="block space-y-2 text-sm text-mist">
        <span>Mood</span>
        <select
          value={mood}
          onChange={(event) => setMood(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
        >
          {moodOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2">
        <span className="text-sm text-mist">Tags</span>
        <div className="flex flex-wrap gap-3">
          {tagOptions.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  active ? "bg-accent text-slate-950" : "border border-white/10 bg-white/5 text-mist"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm leading-6 text-mist">
        MirrorMind offers self-reflection support, not therapy or diagnosis. If the backend has an OpenAI API key,
        your reflection will receive a richer AI-generated response. Without one, the app falls back to a local summary mode.
      </div>

      {error ? <p className="text-sm text-peach">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110 disabled:opacity-60"
      >
        {isSubmitting ? "Saving reflection..." : "Save and analyze"}
      </button>
    </form>
  );
}
