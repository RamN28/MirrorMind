"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, BookOpenText, BrainCircuit, CalendarCheck2, LayoutDashboard, LogOut, PenSquare, ShieldCheck } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { clearStoredUser } from "@/lib/auth";

const navItems: Array<{ href: Route; label: string; icon: typeof LayoutDashboard }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new-entry", label: "New Entry", icon: PenSquare },
  { href: "/weekly-review", label: "Weekly Review", icon: CalendarCheck2 },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/settings", label: "Settings", icon: ShieldCheck },
  { href: "/history", label: "History", icon: BookOpenText },
  { href: "/insights", label: "Insights", icon: BrainCircuit },
];

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 md:px-6">
      <aside className="glass-panel hidden w-72 shrink-0 flex-col justify-between p-6 lg:flex">
        <div className="space-y-8">
          <div>
            <div className="pill mb-4 inline-flex">MirrorMind MVP</div>
            <h1 className="text-2xl font-semibold text-white">MirrorMind</h1>
            <p className="mt-2 text-sm leading-6 text-mist">
              A self-awareness coach for noticing emotions, thought loops, and what changes over time.
            </p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                    pathname === item.href
                      ? "bg-white/12 text-white"
                      : "text-mist hover:bg-white/8 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          type="button"
          onClick={() => {
            clearStoredUser();
            router.push("/signin");
          }}
          className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-mist transition hover:border-white/20 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      <main className="flex-1 space-y-6">
        <header className="glass-panel p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="pill mb-3 inline-flex">Reflective dashboard</p>
              <h2 className="text-3xl font-semibold text-white">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">{subtitle}</p>
            </div>
            <Link
              href="/new-entry"
              className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110"
            >
              Write a reflection
            </Link>
          </div>
          <nav className="mt-5 flex flex-wrap gap-2 lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition",
                  pathname === item.href ? "bg-white/12 text-white" : "border border-white/10 text-mist"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </main>
    </div>
  );
}
