"use client";

import { useState } from "react";

type DataPoint = {
  label: string;
  bar: number;
  lines?: Record<string, number>;
};
type LineConfig = { key: string; color: string; label: string };
type Props = {
  data: DataPoint[];
  barColor?: string;
  lines?: LineConfig[];
  barLabel?: string;
  height?: number;
};

export function ComboChart({
  data,
  barColor = "#3b82f6",
  lines = [],
  barLabel = "Valor",
  height = 280,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) return null;

  const padL = 48;
  const padR = lines.length > 0 ? 48 : 16;
  const padT = 16;
  const padB = 40;
  const vw = Math.max(600, data.length * 40 + padL + padR);
  const chartW = vw - padL - padR;
  const chartH = height - padT - padB;

  const maxBar = Math.max(...data.map((d) => d.bar), 1);

  const allLineVals = lines.flatMap((l) =>
    data.map((d) => d.lines?.[l.key] ?? 0)
  );
  const maxLine = allLineVals.length > 0 ? Math.max(...allLineVals, 1) : 1;

  const barW = Math.max(8, (chartW / data.length) * 0.6);
  const gap = chartW / data.length;

  const labelStep = Math.max(1, Math.ceil(data.length / 12));

  const gridLines = 5;

  function linePoints(key: string) {
    return data
      .map((d, i) => {
        const x = padL + i * gap + gap / 2;
        const v = d.lines?.[key] ?? 0;
        const y = padT + chartH - (v / maxLine) * chartH;
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${vw} ${height}`} className="w-full" style={{ minWidth: 400 }}>
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = padT + (chartH / gridLines) * i;
          return (
            <line
              key={i}
              x1={padL}
              x2={vw - padR}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-gray-700"
              strokeDasharray="4 4"
              strokeWidth={0.5}
            />
          );
        })}

        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = padT + (chartH / gridLines) * i;
          const val = Math.round(maxBar - (maxBar / gridLines) * i);
          return (
            <text
              key={`lbl-${i}`}
              x={padL - 6}
              y={y + 4}
              textAnchor="end"
              fill="#c9d1d9"
              style={{ fontSize: 10 }}
            >
              {val}
            </text>
          );
        })}

        {lines.length > 0 &&
          Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = padT + (chartH / gridLines) * i;
            const val = Math.round(maxLine - (maxLine / gridLines) * i);
            return (
              <text
                key={`rlbl-${i}`}
                x={vw - padR + 6}
                y={y + 4}
                textAnchor="start"
                fill="#c9d1d9"
                style={{ fontSize: 10 }}
  >
                {val}
              </text>
            );
          })}

        {data.map((d, i) => {
          const x = padL + i * gap + gap / 2 - barW / 2;
          const bh = (d.bar / maxBar) * chartH;
          const y = padT + chartH - bh;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={bh}
                rx={2}
                fill={barColor}
                opacity={hovered === i ? 1 : 0.85}
                style={{ transition: "opacity 150ms", cursor: "pointer" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              <rect
                x={padL + i * gap}
                y={padT}
                width={gap}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          );
        })}

        {lines.map((l) => (
          <polyline
            key={l.key}
            points={linePoints(l.key)}
            fill="none"
            stroke={l.color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}

        {lines.map((l) =>
          data.map((d, i) => {
            const x = padL + i * gap + gap / 2;
            const v = d.lines?.[l.key] ?? 0;
            const y = padT + chartH - (v / maxLine) * chartH;
            return (
              <circle
                key={`${l.key}-${i}`}
                cx={x}
                cy={y}
                r={hovered === i ? 4 : 2.5}
                fill={l.color}
                style={{ transition: "r 150ms" }}
              />
            );
          })
        )}

        {data.map((d, i) => {
          if (i % labelStep !== 0) return null;
          return (
            <text
              key={i}
              x={padL + i * gap + gap / 2}
              y={height - 8}
              textAnchor="middle"
              fill="#c9d1d9"
              style={{ fontSize: 10 }}
            >
              {d.label}
            </text>
          );
        })}

        {hovered !== null && (() => {
          const d = data[hovered];
          const tx = padL + hovered * gap + gap / 2;
          const rows = [`${barLabel}: ${d.bar}`];
          lines.forEach((l) => rows.push(`${l.label}: ${d.lines?.[l.key] ?? 0}`));
          const tw = Math.max(...rows.map((r) => r.length)) * 6 + 16;
          const th = rows.length * 16 + 12;
          const tooltipX = Math.min(Math.max(tx - tw / 2, 4), vw - tw - 4);
          return (
            <g className="pointer-events-none">
              <rect
                x={tooltipX}
                y={padT - th - 4}
                width={tw}
                height={th}
                rx={4}
                fill="#111827"
                opacity={0.95}
              />
              <text
                x={tooltipX + 8}
                y={padT - th - 4 + 16}
                fill="white"
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                {d.label}
              </text>
              {rows.map((r, ri) => (
                <text
                  key={ri}
                  x={tooltipX + 8}
                  y={padT - th - 4 + 32 + ri * 16}
                  fill="#d1d5db"
                  style={{ fontSize: 10 }}
                >
                  {r}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
