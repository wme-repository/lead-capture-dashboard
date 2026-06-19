"use client";

import { useState } from "react";
import type { SourceWithStats } from "@/lib/fontes";
import { Plug, ChevronRight, Copy, Check, Eye, Settings } from "lucide-react";

const BG = "#0d1117";
const CARD = "#161b22";
const BORDER = "#30363d";
const BORDER2 = "#21262d";
const TEXT = "#c9d1d9";
const MUTED = "#8b949e";
const ACCENT = "#58a6ff";
const GREEN = "#3fb950";

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  quest: "Respostas do formulário de perguntas das landing pages",
  lead: "Leads captados pelas landing pages com parâmetros UTM",
};

const DEST_META: Record<string, { label: string; color: string; bg: string }> = {
  sheets: { label: "Sheets", color: "#3fb950", bg: "rgba(63,185,80,0.12)" },
  datacrazy: { label: "DataCrazy", color: "#a371f7", bg: "rgba(163,113,247,0.12)" },
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{
        background: active ? "rgba(63,185,80,0.12)" : "rgba(139,148,158,0.12)",
        color: active ? GREEN : MUTED,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: active ? GREEN : MUTED }}
      />
      {active ? "ativa" : "sem leads"}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isQuest = type === "questionnaire";
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: isQuest ? "rgba(88,166,255,0.12)" : "rgba(139,148,158,0.1)",
        color: isQuest ? ACCENT : MUTED,
      }}
    >
      {isQuest ? "Questionário" : "Padrão"}
    </span>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

type Props = {
  sources: SourceWithStats[];
  appUrl: string;
  onManage: (s: SourceWithStats) => void;
};

export default function FontesTab({ sources, appUrl, onManage }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyWebhook = async (s: SourceWithStats) => {
    const url = `${appUrl}/api/webhook/${s.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (sources.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl px-6 py-16 text-center"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <Plug size={32} style={{ color: MUTED, opacity: 0.5 }} />
        <p className="text-sm font-medium" style={{ color: TEXT }}>
          Nenhuma fonte cadastrada
        </p>
        <p className="text-xs" style={{ color: MUTED }}>
          Clique em &ldquo;+ Nova Fonte&rdquo; para criar a primeira.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER2}` }}>
              {["Status", "Nome", "Slug", "Tipo", "Leads", "Último lead", "Destinos", "Ações"].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 4 ? "text-right" : ""}`}
                  style={{ color: MUTED }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr
                key={s.id}
                className="group transition-colors"
                style={{ borderBottom: `1px solid ${BORDER2}` }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td className="px-4 py-4">
                  <StatusBadge active={s.leadCount > 0} />
                </td>
                <td className="px-4 py-4">
                  <div>
                    <div className="font-medium" style={{ color: TEXT }}>{s.name}</div>
                    <div className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
                      {SOURCE_DESCRIPTIONS[s.slug] ?? "Fonte de captação de leads"}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <code
                    className="rounded px-2 py-1 font-mono text-[11px]"
                    style={{ background: "rgba(139,148,158,0.1)", color: MUTED }}
                  >
                    /{s.slug}
                  </code>
                </td>
                <td className="px-4 py-4">
                  <TypeBadge type={s.schemaType} />
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-bold tabular-nums" style={{ color: TEXT }}>
                    {s.leadCount.toLocaleString("pt-BR")}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-[11px]" style={{ color: MUTED }}>
                    {timeAgo(s.lastLeadAt)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-1.5">
                    {s.destinations.length === 0 ? (
                      <span style={{ color: MUTED }}>—</span>
                    ) : (
                      s.destinations.map((d) => {
                        const meta = DEST_META[d];
                        return (
                          <span
                            key={d}
                            className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                            style={{
                              background: meta?.bg ?? "rgba(139,148,158,0.1)",
                              color: meta?.color ?? MUTED,
                            }}
                          >
                            {meta?.label ?? d}
                          </span>
                        );
                      })
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onManage(s)}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                      style={{ color: ACCENT }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(88,166,255,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Settings size={12} /> Gerenciar
                    </button>
                    <button
                      onClick={() => onManage(s)}
                      className="rounded-md p-1.5 transition-colors"
                      style={{ color: MUTED }}
                      title="Ver detalhes"
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,148,158,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => copyWebhook(s)}
                      className="rounded-md p-1.5 transition-colors"
                      style={{ color: copiedId === s.id ? GREEN : MUTED }}
                      title="Copiar webhook"
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,148,158,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {copiedId === s.id ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y md:hidden" style={{ borderColor: BORDER2 }}>
        {sources.map((s) => (
          <button
            key={s.id}
            onClick={() => onManage(s)}
            className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: TEXT }}>{s.name}</span>
                <StatusBadge active={s.leadCount > 0} />
              </div>
              <div className="mt-1 text-[11px]" style={{ color: MUTED }}>
                {SOURCE_DESCRIPTIONS[s.slug] ?? "Fonte de captação de leads"}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: MUTED }}>
                /{s.slug} · {s.leadCount} leads · {timeAgo(s.lastLeadAt)}
              </div>
            </div>
            <ChevronRight size={16} style={{ color: MUTED }} className="shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
