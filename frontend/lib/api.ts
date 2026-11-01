import { DashboardSummary, Entry, Insight, PatternItem, PrivacySettings, ReminderSettings, User, WeeklyReviewRecord, WeeklySummary } from "@/lib/types";
import { clearStoredUser, getStoredSessionToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const LOCAL_ENTRY_STORAGE_PREFIX = "mirrormind-local-entries";

const moodScores: Record<string, number> = {
  overwhelmed: 2,
  anxious: 3,
  tired: 4,
  uncertain: 4.5,
  neutral: 5,
  hopeful: 7,
  motivated: 8,
  calm: 8.5,
  grateful: 9,
};

type RawUserState = {
  user_id: number;
  reminders: {
    enabled: boolean;
    time: string;
    cadence: "daily" | "weekdays";
    message: string;
    last_triggered_at?: string | null;
    lastTriggeredAt?: string | null;
    notifications_enabled?: boolean;
    notificationsEnabled?: boolean;
  } | null;
  privacy: {
    local_only_mode?: boolean;
    localOnlyMode?: boolean;
    hide_sensitive_previews?: boolean;
    hideSensitivePreviews?: boolean;
    export_format?: "json" | "markdown";
    exportFormat?: "json" | "markdown";
  } | null;
  weekly_review: {
    created_at: string;
    answers: {
      noticed: string;
      pressure: string;
      helped: string;
      carry_forward?: string;
      carryForward?: string;
    };
    generated: {
      headline: string;
      summary: string;
      what_changed?: string;
      whatChanged?: string;
      what_helped?: string;
      whatHelped?: string;
      carry_forward?: string;
      carryForward?: string;
    };
  } | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const sessionToken = getStoredSessionToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredUser();
    }
    const errorBody = await response.json().catch(() => ({ detail: "Something went wrong." }));
    throw new Error(errorBody.detail || "Request failed.");
  }

  return response.json() as Promise<T>;
}

function getStorageKey(userId: number) {
  return `${LOCAL_ENTRY_STORAGE_PREFIX}:${userId}`;
}

function getLocalEntries(userId: number): Entry[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Entry[];
  } catch {
    return [];
  }
}

function setLocalEntries(userId: number, entries: Entry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(entries));
}

function entryKey(entry: Entry) {
  return `${entry.id}:${entry.created_at}:${entry.content}`;
}

function mergeEntries(serverEntries: Entry[], localEntries: Entry[]) {
  const merged = new Map<string, Entry>();
  [...serverEntries, ...localEntries].forEach((entry) => {
    merged.set(entryKey(entry), entry);
  });

  return [...merged.values()].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function persistEntry(userId: number, entry: Entry) {
  const merged = mergeEntries([], [entry, ...getLocalEntries(userId)]);
  setLocalEntries(userId, merged);
}

function buildFallbackInsight(content: string, mood: string | undefined, tags: string[]): Insight {
  const firstSentence = content.trim().split(".")[0]?.toLowerCase() || "this reflection";

  return {
    summary: `You're reflecting on ${firstSentence} and trying to understand what it means for you. There is a sense of wanting more clarity instead of staying on autopilot.`,
    emotional_patterns: mood
      ? `The tone suggests ${mood.toLowerCase()} energy.`
      : "The entry carries a reflective tone with a mix of observation and emotion.",
    recurring_concerns: tags.length
      ? `${tags.slice(0, 2).join(", ")} may be part of a recurring concern here.`
      : "There may be an underlying concern around pressure, uncertainty, or wanting more clarity.",
    based_on_patterns: null,
    follow_up_questions: [
      "What part of this situation feels most important to you right now?",
      "When this theme shows up, what do you usually need but rarely name directly?",
      "What would a slightly more grounded response look like this week?",
    ],
    action_suggestion:
      "Take five minutes to write one sentence about what you can control, one sentence about what feels uncertain, and one sentence about the next small step.",
    disclaimer:
      "MirrorMind is a self-reflection tool for personal insight. It is not a mental health professional, and it does not provide medical, psychological, or crisis support.",
  };
}

function buildContext(entries: Entry[]) {
  const tagCounts = new Map<string, number>();
  const moodCounts = new Map<string, number>();
  const stressorCounts = new Map<string, number>();
  const helpfulCounts = new Map<string, number>();

  const stressorKeywords: Record<string, string[]> = {
    "academic stress": ["school", "class", "exam", "grades", "homework", "study", "assignment", "college"],
    "relationship tension": ["relationship", "friend", "partner", "family", "people", "roommate", "text", "conversation"],
    "uncertainty about the future": ["future", "uncertain", "what if", "career", "next year", "after graduation"],
    "self-pressure": ["behind", "progress", "productive", "enough", "expectation", "pressure", "should"],
  };

  const helpfulKeywords: Record<string, string[]> = {
    "you break things into smaller steps": ["small step", "smaller step", "break", "one thing", "chunk"],
    "you slow down enough to name what is actually in your control": ["control", "grounded", "clarity", "pause", "breathe"],
    "you reconnect with long-term goals instead of only reacting to the moment": ["goal", "future", "direction", "plan", "purpose"],
    "you feel better after honest conversation or connection": ["talk", "friend", "conversation", "support", "together"],
  };

  entries.forEach((entry) => {
    if (entry.mood) {
      moodCounts.set(entry.mood, (moodCounts.get(entry.mood) || 0) + 1);
    }
    entry.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });

    const text = entry.content.toLowerCase();
    Object.entries(stressorKeywords).forEach(([label, keywords]) => {
      if (keywords.some((keyword) => text.includes(keyword))) {
        stressorCounts.set(label, (stressorCounts.get(label) || 0) + 1);
      }
    });
    Object.entries(helpfulKeywords).forEach(([label, keywords]) => {
      if (keywords.some((keyword) => text.includes(keyword))) {
        helpfulCounts.set(label, (helpfulCounts.get(label) || 0) + 1);
      }
    });
  });

  return {
    repeatedThemes: [...tagCounts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag),
    repeatedMoods: [...moodCounts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mood]) => mood),
    stressors: [...stressorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label),
    helpfulPatterns: [...helpfulCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label),
  };
}

function summarizePatterns(entries: Entry[]): PatternItem[] {
  if (!entries.length) {
    return [
      {
        title: "Patterns will appear here",
        description:
          "Keep writing for a few days and MirrorMind will surface repeated themes, moods, and shifts over time.",
      },
    ];
  }

  const context = buildContext(entries);
  const items: PatternItem[] = [];

  if (context.repeatedThemes[0]) {
    items.push({
      title: "Repeated theme",
      description: `You've mentioned ${context.repeatedThemes[0]} several times lately, which suggests it is holding a lot of attention in the background of daily life.`,
    });
  }

  if (context.repeatedMoods[0]) {
    items.push({
      title: "Recurring mood",
      description: `${context.repeatedMoods[0][0].toUpperCase()}${context.repeatedMoods[0].slice(1)} appears repeatedly in recent entries, so it may be shaping how you interpret pressure, progress, or uncertainty.`,
    });
  }

  if (context.stressors[0]) {
    items.push({
      title: "Common stressor",
      description:
        `${context.stressors[0][0].toUpperCase()}${context.stressors[0].slice(1)} keeps appearing around difficult moments, so it may be one of the clearest pressure points to watch.`,
    });
  }

  if (context.helpfulPatterns[0]) {
    items.push({
      title: "What seems to help",
      description:
        `You sound steadier when ${context.helpfulPatterns[0]}, which may be worth treating as a repeatable support rather than a one-time exception.`,
    });
  }

  return items.slice(0, 4);
}

function summarizeWeekly(entries: Entry[]): WeeklySummary {
  const recent = entries.slice(0, 7);
  const older = entries.slice(7, 14);
  const context = buildContext(recent);
  const tagCounts = new Map<string, number>();
  const recentMoodCounts = new Map<string, number>();
  const olderMoodCounts = new Map<string, number>();

  recent.forEach((entry) => {
    if (entry.mood) {
      recentMoodCounts.set(entry.mood, (recentMoodCounts.get(entry.mood) || 0) + 1);
    }
    entry.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  older.forEach((entry) => {
    if (entry.mood) {
      olderMoodCounts.set(entry.mood, (olderMoodCounts.get(entry.mood) || 0) + 1);
    }
  });

  const dominantMoods = [...recentMoodCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mood]) => mood);
  const frequentTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const recentTopMood = [...recentMoodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const olderTopMood = [...olderMoodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const recentMoodAverage = recent
    .map((entry) => entry.mood_score)
    .filter((value): value is number => value !== null);
  const olderMoodAverage = older
    .map((entry) => entry.mood_score)
    .filter((value): value is number => value !== null);

  const growthSignals = [];
  if (frequentTags.includes("goals") || frequentTags.includes("motivation")) {
    growthSignals.push("You are checking in on direction and momentum more intentionally.");
  }
  if (frequentTags.includes("relationships")) {
    growthSignals.push("You are noticing how connection affects your emotional clarity.");
  }
  if (context.helpfulPatterns[0]) {
    growthSignals.push(`You are starting to notice that ${context.helpfulPatterns[0]} helps you regain perspective.`);
  }
  if (!growthSignals.length) {
    growthSignals.push("You are building a more consistent reflection habit, which makes patterns easier to notice.");
  }

  const summaryParts = [];
  if (context.repeatedThemes[0]) {
    summaryParts.push(
      `Recent entries keep circling back to ${context.repeatedThemes.slice(0, 2).join(" and ")}, which suggests those areas are carrying the most emotional weight right now.`
    );
  }
  if (context.stressors[0]) {
    summaryParts.push(`A common pressure point seems to be ${context.stressors[0]}, especially when you are already feeling stretched or uncertain.`);
  }
  if (context.helpfulPatterns[0]) {
    summaryParts.push(`You also seem to stabilize when ${context.helpfulPatterns[0]}, which is an encouraging pattern worth repeating on purpose.`);
  }

  return {
    title: "This week in reflection",
    summary: summaryParts.length
      ? summaryParts.join(" ")
      : "Recent entries point to a mix of self-observation, stress processing, and future planning. Your reflections show you are trying to make sense of both feelings and habits rather than simply reacting to them.",
    change_note: recentMoodAverage.length && olderMoodAverage.length
      ? (() => {
          const recentAverage = recentMoodAverage.reduce((sum, score) => sum + score, 0) / recentMoodAverage.length;
          const olderAverageScore = olderMoodAverage.reduce((sum, score) => sum + score, 0) / olderMoodAverage.length;
          if (recentAverage - olderAverageScore >= 1) {
            return "Compared with older entries, your recent reflections sound a little steadier and more resourced.";
          }
          if (olderAverageScore - recentAverage >= 1) {
            return "Compared with older entries, recent reflections carry more strain or pressure, which may be worth checking in on earlier.";
          }
          if (recentTopMood && olderTopMood && recentTopMood !== olderTopMood) {
            return `Compared with older entries, your recent mood has shifted from ${olderTopMood} toward ${recentTopMood}.`;
          }
          return "Your recent reflections are fairly consistent with earlier ones.";
        })()
      : "Your recent reflections are fairly consistent with earlier ones.",
    dominant_moods: dominantMoods.length ? dominantMoods : ["neutral"],
    frequent_tags: frequentTags.length ? frequentTags : ["reflection"],
    growth_signals: growthSignals,
    helpful_patterns: context.helpfulPatterns.length
      ? context.helpfulPatterns
      : ["Small moments of reflection are giving you useful signal, even when the pattern is still emerging."],
    suggested_focus: context.helpfulPatterns[0]
      ? `For your next reflection, pay attention to whether ${context.helpfulPatterns[0]} changes your energy, clarity, or self-talk.`
      : context.stressors[0]
        ? `This week, try naming ${context.stressors[0]} earlier, before it turns into a bigger spiral.`
        : context.repeatedThemes[0]
          ? `Pick one small action that supports your ongoing theme around ${context.repeatedThemes[0]}, even if it only takes ten minutes.`
          : "For your next reflection, focus on one moment that drained you and one moment that helped you feel more grounded.",
  };
}

function buildDashboardSummary(entries: Entry[]): DashboardSummary {
  const moodBreakdownMap = new Map<string, number>();
  let moodScoreSum = 0;
  let moodScoreCount = 0;

  entries.forEach((entry) => {
    if (entry.mood) {
      moodBreakdownMap.set(entry.mood, (moodBreakdownMap.get(entry.mood) || 0) + 1);
    }
    if (entry.mood_score !== null) {
      moodScoreSum += entry.mood_score;
      moodScoreCount += 1;
    }
  });

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const entriesThisWeek = entries.filter((entry) => new Date(entry.created_at).getTime() >= oneWeekAgo).length;
  const trendPoints = [...entries]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-10)
    .map((entry) => ({
      date: new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      score: entry.mood_score ?? 5,
    }));

  return {
    total_entries: entries.length,
    entries_this_week: entriesThisWeek,
    average_mood_score: moodScoreCount ? Number((moodScoreSum / moodScoreCount).toFixed(2)) : 5,
    mood_breakdown: [...moodBreakdownMap.entries()].map(([mood, count]) => ({ mood, count })),
    trend_points: trendPoints,
    recent_patterns: summarizePatterns(entries),
    weekly_summary: summarizeWeekly(entries),
  };
}

export async function login(email: string, password: string) {
  return request<{ user: User; session_token: string; message: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(name: string, email: string, password: string) {
  return request<{ user: User; session_token: string; message: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function fetchCurrentUser() {
  return request<{ user: User }>("/auth/me");
}

export async function fetchUserState(userId: number) {
  const state = await request<RawUserState>(`/user-state?user_id=${userId}`);
  return {
    user_id: state.user_id,
    reminders: state.reminders
      ? {
          enabled: state.reminders.enabled,
          time: state.reminders.time,
          cadence: state.reminders.cadence,
          message: state.reminders.message,
          last_triggered_at: state.reminders.last_triggered_at ?? state.reminders.lastTriggeredAt ?? null,
          notifications_enabled:
            state.reminders.notifications_enabled ?? state.reminders.notificationsEnabled ?? false,
        }
      : null,
    privacy: state.privacy
      ? {
          local_only_mode: state.privacy.local_only_mode ?? state.privacy.localOnlyMode ?? false,
          hide_sensitive_previews:
            state.privacy.hide_sensitive_previews ?? state.privacy.hideSensitivePreviews ?? false,
          export_format: state.privacy.export_format ?? state.privacy.exportFormat ?? "json",
        }
      : null,
    weekly_review: state.weekly_review
      ? {
          created_at: state.weekly_review.created_at,
          answers: {
            noticed: state.weekly_review.answers.noticed,
            pressure: state.weekly_review.answers.pressure,
            helped: state.weekly_review.answers.helped,
            carry_forward:
              state.weekly_review.answers.carry_forward ?? state.weekly_review.answers.carryForward ?? "",
          },
          generated: {
            headline: state.weekly_review.generated.headline,
            summary: state.weekly_review.generated.summary,
            what_changed:
              state.weekly_review.generated.what_changed ?? state.weekly_review.generated.whatChanged ?? "",
            what_helped:
              state.weekly_review.generated.what_helped ?? state.weekly_review.generated.whatHelped ?? "",
            carry_forward:
              state.weekly_review.generated.carry_forward ?? state.weekly_review.generated.carryForward ?? "",
          },
        }
      : null,
  };
}

export async function saveReminderState(userId: number, reminders: ReminderSettings) {
  return request(`/user-state/reminders`, {
    method: "PUT",
    body: JSON.stringify({
      user_id: userId,
      reminders: {
        enabled: reminders.enabled,
        time: reminders.time,
        cadence: reminders.cadence,
        message: reminders.message,
        last_triggered_at: reminders.lastTriggeredAt,
        notifications_enabled: reminders.notificationsEnabled,
      },
    }),
  });
}

export async function savePrivacyState(userId: number, privacy: PrivacySettings) {
  return request(`/user-state/privacy`, {
    method: "PUT",
    body: JSON.stringify({
      user_id: userId,
      privacy: {
        local_only_mode: privacy.localOnlyMode,
        hide_sensitive_previews: privacy.hideSensitivePreviews,
        export_format: privacy.exportFormat,
      },
    }),
  });
}

export async function saveWeeklyReviewState(userId: number, review: WeeklyReviewRecord) {
  return request(`/user-state/weekly-review`, {
    method: "PUT",
    body: JSON.stringify({
      user_id: userId,
      weekly_review: {
        created_at: review.created_at,
        answers: {
          noticed: review.answers.noticed,
          pressure: review.answers.pressure,
          helped: review.answers.helped,
          carry_forward: review.answers.carryForward,
        },
        generated: {
          headline: review.generated.headline,
          summary: review.generated.summary,
          what_changed: review.generated.whatChanged,
          what_helped: review.generated.whatHelped,
          carry_forward: review.generated.carryForward,
        },
      },
    }),
  });
}

export async function fetchEntries(userId: number) {
  const localEntries = getLocalEntries(userId);

  try {
    const serverResponse = await request<{ entries: Entry[] }>(`/entries?user_id=${userId}`);
    const entries = mergeEntries(serverResponse.entries, localEntries);
    setLocalEntries(userId, entries);
    return { entries };
  } catch {
    return { entries: localEntries };
  }
}

export async function fetchEntry(entryId: number, userId?: number) {
  try {
    return await request<Entry>(`/entries/${entryId}`);
  } catch {
    if (!userId) {
      throw new Error("Entry not found.");
    }
    const localEntry = getLocalEntries(userId).find((entry) => entry.id === entryId);
    if (!localEntry) {
      throw new Error("Entry not found.");
    }
    return localEntry;
  }
}

export async function createEntry(payload: { user_id: number; content: string; mood?: string; tags: string[] }) {
  try {
    const entry = await request<Entry>("/entries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    persistEntry(payload.user_id, entry);
    return entry;
  } catch {
    const entry: Entry = {
      id: -Date.now(),
      user_id: payload.user_id,
      content: payload.content,
      mood: payload.mood ?? null,
      mood_score: payload.mood ? moodScores[payload.mood] ?? 5 : 5,
      tags: payload.tags,
      created_at: new Date().toISOString(),
      insight: buildFallbackInsight(payload.content, payload.mood, payload.tags),
    };
    persistEntry(payload.user_id, entry);
    return entry;
  }
}

export async function fetchPatterns(userId: number) {
  const { entries } = await fetchEntries(userId);
  return summarizePatterns(entries);
}

export async function fetchDashboardSummary(userId: number) {
  const { entries } = await fetchEntries(userId);
  return buildDashboardSummary(entries);
}
