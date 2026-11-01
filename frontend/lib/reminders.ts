import { ReminderSettings } from "@/lib/types";
import { fetchUserState, saveReminderState } from "@/lib/api";

const REMINDER_STORAGE_PREFIX = "mirrormind-reminders";

const defaultReminderSettings: ReminderSettings = {
  enabled: false,
  time: "20:00",
  cadence: "daily",
  message: "Take five quiet minutes to notice what felt heavy, what helped, and what you want to carry forward.",
  lastTriggeredAt: null,
  notificationsEnabled: false,
};

function getStorageKey(userId: number) {
  return `${REMINDER_STORAGE_PREFIX}:${userId}`;
}

export function getDefaultReminderSettings() {
  return defaultReminderSettings;
}

export function getStoredReminderSettings(userId: number): ReminderSettings {
  if (typeof window === "undefined") {
    return defaultReminderSettings;
  }

  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) {
    return defaultReminderSettings;
  }

  try {
    return { ...defaultReminderSettings, ...(JSON.parse(raw) as ReminderSettings) };
  } catch {
    return defaultReminderSettings;
  }
}

export function storeReminderSettings(userId: number, settings: ReminderSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(settings));
}

export async function hydrateReminderSettings(userId: number) {
  try {
    const state = await fetchUserState(userId);
    if (!state.reminders) {
      return getStoredReminderSettings(userId);
    }
    const hydrated: ReminderSettings = {
      enabled: state.reminders.enabled,
      time: state.reminders.time,
      cadence: state.reminders.cadence,
      message: state.reminders.message,
      lastTriggeredAt: state.reminders.last_triggered_at,
      notificationsEnabled: state.reminders.notifications_enabled,
    };
    storeReminderSettings(userId, hydrated);
    return hydrated;
  } catch {
    return getStoredReminderSettings(userId);
  }
}

export async function persistReminderSettings(userId: number, settings: ReminderSettings) {
  storeReminderSettings(userId, settings);
  try {
    await saveReminderState(userId, settings);
  } catch {
    // Keep the local save so reminders still work even if the backend is temporarily unavailable.
  }
}

export function isReminderDue(settings: ReminderSettings, now = new Date()) {
  if (!settings.enabled) {
    return false;
  }

  if (settings.cadence === "weekdays" && (now.getDay() === 0 || now.getDay() === 6)) {
    return false;
  }

  const [hours, minutes] = settings.time.split(":").map(Number);
  const dueDate = new Date(now);
  dueDate.setHours(hours, minutes, 0, 0);

  if (now < dueDate) {
    return false;
  }

  if (!settings.lastTriggeredAt) {
    return true;
  }

  const lastTriggered = new Date(settings.lastTriggeredAt);
  return lastTriggered.toDateString() !== now.toDateString();
}

export async function requestReminderNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function sendReminderNotification(settings: ReminderSettings) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  new Notification("MirrorMind reflection reminder", {
    body: settings.message,
  });
  return true;
}
