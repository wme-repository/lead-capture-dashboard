"use client";

type StackItem = {
  label: string;
  segments: { key: string; value: number; color: string }[];
  total: number;
};
type Props = { data: StackItem[] };

export function StackedBars({ data }: Props) {
  const allKeys = new Map<string, string>();
  data.forEach((item) =>
    item.segments.forEach((s) => allKeys.set(s.key, s.color))
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {Array.from(allKeys.entries()).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-white">{key}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="text-gray-400 truncate shrink-0 text-right"
              style={{ width: 120 }}
            >
              {item.label}
            </span>
            <div className="flex-1 h-5 rounded bg-gray-800 overflow-hidden flex">
              {item.segments.map((seg, si) => {
                const w = item.total > 0 ? (seg.value / item.total) * 100 : 0;
                if (w === 0) return null;
                return (
                  <div
                    key={si}
                    title={`${seg.key}: ${seg.value}`}
                    style={{
                      width: `${w}%`,
                      backgroundColor: seg.color,
                      transition: "width 300ms",
                    }}
                    className="h-full"
                  />
                );
              })}
            </div>
            <span className="text-gray-200 font-medium shrink-0 w-10 text-right">
              {item.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
