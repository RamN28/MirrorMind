"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { fetchCurrentUser, fetchEntries } from "@/lib/api";
import { clearStoredUser, getStoredUser, storeUser } from "@/lib/auth";
import { Entry, WeeklyReviewRecord } from "@/lib/types";
import { buildWeeklyReview, hydrateWeeklyReview, persistWeeklyReview } from "@/lib/weekly-review";

type ReviewAnswers = WeeklyReviewRecord["answers"];

const weeklyQuestions: Array<{ key: keyof ReviewAnswers; label: string; prompt: string; placeholder: string }> = [
  {
    key: "noticed",
    label: "What did you notice most clearly this week?",
    prompt: "Name a thought pattern, emotional theme, or behavior that kept showing up.",
    placeholder: "I kept noticing that...",
  },
  {
    key: "pressure",
    label: "What felt heaviest or most draining?",
    prompt: "This helps separate the real source of pressure from the general noise around it.",
    placeholder: "The part that felt hardest was...",
  },
  {
    key: "helped",
    label: "What genuinely helped, even a little?",
    prompt: "Look for moments of steadiness, support, structure, or clarity.",
    placeholder: "I felt more like myself when...",
  },
  {
    key: "carryForward",
    label: "What do you want to carry into next week?",
    prompt: "Choose one mindset, boundary, or action that feels worth repeating.",
    placeholder: "Next week I want to keep...",
  },
];

export default function WeeklyReviewPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [answers, setAnswers] = useState<ReviewAnswers>({
    noticed: "",
    pressure: "",
    helped: "",
    carryForward: "",
  });
  const [savedReview, setSavedReview] = useState<WeeklyReviewRecord | null>(null);
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
        return Promise.all([hydrateWeeklyReview(validatedUser.id), fetchEntries(validatedUser.id)]);
      })
      .then(([existing, response]) => {
        if (existing) {
          setSavedReview(existing);
          setAnswers(existing.answers);
        }
        setEntries(response.entries);
      })
      .catch((loadError) => {
        clearStoredUser();
        setError(loadError instanceof Error ? loadError.message : "Could not load your weekly review.");
        router.push("/signin");
      });
  }, [router]);

  const quickSignals = useMemo(() => {
    const recentEntries = entries.slice(0, 7);
    const tagCounts = new Map<string, number>();
    const helpful = new Set<string>();

    recentEntries.forEach((entry) => {
      entry.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });

      const text = `${entry.content} ${entry.insight?.based_on_patterns || ""} ${entry.insight?.action_suggestion || ""}`.toLowerCase();
      if (text.includes("plan") || text.includes("small step")) {
        helpful.add("smaller steps or clearer structure");
      }
      if (text.includes("friend") || text.includes("conversation") || text.includes("support")) {
        helpful.add("honest conversation or support");
      }
      if (text.includes("control") || text.includes("grounded")) {
        helpful.add("naming what you can actually control");
      }
    });

    return {
      topThemes: [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag),
      helpful: [...helpful],
    };
  }, [entries]);

  function handleAnswerChange(key: keyof ReviewAnswers, value: string) {
    setAnswers((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleGenerateReview() {
    const user = getStoredUser();
    if (!user) {
      router.push("/signin");
      return;
    }

    const review = buildWeeklyReview(entries, answers);
    void persistWeeklyReview(user.id, review);
    setSavedReview(review);
  }

  function clearReview() {
    setSavedReview(null);
    setAnswers({
      noticed: "",
      pressure: "",
      helped: "",
      carryForward: "",
    });
  }

  return (
    <AppShell
      title="Weekly review ritual"
      subtitle="Pause for a few minutes, answer four guided questions, and let MirrorMind turn the week into a clearer story you can carry forward."
    >
      {error ? <div className="glass-panel p-5 text-sm text-peach">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <p className="pill inline-flex">End-of-week check-in</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Turn scattered reflections into a clearer weekly signal</h3>
            <p className="mt-3 text-sm leading-7 text-mist">
              This works best after a few journal entries. Use the prompts below to name what felt heaviest, what helped, and what you want to keep.
            </p>
          </div>

          <div className="glass-panel space-y-4 p-6">
            <p className="text-sm font-medium text-white">Quick signals from your recent entries</p>
            <div className="space-y-3 text-sm leading-6 text-mist">
              <p>
                <span className="text-white">Themes showing up:</span>{" "}
                {quickSignals.topThemes.length ? quickSignals.topThemes.join(", ") : "Add a few more entries and themes will show up here."}
              </p>
              <p>
                <span className="text-white">What may be helping:</span>{" "}
                {quickSignals.helpful.length ? quickSignals.helpful.join(", ") : "Moments of support will appear here as MirrorMind notices them."}
              </p>
            </div>
          </div>

          <div className="glass-panel space-y-5 p-6">
            {weeklyQuestions.map((question) => (
              <label key={question.key} className="block space-y-2 text-sm text-mist">
                <span className="text-white">{question.label}</span>
                <p className="text-sm leading-6 text-mist">{question.prompt}</p>
                <textarea
                  rows={3}
                  value={answers[question.key]}
                  onChange={(event) => handleAnswerChange(question.key, event.target.value)}
                  placeholder={question.placeholder}
                  className="w-full rounded-3xl border border-white/10 bg-slate-950/40 px-5 py-4 text-white outline-none transition focus:border-accent"
                />
              </label>
            ))}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerateReview}
                className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110"
              >
                Generate weekly review
              </button>
              {savedReview ? (
                <button
                  type="button"
                  onClick={clearReview}
                  className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Reset review
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-blue">Weekly reflection</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">
              {savedReview?.generated.headline || "Your weekly summary will appear here"}
            </h3>
            <p className="mt-4 text-sm leading-7 text-mist">
              {savedReview?.generated.summary || "Answer the prompts to generate a stronger end-of-week summary that connects your entries into one clearer narrative."}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="glass-panel p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-accent">What changed?</p>
              <p className="mt-3 text-sm leading-7 text-mist">
                {savedReview?.generated.whatChanged || "Your review will compare what felt heavy with what you started to notice more clearly."}
              </p>
            </div>
            <div className="glass-panel p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">What helped?</p>
              <p className="mt-3 text-sm leading-7 text-mist">
                {savedReview?.generated.whatHelped || "MirrorMind will pull forward the moments that seemed to help, not just the moments that hurt."}
              </p>
            </div>
            <div className="glass-panel p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-blue">Carry forward</p>
              <p className="mt-3 text-sm leading-7 text-mist">
                {savedReview?.generated.carryForward || "You’ll get one clearer sentence about what feels worth repeating next week."}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5 text-sm leading-6 text-mist">
            MirrorMind is helping you summarize your own reflections, not diagnose them. Use this page as a weekly pause to notice patterns and choose one next step that feels honest.
          </div>
        </div>
      </section>
    </AppShell>
  );
}
