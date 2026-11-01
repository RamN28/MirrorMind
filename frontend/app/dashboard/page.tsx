"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { InsightCard } from "@/components/insight-card";
import { JournalCard } from "@/components/journal-card";
import { MoodChart } from "@/components/mood-chart";
import { StatCard } from "@/components/stat-card";
import { fetchCurrentUser, fetchDashboardSummary, fetchEntries } from "@/lib/api";
import { clearStoredUser, dismissOnboarding, getOnboardingState, getStoredUser, storeUser } from "@/lib/auth";
import { hydratePrivacySettings } from "@/lib/privacy";
import { hydrateReminderSettings, isReminderDue, persistReminderSettings, sendReminderNotification } from "@/lib/reminders";
import { DashboardSummary, Entry } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [reminderDue, setReminderDue] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userName, setUserName] = useState("");
  const [hideSensitivePreviews, setHideSensitivePreviews] = useState(false);

  const strongestPattern = summary?.recent_patterns?.[0];
  const strongestHelper = summary?.weekly_summary.helpful_patterns?.[0];

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/signin");
      return;
    }
    setUserName(user.name);

    fetchCurrentUser()
      .then(({ user: validatedUser }) => {
        storeUser(validatedUser);
        return Promise.all([
          hydrateReminderSettings(validatedUser.id),
          hydratePrivacySettings(validatedUser.id),
          fetchEntries(validatedUser.id),
          fetchDashboardSummary(validatedUser.id),
        ]).then(([reminderSettings, privacySettings, entryResponse, summaryResponse]) => {
          const due = isReminderDue(reminderSettings);
          setReminderDue(due);
          setHideSensitivePreviews(privacySettings.hideSensitivePreviews);

          if (due && reminderSettings.notificationsEnabled) {
            const sent = sendReminderNotification(reminderSettings);
            if (sent) {
              persistReminderSettings(validatedUser.id, {
                ...reminderSettings,
                lastTriggeredAt: new Date().toISOString(),
              });
            }
          }

          return [entryResponse, summaryResponse] as const;
        });
      })
      .then(([entryResponse, summaryResponse]) => {
        setEntries(entryResponse.entries);
        setSummary(summaryResponse);
        const user = getStoredUser();
        if (!user) {
          return;
        }
        const onboardingState = getOnboardingState(user.id);
        setShowOnboarding(Boolean(onboardingState && !onboardingState.dismissed && entryResponse.entries.length === 0));
      })
      .catch((loadError) => {
        clearStoredUser();
        setError(loadError instanceof Error ? loadError.message : "Could not load dashboard data.");
        router.push("/signin");
      });
  }, [router]);

  return (
    <AppShell
      title="Your reflection dashboard"
      subtitle="Track recent entries, notice emotional patterns, and give a judge or a first-time user a clear story in under two minutes."
    >
      {error ? <div className="glass-panel p-5 text-sm text-peach">{error}</div> : null}

      {reminderDue ? (
        <section className="rounded-3xl border border-blue/20 bg-blue/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-blue">Reflection due</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-ink">
              Your reminder window has arrived. Take a few minutes to notice what felt heavy, what helped, and what you want to carry forward.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/new-entry"
                className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110"
              >
                Write now
              </Link>
              <Link
                href="/reminders"
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-mist transition hover:bg-white/5"
              >
                Manage reminders
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {showOnboarding ? (
        <section className="rounded-3xl border border-accent/20 bg-accent/10 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.25em] text-accent">Welcome to MirrorMind</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">
                {userName ? `${userName}, here's the fastest way to get useful insight` : "Here's the fastest way to get useful insight"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-ink">
                Start with one honest reflection, let MirrorMind connect it to patterns over time, and then use the weekly review once you've built a little history.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  "1. Write one reflection using a guided prompt if the page feels blank.",
                  '2. Read the "Based on your recent patterns" insight after saving.',
                  "3. Come back to Weekly Review after a few entries to see what changed.",
                ].map((step) => (
                  <div key={step} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm leading-6 text-mist">
                    {step}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/new-entry"
                className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110"
              >
                Start first reflection
              </Link>
              <button
                type="button"
                onClick={() => {
                  const user = getStoredUser();
                  if (!user) {
                    return;
                  }
                  dismissOnboarding(user.id);
                  setShowOnboarding(false);
                }}
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-mist transition hover:bg-white/5"
              >
                Dismiss
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total entries"
          value={summary ? String(summary.total_entries) : "--"}
          note="A growing history makes your patterns easier to interpret."
        />
        <StatCard
          label="Entries this week"
          value={summary ? String(summary.entries_this_week) : "--"}
          note="Consistency matters more than writing the perfect reflection."
        />
        <StatCard
          label="Average mood score"
          value={summary ? summary.average_mood_score.toFixed(1) : "--"}
          note="A lightweight signal, not a diagnosis. Use it to spot changes, not judge yourself."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[28px] border border-accent/20 bg-[linear-gradient(140deg,rgba(110,226,192,0.16),rgba(110,226,192,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(8,15,35,0.28)]">
          <p className="text-xs uppercase tracking-[0.25em] text-accent">This week's mirror</p>
          <h3 className="mt-3 text-3xl font-semibold text-white">
            {strongestPattern?.title || "Your patterns are starting to take shape."}
          </h3>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink">
            {strongestPattern?.description ||
              "Keep reflecting for a few days and MirrorMind will start surfacing what repeats, what shifts, and what helps you feel steadier."}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-blue">What changed</p>
              <p className="mt-3 text-sm leading-6 text-mist">
                {summary?.weekly_summary.change_note || "Recent changes will appear here as your history builds."}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">What helps most</p>
              <p className="mt-3 text-sm leading-6 text-mist">
                {strongestHelper || "Small repeatable supports will appear here as MirrorMind notices them."}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-peach">Demo story</p>
          <div className="mt-4 space-y-4">
            {[
              "Capture one honest reflection with mood and tags.",
              "Read the AI response and look for the pattern-based note.",
              "Open Insights to see what changed over time.",
            ].map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-mist">Step {index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-ink">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <MoodChart points={summary?.trend_points || []} />
        <div className="glass-panel p-5">
          <p className="text-sm font-medium text-white">{summary?.weekly_summary.title || "Weekly summary"}</p>
          <p className="mt-3 text-sm leading-7 text-mist">{summary?.weekly_summary.summary || "Loading summary..."}</p>
          <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm leading-6 text-ink">
            {summary?.weekly_summary.change_note || "Recent changes will appear here."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(summary?.weekly_summary.dominant_moods || []).map((mood) => (
              <span key={mood} className="pill">
                {mood}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">What helps</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-mist">
              {(summary?.weekly_summary.helpful_patterns || []).slice(0, 2).map((pattern) => (
                <p key={pattern}>{pattern}</p>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-blue/20 bg-blue/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-blue">Suggested focus</p>
            <p className="mt-2 text-sm leading-6 text-ink">
              {summary?.weekly_summary.suggested_focus || "A useful next focus will appear here as your reflections build up."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Recent reflections</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/weekly-review"
                className="rounded-full border border-blue/20 bg-blue/5 px-4 py-2 text-sm text-blue transition hover:bg-blue/10"
              >
                Weekly review
              </Link>
              <Link
                href="/new-entry"
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist transition hover:bg-white/5"
              >
                Guided prompts
              </Link>
            </div>
          </div>
          {entries.slice(0, 3).map((entry) => (
            <JournalCard key={entry.id} entry={entry} hidePreview={hideSensitivePreviews} />
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Patterns</h3>
          {(summary?.recent_patterns || []).map((item) => (
            <InsightCard key={item.title} item={item} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
