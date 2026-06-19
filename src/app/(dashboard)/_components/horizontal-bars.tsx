"use client";

type Bar = {
  label: string;
  value: number;
  pct: number;
  avgScore?: number | null;
  topGrade?: string | null;
  color?: string;
};
type Props = { data: Bar[]; maxBars?: number };

export function HorizontalBars({ data, maxBars = 10 }: Props) {
  const visible = data.slice(0, maxBars);
  const maxVal = Math.max(...visible.map((b) => b.value), 1);

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((bar, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="text-white truncate shrink-0 text-right"
            style={{ width: 120 }}
          >
            {bar.label}
          </span>
          <div className="flex-1 h-5 rounded bg-gray-800 relative overflow-hidden">
            <div
              className="h-full rounded"
              style={{
                width: `${(bar.value / maxVal) * 100}%`,
                background: bar.color ?? `linear-gradient(90deg, #3b82f6, #60a5fa)`,
                transition: "width 300ms",
              }}
            />
          </div>
          <span className="text-gray-200 font-medium shrink-0 w-10 text-right">
            {bar.value}
          </span>
          <span className="text-gray-400 shrink-0 w-12 text-right">
            {bar.pct.toFixed(1)}%
          </span>
          {bar.avgScore != null && (
            <span className="shrink-0 bg-blue-900/50 text-blue-300 rounded px-1.5 py-0.5 text-[10px] font-medium">
              {bar.avgScore.toFixed(1)}
            </span>
          )}
          {bar.topGrade && (
            <span className="shrink-0 bg-emerald-900/50 text-emerald-300 rounded px-1.5 py-0.5 text-[10px] font-medium">
              {bar.topGrade}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
