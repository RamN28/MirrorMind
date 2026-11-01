"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { fetchCurrentUser } from "@/lib/api";
import { clearStoredUser, getStoredUser, storeUser } from "@/lib/auth";
import {
  getDefaultReminderSettings,
  hydrateReminderSettings,
  requestReminderNotificationPermission,
  sendReminderNotification,
  persistReminderSettings,
} from "@/lib/reminders";
import { ReminderSettings } from "@/lib/types";

export default function RemindersPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<ReminderSettings>(getDefaultReminderSettings());
  const [savedMessage, setSavedMessage] = useState("");
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
        return hydrateReminderSettings(validatedUser.id);
      })
      .then((hydrated) => {
        setSettings(hydrated);
      })
      .catch((loadError) => {
        clearStoredUser();
        setError(loadError instanceof Error ? loadError.message : "Could not load reminders.");
        router.push("/signin");
      });
  }, [router]);

  const cadenceLabel = useMemo(() => {
    return settings.cadence === "daily" ? "Every day" : "Weekdays";
  }, [settings.cadence]);

  function updateSettings(next: ReminderSettings) {
    const user = getStoredUser();
    if (!user) {
      router.push("/signin");
      return;
    }

    setSettings(next);
    void persistReminderSettings(user.id, next);
    setSavedMessage("Reminder saved.");
    setTimeout(() => setSavedMessage(""), 1800);
  }

  async function enableNotifications() {
    const granted = await requestReminderNotificationPermission();
    if (!granted) {
      setError("Browser notifications were not allowed. You can still use in-app reminders.");
      return;
    }

    setError("");
    updateSettings({
      ...settings,
      notificationsEnabled: true,
    });
  }

  function sendTestReminder() {
    const sent = sendReminderNotification(settings);
    if (!sent) {
      setError("Notifications are not enabled in this browser yet.");
      return;
    }

    setError("");
    setSavedMessage("Test reminder sent.");
    setTimeout(() => setSavedMessage(""), 1800);
  }

  return (
    <AppShell
      title="Reflection reminders"
      subtitle="Set a calm journaling rhythm so MirrorMind becomes something you actually return to, not just something that looks good in one session."
    >
      {error ? <div className="glass-panel p-5 text-sm text-peach">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel space-y-6 p-6">
          <div>
            <p className="pill inline-flex">Reminder setup</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Choose a reflection rhythm that feels sustainable</h3>
            <p className="mt-3 text-sm leading-7 text-mist">
              Gentle consistency is more useful than intensity. Pick a time you’re likely to have a few clear minutes.
            </p>
          </div>

          <label className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-950/30 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-white">Enable reminders</p>
              <p className="mt-1 text-sm leading-6 text-mist">MirrorMind can nudge you back toward reflection at the same time each day.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ ...settings, enabled: !settings.enabled })}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                settings.enabled ? "bg-accent text-slate-950" : "border border-white/10 bg-white/5 text-mist"
              }`}
            >
              {settings.enabled ? "On" : "Off"}
            </button>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-mist">
              <span>Reminder time</span>
              <input
                type="time"
                value={settings.time}
                onChange={(event) => updateSettings({ ...settings, time: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
              />
            </label>
            <label className="space-y-2 text-sm text-mist">
              <span>Cadence</span>
              <select
                value={settings.cadence}
                onChange={(event) =>
                  updateSettings({ ...settings, cadence: event.target.value as ReminderSettings["cadence"] })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
              >
                <option value="daily">Every day</option>
                <option value="weekdays">Weekdays</option>
              </select>
            </label>
          </div>

          <label className="block space-y-2 text-sm text-mist">
            <span>Reminder message</span>
            <textarea
              rows={4}
              value={settings.message}
              onChange={(event) => setSettings((current) => ({ ...current, message: event.target.value }))}
              onBlur={() => updateSettings(settings)}
              className="w-full rounded-3xl border border-white/10 bg-slate-950/40 px-5 py-4 text-white outline-none transition focus:border-accent"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={enableNotifications}
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110"
            >
              Enable browser notifications
            </button>
            <button
              type="button"
              onClick={sendTestReminder}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Send test reminder
            </button>
          </div>

          {savedMessage ? <p className="text-sm text-emerald-200">{savedMessage}</p> : null}
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-blue">Current rhythm</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">
              {settings.enabled ? `${cadenceLabel} at ${settings.time}` : "Reminders are currently off"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-mist">
              {settings.enabled
                ? "Use this as a low-pressure cue to check in, not a rule you have to perfectly obey."
                : "Turn reminders on when you want MirrorMind to gently support a consistent reflection habit."}
            </p>
          </div>

          <div className="glass-panel p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Reminder preview</p>
            <p className="mt-4 text-sm leading-7 text-mist">{settings.message}</p>
          </div>

          <div className="glass-panel p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">Why this matters</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-mist">
              <p>Reflection habits are easier to keep when the cue is gentle, predictable, and easy to act on.</p>
              <p>Reminders work best when they bring you back to noticing, not when they add more pressure.</p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
