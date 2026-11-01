"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EntryForm } from "@/components/entry-form";
import { fetchCurrentUser } from "@/lib/api";
import { clearStoredUser, getOnboardingState, getStoredUser, storeUser } from "@/lib/auth";

export default function NewEntryPage() {
  const router = useRouter();
  const user = getStoredUser();
  const onboardingActive = user ? Boolean(getOnboardingState(user.id) && !getOnboardingState(user.id)?.dismissed) : false;

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.push("/signin");
      return;
    }

    fetchCurrentUser()
      .then(({ user }) => {
        storeUser(user);
      })
      .catch(() => {
        clearStoredUser();
        router.push("/signin");
      });
  }, [router]);

  return (
    <AppShell
      title="New journal entry"
      subtitle="Capture what happened, what it brought up, and the themes you want MirrorMind to track over time."
    >
      {onboardingActive ? (
        <section className="rounded-3xl border border-blue/20 bg-blue/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-blue">First reflection guide</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-ink">
              Pick a guided prompt if you want an easier starting point. After you save, stay on the page and read the pattern note before heading back to the dashboard.
            </p>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-mist transition hover:bg-white/5"
            >
              Back to dashboard
            </Link>
          </div>
        </section>
      ) : null}
      <EntryForm />
    </AppShell>
  );
}
