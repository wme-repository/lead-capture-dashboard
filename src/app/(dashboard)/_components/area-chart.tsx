"use client";

import { useState } from "react";

type Point = { label: string; value: number };

export default function AreaChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const w = 640;
  const h = 180;
  const padX = 8;
  const padTop = 16;
  const padBottom = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const step = n > 1 ? (w - padX * 2) / (n - 1) : 0;
  const yOf = (v: number) => padTop + (h - padTop - padBottom) * (1 - v / max);
  const xOf = (i: number) => padX + i * step;

  const pts = data.map((d, i) => [xOf(i), yOf(d.value)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${padX},${h - padBottom} ${line} ${(w - padX).toFixed(1)},${h - padBottom}`;

  const gridYs = [0, 0.5, 1].map((f) => padTop + (h - padTop - padBottom) * f);
  const tickEvery = Math.ceil(n / 7);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" className="overflow-visible">
        {gridYs.map((y, i) => (
          <line
            key={i}
            x1={padX}
            x2={w - padX}
            y1={y}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}
        <polygon points={area} fill="#2563eb" opacity={0.08} />
        <polyline
          points={line}
          fill="none"
          stroke="#1d4ed8"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hover !== null && (
          <line
            x1={xOf(hover)}
            x2={xOf(hover)}
            y1={padTop}
            y2={h - padBottom}
            stroke="#1d4ed8"
            strokeWidth={1}
            opacity={0.3}
          />
        )}
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={hover === i ? 4 : 0}
              fill="#1d4ed8"
              stroke="#fff"
              strokeWidth={2}
            />
            <rect
              x={xOf(i) - step / 2}
              y={0}
              width={Math.max(step, 12)}
              height={h - padBottom}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            {i % tickEvery === 0 && (
              <text x={x} y={h - 6} fontSize={10} fill="#9ca3af" textAnchor="middle">
                {data[i].label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow"
          style={{ left: `${(xOf(hover) / w) * 100}%`, top: `${(yOf(data[hover].value) / h) * 100}%` }}
        >
          {data[hover].label} · {data[hover].value}
        </div>
      )}
    </div>
  );
}
