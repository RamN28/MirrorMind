"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { login, signup } from "@/lib/api";
import { startOnboarding, storeSessionToken, storeUser } from "@/lib/auth";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("demo@mirrormind.app");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function getFriendlyAuthError(authError: Error | unknown) {
    const message = authError instanceof Error ? authError.message : "";

    if (mode === "signin" && message === "Invalid email or password.") {
      return "No account matched that email and password. Try Create account if you're new to MirrorMind.";
    }

    return message || (mode === "signin" ? "Unable to sign in." : "Unable to create account.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsLoading(true);
      setError("");
      const response =
        mode === "signin" ? await login(email, password) : await signup(name, email, password);
      storeUser(response.user);
      storeSessionToken(response.session_token);
      if (mode === "signup") {
        startOnboarding(response.user.id);
      }
      router.push("/dashboard");
    } catch (signInError) {
      setError(getFriendlyAuthError(signInError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 md:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <p className="pill inline-flex">Real account access</p>
          <h1 className="text-5xl font-semibold leading-tight text-white">
            Sign in or create an account to keep your reflections personal.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-mist">
            MirrorMind now supports real account creation for the live app. You can still use the demo account, or make
            your own and keep a separate reflection history.
          </p>
          <div className="glass-panel p-5 text-sm leading-7 text-mist">
            Demo account: <span className="text-white">demo@mirrormind.app</span> /{" "}
            <span className="text-white">demo123</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel space-y-5 p-6">
          <div>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-full px-4 py-2 text-sm ${mode === "signin" ? "bg-accent text-slate-950" : "border border-white/10 text-mist"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setEmail("");
                  setPassword("");
                }}
                className={`rounded-full px-4 py-2 text-sm ${mode === "signup" ? "bg-accent text-slate-950" : "border border-white/10 text-mist"}`}
              >
                Create account
              </button>
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-mist">
              {mode === "signin"
                ? "Use your account or the demo credentials to enter MirrorMind."
                : "Your account will keep a separate reflection history for you."}
            </p>
          </div>

          {mode === "signup" ? (
            <label className="block space-y-2 text-sm text-mist">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
              />
            </label>
          ) : null}

          <label className="block space-y-2 text-sm text-mist">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
            />
          </label>

          <label className="block space-y-2 text-sm text-mist">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
            />
          </label>

          {mode === "signup" ? (
            <p className="text-xs leading-6 text-mist">Use at least 8 characters for your password.</p>
          ) : null}

          {error ? <p className="text-sm text-peach">{error}</p> : null}

          {mode === "signin" && error ? (
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setPassword("");
              }}
              className="text-left text-sm text-accent transition hover:brightness-110"
            >
              New here? Create your account instead.
            </button>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110 disabled:opacity-60"
          >
            {isLoading
              ? mode === "signin"
                ? "Signing in..."
                : "Creating account..."
              : mode === "signin"
                ? "Enter MirrorMind"
                : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
