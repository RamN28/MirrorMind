"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { fetchCurrentUser, fetchEntries } from "@/lib/api";
import { clearStoredUser, getStoredUser, storeUser } from "@/lib/auth";
import { exportUserData, getDefaultPrivacySettings, hydratePrivacySettings, persistPrivacySettings } from "@/lib/privacy";
import { Entry, PrivacySettings } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<PrivacySettings>(getDefaultPrivacySettings());
  const [status, setStatus] = useState("");
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
        return Promise.all([hydratePrivacySettings(validatedUser.id), fetchEntries(validatedUser.id)]);
      })
      .then(([privacySettings, response]) => {
        setSettings(privacySettings);
        setEntries(response.entries);
      })
      .catch((loadError) => {
        clearStoredUser();
        setError(loadError instanceof Error ? loadError.message : "Could not load settings data.");
        router.push("/signin");
      });
  }, [router]);

  function persistSettings(next: PrivacySettings) {
    const user = getStoredUser();
    if (!user) {
      router.push("/signin");
      return;
    }

    setSettings(next);
    void persistPrivacySettings(user.id, next);
    setStatus("Settings saved.");
    setTimeout(() => setStatus(""), 1600);
  }

  function handleExport() {
    const user = getStoredUser();
    if (!user) {
      router.push("/signin");
      return;
    }

    exportUserData(user.id, entries, settings.exportFormat);
    setStatus(`Exported your MirrorMind data as ${settings.exportFormat.toUpperCase()}.`);
    setTimeout(() => setStatus(""), 2200);
  }

  return (
    <AppShell
      title="Privacy and settings"
      subtitle="Make it easier to trust the app with real thoughts by seeing what is stored, controlling how it appears, and exporting it whenever you want."
    >
      {error ? <div className="glass-panel p-5 text-sm text-peach">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <p className="pill inline-flex">Privacy approach</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Clear controls matter as much as good insights</h3>
            <div className="mt-4 space-y-3 text-sm leading-7 text-mist">
              <p>MirrorMind stores your reflection history so patterns can build over time.</p>
              <p>Some settings, reminders, and weekly reviews are currently stored in your browser for this MVP.</p>
              <p>You can export your entries at any point, which makes the product feel less like a black box.</p>
            </div>
          </div>

          <div className="glass-panel space-y-5 p-6">
            <div className="rounded-3xl border border-white/10 bg-slate-950/30 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Local-only mode preference</p>
                  <p className="mt-1 text-sm leading-6 text-mist">
                    Marks your preference to keep reflections primarily browser-based where possible in this MVP experience.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => persistSettings({ ...settings, localOnlyMode: !settings.localOnlyMode })}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    settings.localOnlyMode ? "bg-accent text-slate-950" : "border border-white/10 bg-white/5 text-mist"
                  }`}
                >
                  {settings.localOnlyMode ? "On" : "Off"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/30 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Hide sensitive previews</p>
                  <p className="mt-1 text-sm leading-6 text-mist">
                    Reduces how much reflection text is shown in preview-style surfaces. This prepares the app for a more private default experience.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => persistSettings({ ...settings, hideSensitivePreviews: !settings.hideSensitivePreviews })}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    settings.hideSensitivePreviews ? "bg-accent text-slate-950" : "border border-white/10 bg-white/5 text-mist"
                  }`}
                >
                  {settings.hideSensitivePreviews ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-blue">Data export</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Take your reflections with you</h3>
            <p className="mt-3 text-sm leading-7 text-mist">
              Export entries, weekly reviews, and reminder/settings data whenever you want. This helps the product feel safer to invest in over time.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <label className="space-y-2 text-sm text-mist">
                <span>Export format</span>
                <select
                  value={settings.exportFormat}
                  onChange={(event) =>
                    persistSettings({ ...settings, exportFormat: event.target.value as PrivacySettings["exportFormat"] })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
                >
                  <option value="json">JSON</option>
                  <option value="markdown">Markdown</option>
                </select>
              </label>
              <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4 text-sm leading-6 text-mist">
                <p>
                  <span className="text-white">Included:</span> entries, AI reflections, weekly review, reminders, and privacy settings.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110"
              >
                Export my data
              </button>
            </div>
            {status ? <p className="mt-4 text-sm text-emerald-200">{status}</p> : null}
          </div>

          <div className="glass-panel p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">Trust notes</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-mist">
              <p>This app is still an MVP, so privacy controls are intentionally straightforward and visible.</p>
              <p>The strongest long-term version of MirrorMind would pair these controls with durable encryption, stronger auth, and more granular sharing/export options.</p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
