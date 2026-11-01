"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { InsightCard } from "@/components/insight-card";
import { fetchCurrentUser, fetchDashboardSummary, fetchPatterns } from "@/lib/api";
import { clearStoredUser, getStoredUser, storeUser } from "@/lib/auth";
import { DashboardSummary, PatternItem } from "@/lib/types";

export default function InsightsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [error, setError] = useState("");
  const topPattern = patterns[0];
  const topHelper = summary?.weekly_summary.helpful_patterns?.[0];

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/signin");
      return;
    }

    fetchCurrentUser()
      .then(({ user: validatedUser }) => {
        storeUser(validatedUser);
        return Promise.all([fetchDashboardSummary(validatedUser.id), fetchPatterns(validatedUser.id)]);
      })
      .then(([dashboard, patternList]) => {
        setSummary(dashboard);
        setPatterns(patternList);
      })
      .catch((loadError) => {
        clearStoredUser();
        setError(loadError instanceof Error ? loadError.message : "Could not load insights.");
        router.push("/signin");
      });
  }, [router]);

  return (
    <AppShell
      title="Insights and changes"
      subtitle="A higher-level view of emotional patterns, repeated concerns, and what seems different now compared with earlier reflections."
    >
      {error ? <div className="glass-panel p-5 text-sm text-peach">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel p-6">
          <p className="text-sm font-medium text-white">{summary?.weekly_summary.title || "Weekly summary"}</p>
          <p className="mt-4 text-sm leading-7 text-mist">{summary?.weekly_summary.summary || "Loading..."}</p>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-blue">What changed?</p>
              <p className="mt-2 text-sm leading-6 text-ink">{summary?.weekly_summary.change_note}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-accent">Growth signals</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-mist">
                {(summary?.weekly_summary.growth_signals || []).map((signal) => (
                  <p key={signal}>{signal}</p>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">What helps</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-mist">
                {(summary?.weekly_summary.helpful_patterns || []).map((pattern) => (
                  <p key={pattern}>{pattern}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {patterns.map((item) => (
            <InsightCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-blue/20 bg-[linear-gradient(140deg,rgba(92,160,255,0.12),rgba(92,160,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(8,15,35,0.24)]">
          <p className="text-xs uppercase tracking-[0.25em] text-blue">Biggest takeaway</p>
          <h3 className="mt-3 text-3xl font-semibold text-white">
            {topPattern?.title || "Your clearest pattern will appear here."}
          </h3>
          <p className="mt-4 text-sm leading-7 text-ink">
            {topPattern?.description ||
              "As your reflections build up, MirrorMind will turn scattered thoughts into a clearer explanation of what is repeating."}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-peach">Most repeated theme</p>
              <p className="mt-3 text-sm leading-6 text-mist">
                {summary?.weekly_summary.frequent_tags?.[0]
                  ? `${summary.weekly_summary.frequent_tags[0]} appears often enough to shape your recent reflections.`
                  : "Repeated themes will appear here as your history grows."}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">Most supportive pattern</p>
              <p className="mt-3 text-sm leading-6 text-mist">
                {topHelper || "MirrorMind will highlight the habits or mindsets that seem to help you most."}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Why this is useful</p>
          <div className="mt-5 space-y-4">
            {[
              "It helps you notice what keeps taking up emotional space.",
              "It compares newer reflections with older ones instead of treating every entry as isolated.",
              "It highlights what seems to help, not just what feels hard.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm leading-6 text-mist">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel p-5">
          <p className="text-sm font-medium text-white">Dominant moods</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(summary?.weekly_summary.dominant_moods || []).map((mood) => (
              <span key={mood} className="pill">
                {mood}
              </span>
            ))}
          </div>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm font-medium text-white">Frequent themes</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(summary?.weekly_summary.frequent_tags || []).map((tag) => (
              <span key={tag} className="pill">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="glass-panel p-5 md:col-span-2">
          <p className="text-sm font-medium text-white">Suggested focus for next week</p>
          <p className="mt-3 text-sm leading-7 text-mist">
            {summary?.weekly_summary.suggested_focus || "A clearer next step will appear here as MirrorMind gathers more reflections."}
          </p>
        </div>
      </section>
    </AppShell>
  );
}
