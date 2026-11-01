import { Entry, WeeklyReviewRecord } from "@/lib/types";
import { fetchUserState, saveWeeklyReviewState } from "@/lib/api";

const REVIEW_STORAGE_PREFIX = "mirrormind-weekly-review";

type ReviewAnswers = WeeklyReviewRecord["answers"];

function getStorageKey(userId: number) {
  return `${REVIEW_STORAGE_PREFIX}:${userId}`;
}

export function getStoredWeeklyReview(userId: number): WeeklyReviewRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as WeeklyReviewRecord;
  } catch {
    return null;
  }
}

export function storeWeeklyReview(userId: number, review: WeeklyReviewRecord) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(review));
}

export async function hydrateWeeklyReview(userId: number) {
  try {
    const state = await fetchUserState(userId);
    if (!state.weekly_review) {
      return getStoredWeeklyReview(userId);
    }
    const hydrated: WeeklyReviewRecord = {
      created_at: state.weekly_review.created_at,
      answers: {
        noticed: state.weekly_review.answers.noticed,
        pressure: state.weekly_review.answers.pressure,
        helped: state.weekly_review.answers.helped,
        carryForward: state.weekly_review.answers.carry_forward,
      },
      generated: {
        headline: state.weekly_review.generated.headline,
        summary: state.weekly_review.generated.summary,
        whatChanged: state.weekly_review.generated.what_changed,
        whatHelped: state.weekly_review.generated.what_helped,
        carryForward: state.weekly_review.generated.carry_forward,
      },
    };
    storeWeeklyReview(userId, hydrated);
    return hydrated;
  } catch {
    return getStoredWeeklyReview(userId);
  }
}

export async function persistWeeklyReview(userId: number, review: WeeklyReviewRecord) {
  storeWeeklyReview(userId, review);
  try {
    await saveWeeklyReviewState(userId, review);
  } catch {
    // Keep the local review so the page still feels reliable if the network is unstable.
  }
}

export function buildWeeklyReview(entries: Entry[], answers: ReviewAnswers): WeeklyReviewRecord {
  const recentEntries = entries.slice(0, 7);
  const helpfulTexts = recentEntries
    .map((entry) => `${entry.content} ${entry.insight?.based_on_patterns || ""} ${entry.insight?.action_suggestion || ""}`.toLowerCase())
    .filter((text) => text.includes("help") || text.includes("plan") || text.includes("grounded") || text.includes("steadier"));
  const topTags = new Map<string, number>();
  recentEntries.forEach((entry) => {
    entry.tags.forEach((tag) => {
      topTags.set(tag, (topTags.get(tag) || 0) + 1);
    });
  });

  const repeatedThemes = [...topTags.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([tag]) => tag);

  const moods = recentEntries.map((entry) => entry.mood).filter((value): value is string => Boolean(value));
  const moodLead = moods[0] || "neutral";
  const headline =
    repeatedThemes[0]
      ? `This week, ${repeatedThemes[0]} stayed central while you searched for steadier ways to respond.`
      : `This week, you kept trying to understand what was shaping your energy and attention.`;

  const summary = [
    repeatedThemes[0]
      ? `Your entries kept circling back to ${repeatedThemes.join(" and ")}, which suggests those themes carried the most emotional weight.`
      : "Your reflections show a steady effort to understand what is driving your reactions.",
    answers.noticed
      ? `You also noticed: ${answers.noticed.trim()}`
      : "",
    answers.pressure
      ? `The strongest source of pressure sounded like ${answers.pressure.trim()}.`
      : moodLead
        ? `A ${moodLead} tone appeared often enough to shape how the week felt.`
        : "",
  ]
    .filter(Boolean)
    .join(" ");

  const whatChanged = answers.pressure && answers.helped
    ? `Even when ${answers.pressure.trim()} felt loud, you were also starting to notice that ${answers.helped.trim()}.`
    : repeatedThemes[0]
      ? `Compared with isolated reflections, the bigger picture suggests your week was not just about ${repeatedThemes[0]} itself, but about how you responded to it.`
      : "What changed most may be your ability to name patterns more clearly instead of only reacting in the moment.";

  const whatHelped = answers.helped
    ? `What seemed to help most was ${answers.helped.trim()}. This is worth treating like a repeatable support rather than a lucky exception.`
    : helpfulTexts.length
      ? "Your reflections suggest that structure, clarity, or smaller next steps helped you regain perspective."
      : "Even small moments of awareness seemed useful this week, which is often how steadier patterns begin.";

  const carryForward = answers.carryForward
    ? `Carry this forward next week: ${answers.carryForward.trim()}`
    : repeatedThemes[0]
      ? `Carry this forward next week: choose one action that supports your ongoing theme around ${repeatedThemes[0]}.`
      : "Carry this forward next week: keep noticing one draining moment and one grounding moment each day.";

  return {
    created_at: new Date().toISOString(),
    answers,
    generated: {
      headline,
      summary,
      whatChanged,
      whatHelped,
      carryForward,
    },
  };
}
