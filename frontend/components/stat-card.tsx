export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="glass-panel p-5">
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-3 text-sm leading-6 text-mist">{note}</p>
    </div>
  );
}
