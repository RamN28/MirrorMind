const moods = ["all", "overwhelmed", "anxious", "uncertain", "neutral", "hopeful", "motivated", "calm", "grateful"];
const tags = ["all", "stress", "school", "relationships", "motivation", "goals", "habits", "future", "reflection"];
const focusOptions = [
  { value: "all", label: "All entries" },
  { value: "repeated-theme", label: "Repeated themes" },
  { value: "what-helped", label: "What helped" },
  { value: "future-pressure", label: "Future pressure" },
  { value: "supportive-shift", label: "Supportive shift" },
];

export function TagFilter({
  selectedMood,
  selectedTag,
  selectedFocus,
  onMoodChange,
  onTagChange,
  onFocusChange,
}: {
  selectedMood: string;
  selectedTag: string;
  selectedFocus: string;
  onMoodChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onFocusChange: (value: string) => void;
}) {
  return (
    <div className="glass-panel grid gap-4 p-5 md:grid-cols-3">
      <label className="space-y-2 text-sm text-mist">
        <span>Mood</span>
        <select
          value={selectedMood}
          onChange={(event) => onMoodChange(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
        >
          {moods.map((mood) => (
            <option key={mood} value={mood}>
              {mood}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm text-mist">
        <span>Tag</span>
        <select
          value={selectedTag}
          onChange={(event) => onTagChange(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
        >
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm text-mist">
        <span>Pattern focus</span>
        <select
          value={selectedFocus}
          onChange={(event) => onFocusChange(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-accent"
        >
          {focusOptions.map((focus) => (
            <option key={focus.value} value={focus.value}>
              {focus.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
