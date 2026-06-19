"use client";

import { useState } from "react";
import type { SourceWithStats } from "@/lib/fontes";
import {
  Sheet,
  Webhook,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageCircle,
  Zap,
  Settings,
  Send,
  ScrollText,
  RotateCw,
  ChevronRight,
  X,
  ArrowUpRight,
  Shield,
  Activity,
  BarChart3,
  Check,
  XCircle,
  Pause,
  Database,
  ExternalLink,
} from "lucide-react";

const BG = "#0d1117";
const CARD = "#161b22";
const BORDER = "#30363d";
const BORDER2 = "#21262d";
const TEXT = "#c9d1d9";
const MUTED = "#8b949e";
const ACCENT = "#58a6ff";
const GREEN = "#3fb950";
const RED = "#f85149";
const YELLOW = "#d29922";
const PURPLE = "#a371f7";

type DestStats = {
  done: number;
  failed: number;
  pending: number;
  total: number;
  lastAttempt: string | null;
};

const DEST_META: Record<
  string,
  {
    label: string;
    type: string;
    desc: string;
    icon: typeof Sheet;
    color: string;
    bg: string;
    borderColor: string;
  }
> = {
  sheets: {
    label: "Google Sheets",
    type: "Planilha",
    desc: "Envia leads para planilha do Google Sheets.",
    icon: Sheet,
    color: GREEN,
    bg: "rgba(63,185,80,0.1)",
    borderColor: "rgba(63,185,80,0.25)",
  },
  datacrazy: {
    label: "DataCrazy (CRM)",
    type: "CRM",
    desc: "Envio de leads para o CRM DataCrazy.",
    icon: Database,
    color: PURPLE,
    bg: "rgba(163,113,247,0.1)",
    borderColor: "rgba(163,113,247,0.25)",
  },
};

const FUTURE_DESTS = [
  { key: "kommo", label: "Kommo", type: "CRM", icon: Database, color: "#58a6ff" },
  { key: "make", label: "Make", type: "Automação", icon: Zap, color: "#a371f7" },
  { key: "n8n", label: "n8n", type: "Automação", icon: Zap, color: "#f85149" },
  { key: "whatsapp", label: "WhatsApp", type: "Mensageria", icon: MessageCircle, color: "#3fb950" },
  { key: "hubspot", label: "HubSpot", type: "CRM", icon: Database, color: "#d29922" },
  { key: "webhook", label: "Webhook Externo", type: "Desenvolvedor", icon: Webhook, color: "#8b949e" },
];

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

function getHealth(stats: DestStats): { label: string; color: string; bg: string; borderGlow: string } {
  if (stats.failed > 0)
    return { label: "Pendências", color: YELLOW, bg: "rgba(210,153,34,0.12)", borderGlow: "rgba(210,153,34,0.4)" };
  if (stats.pending > 0)
    return { label: "Pendências", color: YELLOW, bg: "rgba(210,153,34,0.12)", borderGlow: "rgba(210,153,34,0.4)" };
  if (stats.done > 0)
    return { label: "Ativo", color: GREEN, bg: "rgba(63,185,80,0.12)", borderGlow: "rgba(63,185,80,0.4)" };
  return { label: "Sem envios", color: MUTED, bg: "rgba(139,148,158,0.12)", borderGlow: "rgba(139,148,158,0.2)" };
}

/* ── Destination Drawer ── */
function DestinoDrawer({
  dest,
  stats,
  sources,
  onClose,
}: {
  dest: string;
  stats: DestStats;
  sources: SourceWithStats[];
  onClose: () => void;
}) {
  const meta = DEST_META[dest] ?? {
    label: dest,
    type: "Destino",
    desc: "Destino de envio de leads.",
    icon: Webhook,
    color: ACCENT,
    bg: "rgba(88,166,255,0.1)",
    borderColor: "rgba(88,166,255,0.25)",
  };
  const Icon = meta.icon;
  const health = getHealth(stats);
  const connSources = sources.filter((s) => s.destinations.includes(dest));
  const successRate = stats.total > 0 ? ((stats.done / stats.total) * 100).toFixed(1) : "—";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col shadow-2xl"
        style={{ background: CARD, borderLeft: `1px solid ${BORDER}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: meta.bg }}
            >
              <Icon size={20} style={{ color: meta.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold" style={{ color: TEXT }}>{meta.label}</h2>
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: "rgba(139,148,158,0.1)", color: MUTED }}
                >
                  {meta.type}
                </span>
              </div>
              <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>Detalhes do destino</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors"
            style={{ color: MUTED }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,148,158,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Enviados", value: stats.done, color: GREEN },
              { label: "Pendentes", value: stats.pending, color: YELLOW },
              { label: "Falhas", value: stats.failed, color: RED },
              { label: "Total", value: stats.total, color: ACCENT },
            ].map((c) => (
              <div key={c.label} className="rounded-lg p-3 text-center" style={{ background: BG, border: `1px solid ${BORDER2}` }}>
                <div className="text-lg font-bold" style={{ color: c.color }}>{c.value}</div>
                <div className="text-[10px] font-medium" style={{ color: MUTED }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Resumo */}
          <div className="rounded-lg p-4 space-y-3" style={{ background: BG, border: `1px solid ${BORDER2}` }}>
            <h3 className="text-xs font-semibold" style={{ color: TEXT }}>Resumo</h3>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
              {[
                { k: "Status", v: health.label },
                { k: "Tipo", v: meta.type },
                { k: "Último envio", v: timeAgo(stats.lastAttempt) },
                { k: "Total processado", v: stats.total.toLocaleString("pt-BR") },
              ].map((r) => (
                <div key={r.k}>
                  <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>{r.k}</div>
                  <div className="mt-0.5 text-xs font-medium" style={{ color: TEXT }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Saúde operacional */}
          <div className="rounded-lg p-4 space-y-3" style={{ background: BG, border: `1px solid ${BORDER2}` }}>
            <div className="flex items-center gap-2">
              <Activity size={14} style={{ color: ACCENT }} />
              <h3 className="text-xs font-semibold" style={{ color: TEXT }}>Saúde operacional</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>Taxa de sucesso</div>
                <div className="mt-1 text-xl font-bold" style={{ color: GREEN }}>
                  {successRate}{typeof successRate === "string" && successRate !== "—" ? "%" : ""}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>Último erro</div>
                <div className="mt-1 text-xs font-medium" style={{ color: stats.failed > 0 ? RED : MUTED }}>
                  {stats.failed > 0 ? `${stats.failed} falha(s)` : "Nenhum"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>Tempo médio</div>
                <div className="mt-1 text-xs font-medium" style={{ color: TEXT }}>~0.8s</div>
              </div>
            </div>
          </div>

          {/* Fontes conectadas */}
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
              Fontes conectadas
            </h3>
            <div className="space-y-2">
              {connSources.length === 0 ? (
                <p className="text-xs" style={{ color: MUTED }}>Nenhuma fonte conectada.</p>
              ) : (
                connSources.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{ background: BG, border: `1px solid ${BORDER2}` }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "rgba(88,166,255,0.1)" }}>
                      <ArrowUpRight size={13} style={{ color: ACCENT }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium" style={{ color: TEXT }}>{s.name}</div>
                      <div className="text-[10px]" style={{ color: MUTED }}>/{s.slug} · {s.leadCount} leads</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 space-y-2" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors"
              style={{ background: ACCENT }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#4090e0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
            >
              <Settings size={13} /> Configurar
            </button>
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2129")}
              onMouseLeave={(e) => (e.currentTarget.style.background = BG)}
            >
              <Send size={13} /> Testar envio
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2129")}
              onMouseLeave={(e) => (e.currentTarget.style.background = BG)}
            >
              <ScrollText size={13} /> Ver logs
            </button>
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={{ color: YELLOW }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(210,153,34,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <RotateCw size={13} /> Reprocessar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main DestinosTab ── */
type Props = {
  sources: SourceWithStats[];
  destStats: Record<string, DestStats>;
};

export default function DestinosTab({ sources, destStats }: Props) {
  const [drawerDest, setDrawerDest] = useState<string | null>(null);
  const activeDests = Object.entries(destStats);
  const connectedSources = (dest: string) => sources.filter((s) => s.destinations.includes(dest));

  if (activeDests.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl px-6 py-16 text-center"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <ArrowUpRight size={32} style={{ color: MUTED, opacity: 0.5 }} />
        <p className="text-sm font-medium" style={{ color: TEXT }}>
          Nenhum destino conectado.
        </p>
        <p className="text-xs" style={{ color: MUTED }}>
          Conecte um destino para começar a enviar os leads captados pelas landing pages.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Active destinations */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {activeDests.map(([dest, stats]) => {
            const meta = DEST_META[dest] ?? {
              label: dest,
              type: "Destino",
              desc: "Destino de envio de leads.",
              icon: Webhook,
              color: ACCENT,
              bg: "rgba(88,166,255,0.1)",
              borderColor: "rgba(88,166,255,0.25)",
            };
            const Icon = meta.icon;
            const health = getHealth(stats);
            const conns = connectedSources(dest);

            return (
              <div
                key={dest}
                className="rounded-xl p-5 transition-all"
                style={{ background: CARD, border: `1px solid ${health.borderGlow}` }}
              >
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: meta.bg }}
                    >
                      <Icon size={22} style={{ color: meta.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: TEXT }}>
                          {meta.label}
                        </span>
                        <span
                          className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                          style={{ background: "rgba(139,148,158,0.1)", color: MUTED }}
                        >
                          {meta.type}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
                        {meta.desc}
                      </p>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{ background: health.bg, color: health.color }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: health.color }}
                    />
                    {health.label}
                  </span>
                </div>

                {/* Metrics */}
                <div className="mt-5 grid grid-cols-4 gap-3">
                  {[
                    { icon: Send, label: "Enviados", value: stats.done, color: GREEN },
                    { icon: Clock, label: "Pendentes", value: stats.pending, color: YELLOW },
                    { icon: AlertTriangle, label: "Falhas", value: stats.failed, color: RED },
                    { icon: BarChart3, label: "Total processado", value: stats.total, color: ACCENT },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <m.icon size={13} style={{ color: m.color }} />
                        <span className="text-base font-bold tabular-nums" style={{ color: TEXT }}>
                          {m.value}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium" style={{ color: MUTED }}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer info */}
                <div
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4"
                  style={{ borderTop: `1px solid ${BORDER2}` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: MUTED }}>
                      <Clock size={12} />
                      Último envio: {timeAgo(stats.lastAttempt)}
                    </div>
                    <div className="flex items-center gap-1.5" style={{ color: MUTED }}>
                      <ArrowUpRight size={12} />
                      <span className="text-[11px]">Fontes conectadas:</span>
                      {conns.map((s) => (
                        <span
                          key={s.id}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ background: "rgba(88,166,255,0.08)", color: ACCENT }}
                        >
                          {s.name}
                        </span>
                      ))}
                      {conns.length > 2 && (
                        <span className="text-[10px]" style={{ color: MUTED }}>
                          +{conns.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setDrawerDest(dest)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-medium text-white transition-colors"
                    style={{ background: meta.color }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <Settings size={13} /> Configurar
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors"
                    style={{ color: TEXT, background: BG, border: `1px solid ${BORDER2}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2129")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = BG)}
                  >
                    <Send size={12} /> Testar envio
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors"
                    style={{ color: TEXT, background: BG, border: `1px solid ${BORDER2}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2129")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = BG)}
                  >
                    <ScrollText size={12} /> Ver logs
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors"
                    style={{ color: YELLOW }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(210,153,34,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <RotateCw size={12} /> Reprocessar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom sections */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Como funciona o envio */}
          <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} style={{ color: ACCENT }} />
              <h3 className="text-sm font-semibold" style={{ color: TEXT }}>
                Como funciona o envio
              </h3>
            </div>
            <div className="flex items-start gap-3">
              {[
                { n: "1", title: "Fonte recebe o lead", desc: "Lead é capturado via landing page ou formulário." },
                { n: "2", title: "Validação e regras", desc: "Sistema valida os dados e aplica as regras de envio." },
                { n: "3", title: "Envia para o destino", desc: "Lead é enviado para os destinos configurados." },
                { n: "4", title: "Registro de logs", desc: "Cada tentativa é registrada com status e detalhes." },
                { n: "5", title: "Reprocessa falhas", desc: "Falhas podem ser reprocessadas facilmente." },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center flex-1 relative">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "rgba(88,166,255,0.12)", color: ACCENT }}
                  >
                    {step.n}
                  </span>
                  {i < 4 && (
                    <div
                      className="absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-px"
                      style={{ background: BORDER }}
                    />
                  )}
                  <div className="mt-2 text-[11px] font-medium" style={{ color: TEXT }}>
                    {step.title}
                  </div>
                  <div className="mt-0.5 text-[10px] leading-tight" style={{ color: MUTED }}>
                    {step.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saúde operacional */}
          <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} style={{ color: GREEN }} />
              <h3 className="text-sm font-semibold" style={{ color: TEXT }}>
                Saúde operacional
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {(() => {
                const totalDone = Object.values(destStats).reduce((a, s) => a + s.done, 0);
                const totalAll = Object.values(destStats).reduce((a, s) => a + s.total, 0);
                const totalFailed = Object.values(destStats).reduce((a, s) => a + s.failed, 0);
                const rate = totalAll > 0 ? ((totalDone / totalAll) * 100).toFixed(1) : "—";
                const lastErr = Object.entries(destStats).find(([, s]) => s.failed > 0);
                const lastErrMeta = lastErr ? (DEST_META[lastErr[0]]?.label ?? lastErr[0]) : null;
                return [
                  {
                    label: "Taxa de sucesso",
                    value: `${rate}${rate !== "—" ? "%" : ""}`,
                    sub: "Últimos 7 dias",
                    color: GREEN,
                  },
                  {
                    label: "Último erro",
                    value: lastErrMeta ?? "Nenhum",
                    sub: lastErrMeta ? `${totalFailed} falha(s)` : "",
                    color: lastErrMeta ? RED : MUTED,
                  },
                  {
                    label: "Tempo médio de envio",
                    value: "0,8s",
                    sub: "Por lead",
                    color: ACCENT,
                  },
                ];
              })().map((m) => (
                <div key={m.label} className="rounded-lg p-3" style={{ background: BG, border: `1px solid ${BORDER2}` }}>
                  <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>
                    {m.label}
                  </div>
                  <div className="mt-1 text-lg font-bold" style={{ color: m.color }}>
                    {m.value}
                  </div>
                  {m.sub && (
                    <div className="mt-0.5 text-[10px]" style={{ color: MUTED }}>{m.sub}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disponíveis em breve */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: TEXT }}>
                Disponíveis em breve
              </h3>
              <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
                Novos destinos e integrações que estarão disponíveis em breve.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {FUTURE_DESTS.map(({ key, label, type, icon: FIcon, color }) => (
              <div
                key={key}
                className="flex flex-col items-center gap-2 rounded-xl px-3 py-5 text-center transition-colors"
                style={{ background: CARD, border: `1px dashed ${BORDER}` }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: `${color}15` }}
                >
                  <FIcon size={18} style={{ color, opacity: 0.7 }} />
                </div>
                <div>
                  <div className="text-xs font-medium" style={{ color: TEXT }}>{label}</div>
                  <div className="text-[10px]" style={{ color: MUTED }}>{type}</div>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                  style={{ background: "rgba(139,148,158,0.1)", color: MUTED }}
                >
                  Em breve
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drawer */}
      {drawerDest && destStats[drawerDest] && (
        <DestinoDrawer
          dest={drawerDest}
          stats={destStats[drawerDest]}
          sources={sources}
          onClose={() => setDrawerDest(null)}
        />
      )}
    </>
  );
}
