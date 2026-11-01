"use client";

import { User } from "@/lib/types";

const STORAGE_KEY = "mirrormind-user";
const SESSION_STORAGE_KEY = "mirrormind-session-token";
const ONBOARDING_PREFIX = "mirrormind-onboarding";

export function getStoredUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function storeUser(user: User) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function getStoredSessionToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

export function storeSessionToken(token: string) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, token);
}

export function clearStoredUser() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function getOnboardingKey(userId: number) {
  return `${ONBOARDING_PREFIX}:${userId}`;
}

export function startOnboarding(userId: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getOnboardingKey(userId),
    JSON.stringify({
      startedAt: new Date().toISOString(),
      dismissed: false,
    })
  );
}

export function getOnboardingState(userId: number): { startedAt: string; dismissed: boolean } | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(getOnboardingKey(userId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as { startedAt: string; dismissed: boolean };
  } catch {
    return null;
  }
}

export function dismissOnboarding(userId: number) {
  if (typeof window === "undefined") {
    return;
  }

  const current = getOnboardingState(userId);
  if (!current) {
    return;
  }

  window.localStorage.setItem(
    getOnboardingKey(userId),
    JSON.stringify({
      ...current,
      dismissed: true,
    })
  );
}
