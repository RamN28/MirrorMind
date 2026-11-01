import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 md:px-6">
      <header className="flex items-center justify-between py-4">
        <div className="pill">MirrorMind</div>
        <div className="flex gap-3">
          <Link href="/signin" className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist">
            Sign in
          </Link>
          <Link href="/signin" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-slate-950">
            Start journaling
          </Link>
        </div>
      </header>

      <section className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="pill inline-flex">AI self-awareness coach</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-tight text-white md:text-7xl">
            Turn messy thoughts into patterns you can actually understand.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-mist">
            MirrorMind is not a generic chatbot. It is a reflection product for students and young adults who want more
            clarity about stress, habits, motivation, relationships, and the emotional loops they keep coming back to.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink/85">
            Write one honest reflection, get a grounded AI response, and watch your repeated themes, mood shifts, and
            helpful patterns become easier to notice over time.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signin" className="rounded-full bg-accent px-6 py-3 font-medium text-slate-950">
              Start your first entry
            </Link>
            <a href="#product" className="rounded-full border border-white/10 px-6 py-3 text-mist">
              See how it works
            </a>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                label: "Why it matters",
                body: "Most people can describe what happened. Far fewer can see the pattern behind why it keeps happening.",
              },
              {
                label: "What MirrorMind does",
                body: "It connects entries across time so you can notice recurring pressure points, emotional shifts, and what actually helps.",
              },
              {
                label: "What makes it different",
                body: "It feels like a self-awareness product, not a chat window. The goal is reflection, pattern recognition, and growth.",
              },
            ].map((item) => (
              <div key={item.label} className="glass-panel p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-accent">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-mist">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel relative overflow-hidden p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,182,160,0.18),transparent_28%)]" />
          <div className="relative space-y-5">
            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-mist">Today&apos;s reflection</p>
                <span className="pill">motivated</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-ink">
                I felt calmer after planning the week. When I zoomed out and remembered what I&apos;m working toward,
                the pressure felt more manageable.
              </p>
            </div>
            <div className="rounded-3xl border border-accent/20 bg-accent/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-accent">Mirror insight</p>
              <p className="mt-3 text-sm leading-7 text-ink">
                You seem to regain energy when your daily tasks connect to a larger goal. Planning may be less about
                control and more about restoring perspective.
              </p>
              <p className="mt-4 text-sm text-mist">
                Follow-up: What kind of structure helps you feel guided without feeling trapped?
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-blue">Repeated pattern</p>
                <p className="mt-3 text-sm leading-6 text-mist">
                  Long-term goals appear often when motivation rises.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-peach">What changed</p>
                <p className="mt-3 text-sm leading-6 text-mist">
                  Stress is still present, but it is sounding less all-consuming this week.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="grid gap-6 py-8 md:grid-cols-3">
        {[
          {
            title: "Journal with context",
            body: "Capture mood, tags, and a raw reflection without friction.",
          },
          {
            title: "Get grounded AI insight",
            body: "Receive a summary, careful pattern notes, follow-up questions, and one practical next step.",
          },
          {
            title: "Track what changes",
            body: "Review history, compare recent weeks, and spot emotional or behavioral trends over time.",
          },
        ].map((item) => (
          <div key={item.title} className="glass-panel p-6">
            <h2 className="text-xl font-semibold text-white">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-mist">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-blue">Two-minute demo</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">The value is obvious fast.</h2>
          <div className="mt-5 space-y-3 text-sm leading-7 text-mist">
            <p>1. Write a reflection about school stress, motivation, or relationships.</p>
            <p>2. Get an AI response with a summary, careful pattern notes, and follow-up questions.</p>
            <p>3. Open the dashboard to see what changed, what keeps repeating, and what seems to help.</p>
          </div>
        </div>
        <div className="glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-peach">Built for usefulness</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              "Grounded tone without pretending to be therapy or diagnosis.",
              "History, weekly review, and reminders support a real habit loop.",
              "Patterns are explained in plain language instead of abstract analytics.",
              "Users can understand not just what feels hard, but what reliably helps.",
            ].map((point) => (
              <div key={point} className="rounded-2xl border border-white/10 bg-slate-950/25 p-4 text-sm leading-6 text-mist">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
