import { PatternItem } from "@/lib/types";

export function InsightCard({ item }: { item: PatternItem }) {
  return (
    <div className="glass-panel p-5">
      <p className="text-sm font-medium text-white">{item.title}</p>
      <p className="mt-3 text-sm leading-6 text-mist">{item.description}</p>
    </div>
  );
}
