"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { JournalCard } from "@/components/journal-card";
import { TagFilter } from "@/components/tag-filter";
import { fetchCurrentUser, fetchEntries } from "@/lib/api";
import { clearStoredUser, getStoredUser, storeUser } from "@/lib/auth";
import { Entry } from "@/lib/types";

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedMood, setSelectedMood] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedFocus, setSelectedFocus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/signin");
      return;
    }
    fetchCurrentUser()
      .then(({ user: validatedUser }) => {
        storeUser(validatedUser);
        return fetchEntries(validatedUser.id);
      })
      .then((response) => setEntries(response.entries))
      .catch((loadError) => {
        clearStoredUser();
        setError(loadError instanceof Error ? loadError.message : "Could not load history.");
        router.push("/signin");
      });
  }, [router]);

  const repeatedTags = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      entry.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });
    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count >= 2)
        .map(([tag]) => tag)
    );
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const moodMatches = selectedMood === "all" || entry.mood === selectedMood;
      const tagMatches = selectedTag === "all" || entry.tags.includes(selectedTag);
      const searchMatches =
        !searchQuery.trim() ||
        [entry.content, entry.insight?.summary, entry.insight?.based_on_patterns, entry.insight?.action_suggestion]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(searchQuery.trim().toLowerCase()));

      const text = `${entry.content} ${entry.insight?.summary || ""} ${entry.insight?.based_on_patterns || ""} ${entry.insight?.action_suggestion || ""}`.toLowerCase();
      const hasRepeatedTheme = entry.tags.some((tag) => repeatedTags.has(tag)) || Boolean(entry.insight?.based_on_patterns);
      const hasHelpfulSignal =
        text.includes("help") ||
        text.includes("steadier") ||
        text.includes("grounded") ||
        text.includes("small step") ||
        text.includes("plan") ||
        text.includes("control");
      const hasFuturePressure =
        text.includes("future") ||
        text.includes("behind") ||
        text.includes("progress") ||
        text.includes("pressure") ||
        text.includes("uncertain");
      const hasSupportiveShift =
        Boolean(entry.insight?.based_on_patterns) ||
        text.includes("more hopeful") ||
        text.includes("calmer") ||
        text.includes("steadier");

      const focusMatches =
        selectedFocus === "all" ||
        (selectedFocus === "repeated-theme" && hasRepeatedTheme) ||
        (selectedFocus === "what-helped" && hasHelpfulSignal) ||
        (selectedFocus === "future-pressure" && hasFuturePressure) ||
        (selectedFocus === "supportive-shift" && hasSupportiveShift);

      return moodMatches && tagMatches && searchMatches && focusMatches;
    });
  }, [entries, repeatedTags, searchQuery, selectedFocus, selectedMood, selectedTag]);

  const historyStats = useMemo(() => {
    const supportiveEntries = entries.filter((entry) => {
      const text = `${entry.content} ${entry.insight?.summary || ""} ${entry.insight?.based_on_patterns || ""}`.toLowerCase();
      return text.includes("help") || text.includes("steadier") || text.includes("grounded") || text.includes("plan");
    }).length;
    const repeatedThemeEntries = entries.filter((entry) => entry.tags.some((tag) => repeatedTags.has(tag))).length;
    return {
      total: entries.length,
      repeatedThemeEntries,
      supportiveEntries,
    };
  }, [entries, repeatedTags]);

  return (
    <AppShell
      title="Reflection history"
      subtitle="Review past entries, filter by mood or theme, and surface the moments where patterns repeat or something genuinely helps."
    >
      {error ? <div className="glass-panel p-5 text-sm text-peach">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-blue">Entries tracked</p>
          <p className="mt-3 text-3xl font-semibold text-white">{historyStats.total}</p>
          <p className="mt-2 text-sm leading-6 text-mist">A fuller history gives MirrorMind more context for noticing patterns over time.</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Repeated themes</p>
          <p className="mt-3 text-3xl font-semibold text-white">{historyStats.repeatedThemeEntries}</p>
          <p className="mt-2 text-sm leading-6 text-mist">Entries tied to tags that show up again and again.</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">What helped</p>
          <p className="mt-3 text-3xl font-semibold text-white">{historyStats.supportiveEntries}</p>
          <p className="mt-2 text-sm leading-6 text-mist">Reflections that hint at steadier moments, clarity, or practical support.</p>
        </div>
      </section>

      <div className="glass-panel p-5">
        <label className="space-y-2 text-sm text-mist">
          <span>Search reflections</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search thoughts, summaries, or pattern notes"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
          />
        </label>
      </div>

      <TagFilter
        selectedMood={selectedMood}
        selectedTag={selectedTag}
        selectedFocus={selectedFocus}
        onMoodChange={setSelectedMood}
        onTagChange={setSelectedTag}
        onFocusChange={setSelectedFocus}
      />
      <section className="space-y-4">
        {!filteredEntries.length ? (
          <div className="glass-panel p-6 text-sm leading-6 text-mist">
            No reflections match this combination yet. Try loosening the filters or searching for a broader theme.
          </div>
        ) : null}
        {filteredEntries.map((entry) => (
          <JournalCard key={entry.id} entry={entry} expanded />
        ))}
      </section>
    </AppShell>
  );
}
