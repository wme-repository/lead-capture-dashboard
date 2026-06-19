"use client";

import { useState } from "react";

type Segment = { label: string; value: number; color: string };
type Props = { data: Segment[]; size?: number; thickness?: number };

export function DonutChart({ data, size = 200, thickness = 32 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {data.map((seg, i) => {
            const pct = total > 0 ? seg.value / total : 0;
            const dash = pct * circ;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-currentOffset}
                opacity={hovered === null || hovered === i ? 1 : 0.4}
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: "opacity 150ms",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <span className="text-2xl font-bold text-gray-200">{total}</span>
          <span className="text-xs text-gray-400">total</span>
        </div>
        {hovered !== null && (
          <div
            className="absolute bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-10"
            style={{ top: 4, left: "50%", transform: "translateX(-50%)" }}
          >
            {data[hovered].label}: {data[hovered].value} (
            {total > 0 ? ((data[hovered].value / total) * 100).toFixed(1) : 0}%)
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {data.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-white">{seg.label}</span>
            <span className="text-gray-200 font-medium">{seg.value}</span>
            <span className="text-gray-300">
              ({total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
