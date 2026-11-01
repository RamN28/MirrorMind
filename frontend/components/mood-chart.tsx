export function MoodChart({ points }: { points: { date: string; score: number }[] }) {
  if (!points.length) {
    return (
      <div className="glass-panel flex h-72 items-center justify-center p-6 text-sm text-mist">
        Add a few entries to see your mood trend over time.
      </div>
    );
  }

  const width = 580;
  const height = 220;
  const padding = 24;
  const maxScore = 10;
  const minScore = 0;
  const stepX = (width - padding * 2) / Math.max(points.length - 1, 1);

  const coordinates = points.map((point, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((point.score - minScore) / (maxScore - minScore)) * (height - padding * 2);
    return { ...point, x, y };
  });

  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Mood trend</p>
          <p className="mt-1 text-sm text-mist">A simple score view to make changes visible at a glance.</p>
        </div>
        <div className="pill">Last {points.length} entries</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        <defs>
          <linearGradient id="line" x1="0" x2="1">
            <stop offset="0%" stopColor="#74E0B8" />
            <stop offset="100%" stopColor="#73B8FF" />
          </linearGradient>
        </defs>
        {[0, 2.5, 5, 7.5, 10].map((tick) => {
          const y = height - padding - (tick / 10) * (height - padding * 2);
          return (
            <g key={tick}>
              <line x1={padding} x2={width - padding} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
              <text x={4} y={y + 4} fill="#9BA9C8" fontSize="12">
                {tick}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="url(#line)" strokeWidth="3" strokeLinecap="round" />
        {coordinates.map((point) => (
          <g key={`${point.date}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="#08111f" stroke="#74E0B8" strokeWidth="2" />
            <text x={point.x} y={height - 4} fill="#9BA9C8" fontSize="11" textAnchor="middle">
              {point.date}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
