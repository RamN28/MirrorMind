import { Entry, PrivacySettings, WeeklyReviewRecord } from "@/lib/types";
import { fetchUserState, savePrivacyState } from "@/lib/api";
import { getStoredReminderSettings } from "@/lib/reminders";
import { getStoredWeeklyReview } from "@/lib/weekly-review";

const PRIVACY_STORAGE_PREFIX = "mirrormind-privacy";

const defaultPrivacySettings: PrivacySettings = {
  localOnlyMode: false,
  hideSensitivePreviews: false,
  exportFormat: "json",
};

function getStorageKey(userId: number) {
  return `${PRIVACY_STORAGE_PREFIX}:${userId}`;
}

export function getDefaultPrivacySettings() {
  return defaultPrivacySettings;
}

export function getStoredPrivacySettings(userId: number): PrivacySettings {
  if (typeof window === "undefined") {
    return defaultPrivacySettings;
  }

  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) {
    return defaultPrivacySettings;
  }

  try {
    return { ...defaultPrivacySettings, ...(JSON.parse(raw) as PrivacySettings) };
  } catch {
    return defaultPrivacySettings;
  }
}

export function storePrivacySettings(userId: number, settings: PrivacySettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(settings));
}

export async function hydratePrivacySettings(userId: number) {
  try {
    const state = await fetchUserState(userId);
    if (!state.privacy) {
      return getStoredPrivacySettings(userId);
    }
    const hydrated: PrivacySettings = {
      localOnlyMode: state.privacy.local_only_mode,
      hideSensitivePreviews: state.privacy.hide_sensitive_previews,
      exportFormat: state.privacy.export_format,
    };
    storePrivacySettings(userId, hydrated);
    return hydrated;
  } catch {
    return getStoredPrivacySettings(userId);
  }
}

export async function persistPrivacySettings(userId: number, settings: PrivacySettings) {
  storePrivacySettings(userId, settings);
  try {
    await savePrivacyState(userId, settings);
  } catch {
    // Fall back to the local copy if the backend is unavailable.
  }
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildMarkdownExport(entries: Entry[], weeklyReview: WeeklyReviewRecord | null) {
  const sections = [
    "# MirrorMind Export",
    "",
    `Exported: ${new Date().toISOString()}`,
    "",
    "## Journal Entries",
    "",
  ];

  entries.forEach((entry) => {
    sections.push(`### ${new Date(entry.created_at).toLocaleString()}`);
    sections.push(`Mood: ${entry.mood || "not set"}`);
    sections.push(`Tags: ${entry.tags.join(", ") || "none"}`);
    sections.push("");
    sections.push(entry.content);
    sections.push("");
    if (entry.insight) {
      sections.push(`Summary: ${entry.insight.summary}`);
      if (entry.insight.based_on_patterns) {
        sections.push(`Based on patterns: ${entry.insight.based_on_patterns}`);
      }
      sections.push(`Emotional pattern: ${entry.insight.emotional_patterns}`);
      sections.push(`Recurring concern: ${entry.insight.recurring_concerns}`);
      sections.push(`Action suggestion: ${entry.insight.action_suggestion}`);
      sections.push("");
    }
  });

  if (weeklyReview) {
    sections.push("## Weekly Review");
    sections.push("");
    sections.push(`Headline: ${weeklyReview.generated.headline}`);
    sections.push(weeklyReview.generated.summary);
    sections.push("");
    sections.push(`What changed: ${weeklyReview.generated.whatChanged}`);
    sections.push(`What helped: ${weeklyReview.generated.whatHelped}`);
    sections.push(`Carry forward: ${weeklyReview.generated.carryForward}`);
    sections.push("");
  }

  return sections.join("\n");
}

export function exportUserData(userId: number, entries: Entry[], format: PrivacySettings["exportFormat"]) {
  const weeklyReview = getStoredWeeklyReview(userId);
  const reminderSettings = getStoredReminderSettings(userId);
  const privacySettings = getStoredPrivacySettings(userId);
  const payload = {
    exported_at: new Date().toISOString(),
    entries,
    weekly_review: weeklyReview,
    reminder_settings: reminderSettings,
    privacy_settings: privacySettings,
  };

  if (format === "markdown") {
    downloadFile("mirrormind-export.md", buildMarkdownExport(entries, weeklyReview), "text/markdown");
    return;
  }

  downloadFile("mirrormind-export.json", JSON.stringify(payload, null, 2), "application/json");
}
