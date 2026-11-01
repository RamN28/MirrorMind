import { Entry } from "@/lib/types";

export function JournalCard({
  entry,
  expanded = false,
  hidePreview = false,
}: {
  entry: Entry;
  expanded?: boolean;
  hidePreview?: boolean;
}) {
  const previewText = hidePreview && !expanded
    ? "Sensitive preview hidden. Open this reflection when you want to read the details."
    : `${entry.content.slice(0, 180)}${entry.content.length > 180 ? "..." : ""}`;

  return (
    <article className="glass-panel p-5">
      <div className="flex flex-wrap items-center gap-3">
        {entry.mood ? <span className="pill">{entry.mood}</span> : null}
        {entry.tags.map((tag) => (
          <span key={tag} className="pill">
            {tag}
          </span>
        ))}
        <span className="text-xs text-mist">{new Date(entry.created_at).toLocaleString()}</span>
      </div>
      <p className="mt-4 text-sm leading-7 text-ink/95">{expanded ? entry.content : previewText}</p>

      {entry.insight ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Mirror response</p>
          {entry.insight.based_on_patterns ? (
            <div className="mt-3 rounded-2xl border border-blue/20 bg-blue/5 p-3">
              <span className="block text-[11px] uppercase tracking-[0.25em] text-blue/80">Based on your recent patterns</span>
              <p className="mt-2 text-sm leading-6 text-ink">
                {hidePreview && !expanded
                  ? "Pattern preview hidden. Open this reflection to view it."
                  : entry.insight.based_on_patterns}
              </p>
            </div>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-ink">
            {hidePreview && !expanded ? "Reflection summary hidden in preview mode." : entry.insight.summary}
          </p>
          {expanded ? (
            <div className="mt-4 space-y-3 text-sm leading-6 text-mist">
              <p>
                <span className="text-white">Emotional pattern:</span> {entry.insight.emotional_patterns}
              </p>
              <p>
                <span className="text-white">Recurring concern:</span> {entry.insight.recurring_concerns}
              </p>
              <p>
                <span className="text-white">Action suggestion:</span> {entry.insight.action_suggestion}
              </p>
              <div>
                <span className="text-white">Follow-up questions:</span>
                <ul className="mt-2 space-y-2">
                  {entry.insight.follow_up_questions.map((question) => (
                    <li key={question}>- {question}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-mist/80">{entry.insight.disclaimer}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
