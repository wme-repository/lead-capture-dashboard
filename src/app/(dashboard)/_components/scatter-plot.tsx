"use client";

import { useState } from "react";

type Point = {
  label: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
  recommendation?: string;
};
type Props = {
  data: Point[];
  xLabel?: string;
  yLabel?: string;
};

export function ScatterPlot({
  data,
  xLabel = "Volume (leads)",
  yLabel = "Qualidade (score)",
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) return null;

  const vw = 500;
  const vh = 350;
  const padL = 50;
  const padR = 20;
  const padT = 24;
  const padB = 40;
  const cw = vw - padL - padR;
  const ch = vh - padT - padB;

  const xs = data.map((p) => p.x);
  const ys = data.map((p) => p.y);
  const minX = 0;
  const maxX = Math.max(...xs, 1) * 1.1;
  const minY = 0;
  const maxY = Math.max(...ys, 1) * 1.1;

  const sortedX = [...xs].sort((a, b) => a - b);
  const sortedY = [...ys].sort((a, b) => a - b);
  const medX = sortedX[Math.floor(sortedX.length / 2)] ?? maxX / 2;
  const medY = sortedY[Math.floor(sortedY.length / 2)] ?? maxY / 2;

  function sx(v: number) {
    return padL + ((v - minX) / (maxX - minX)) * cw;
  }
  function sy(v: number) {
    return padT + ch - ((v - minY) / (maxY - minY)) * ch;
  }

  const quadrants = [
    { label: "Pausar", x: padL + 4, y: padT + ch - 4, anchor: "start" as const },
    { label: "Testar", x: padL + 4, y: padT + 14, anchor: "start" as const },
    { label: "Otimizar", x: vw - padR - 4, y: padT + ch - 4, anchor: "end" as const },
    { label: "Escalar", x: vw - padR - 4, y: padT + 14, anchor: "end" as const },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" style={{ minWidth: 320 }}>
        <line
          x1={sx(medX)}
          x2={sx(medX)}
          y1={padT}
          y2={padT + ch}
          stroke="currentColor"
          className="text-gray-700"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <line
          x1={padL}
          x2={padL + cw}
          y1={sy(medY)}
          y2={sy(medY)}
          stroke="currentColor"
          className="text-gray-700"
          strokeDasharray="4 4"
          strokeWidth={1}
        />

        {quadrants.map((q) => (
          <text
            key={q.label}
            x={q.x}
            y={q.y}
            textAnchor={q.anchor}
            fill="#8b949e"
            style={{ fontSize: 11, fontWeight: 500 }}
          >
            {q.label}
          </text>
        ))}

        <text
          x={padL + cw / 2}
          y={vh - 6}
          textAnchor="middle"
          fill="#c9d1d9"
          style={{ fontSize: 10 }}
        >
          {xLabel}
        </text>
        <text
          x={12}
          y={padT + ch / 2}
          textAnchor="middle"
          fill="#c9d1d9"
          style={{ fontSize: 10 }}
          transform={`rotate(-90, 12, ${padT + ch / 2})`}
        >
          {yLabel}
        </text>

        {data.map((p, i) => {
          const px = sx(p.x);
          const py = sy(p.y);
          const r = Math.max(6, Math.min(20, p.size ?? 8));
          return (
            <g key={i}>
              <circle
                cx={px}
                cy={py}
                r={r}
                fill={p.color ?? "#3b82f6"}
                opacity={hovered === null || hovered === i ? 0.8 : 0.3}
                stroke={hovered === i ? "white" : "none"}
                strokeWidth={2}
                style={{ transition: "opacity 150ms", cursor: "pointer" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          );
        })}

        {hovered !== null && (() => {
          const p = data[hovered];
          const px = sx(p.x);
          const py = sy(p.y);
          const lines = [p.label, `${xLabel}: ${p.x}`, `${yLabel}: ${p.y.toFixed(1)}`];
          if (p.recommendation) lines.push(p.recommendation);
          const tw = Math.max(...lines.map((l) => l.length)) * 6 + 16;
          const th = lines.length * 14 + 10;
          const tx = Math.min(Math.max(px - tw / 2, 4), vw - tw - 4);
          const ty = py - (p.size ?? 8) - th - 6;
          return (
            <g className="pointer-events-none">
              <rect x={tx} y={ty} width={tw} height={th} rx={4} fill="#111827" opacity={0.95} />
              {lines.map((l, li) => (
                <text
                  key={li}
                  x={tx + 8}
                  y={ty + 14 + li * 14}
                  fill={li === 0 ? "white" : "#d1d5db"}
                  style={{ fontSize: li === 0 ? 11 : 10, fontWeight: li === 0 ? 600 : 400 }}
                >
                  {l}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
