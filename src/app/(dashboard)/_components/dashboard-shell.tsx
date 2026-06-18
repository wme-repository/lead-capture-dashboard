"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/lib/dashboard";
import {
  Users,
  CalendarDays,
  Clock,
  Award,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
  Search,
  Copy,
  Check,
  RotateCw,
  Info,
  ChevronRight,
  Activity,
} from "lucide-react";
import Sparkline from "./sparkline";
import AreaChart from "./area-chart";
import { ScoreBadge, SyncBadge } from "./badges";

type Source = { slug: string; name: string };
type RecentLead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  grade: string | null;
  score: number | null;
  status: string;
  receivedAt: string;
  source: { name: string } | null;
  syncLogs: { status: string }[];
};

type Props = {
  data: DashboardData;
  sources: Source[];
  recent: RecentLead[];
  period: string;
  sourceSlug: string | undefined;
};

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
        up ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
      }`}
    >
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(value)}%
    </span>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CHART_MODES = [
  { key: "volume", label: "Volume" },
  { key: "qualified", label: "Qualificados" },
  { key: "synced", label: "Sincronizados" },
] as const;

const LEAD_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "synced", label: "Sincronizados" },
  { key: "pending", label: "Pendentes" },
  { key: "failed", label: "Falharam" },
  { key: "A", label: "Score A" },
  { key: "B", label: "Score B" },
] as const;

export default function DashboardShell({
  data,
  sources,
  recent,
  period,
  sourceSlug,
}: Props) {
  const router = useRouter();
  const [chartMode, setChartMode] = useState<string>("volume");
  const [leadFilter, setLeadFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handlePeriod = (p: string) => {
    const params = new URLSearchParams();
    params.set("period", p);
    if (sourceSlug) params.set("source", sourceSlug);
    router.push(`/?${params.toString()}`);
  };

  const handleSource = (slug: string) => {
    const params = new URLSearchParams();
    params.set("period", period);
    if (slug) params.set("source", slug);
    router.push(slug ? `/?${params.toString()}` : `/?period=${period}`);
  };

  const handleRefresh = () => router.refresh();

  const copyContact = async (lead: RecentLead) => {
    const text = [lead.name, lead.email, lead.phone].filter(Boolean).join(" — ");
    await navigator.clipboard.writeText(text);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredLeads = recent.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q);
      if (!match) return false;
    }
    if (leadFilter === "all") return true;
    if (leadFilter === "synced")
      return l.syncLogs.every((s) => s.status === "done" || s.status === "synced");
    if (leadFilter === "pending") return l.syncLogs.some((s) => s.status === "pending");
    if (leadFilter === "failed") return l.syncLogs.some((s) => s.status === "failed");
    if (leadFilter === "A" || leadFilter === "B") return l.grade === leadFilter;
    return true;
  });

  // Alerts
  const alerts: { type: "info" | "warn" | "error" | "success"; msg: string; action?: { label: string; href: string } }[] = [];
  if (data.sync.failed > 0)
    alerts.push({
      type: "error",
      msg: `${data.sync.failed} sincronização(ões) com falha`,
      action: { label: "Reprocessar", href: "/fontes" },
    });
  if (data.sync.pending > 0)
    alerts.push({
      type: "warn",
      msg: `${data.sync.pending} lead(s) pendente(s) de sincronização`,
      action: { label: "Ver pendências", href: "/fontes" },
    });
  if (data.topOrigin && data.origin.length > 0 && data.origin[0].pct >= 70)
    alerts.push({
      type: "info",
      msg: `Origem "${data.topOrigin}" representa ${data.origin[0].pct}% dos leads`,
    });
  if (alerts.length === 0)
    alerts.push({ type: "success", msg: "Nenhuma falha crítica encontrada" });

  const originMax = Math.max(1, ...data.origin.map((o) => o.count));
  const originColors = ["#3b82f6", "#6366f1", "#8b5cf6", "#a78bfa", "#64748b"];

  const KPI = [
    {
      label: "Total de leads",
      value: data.total.value.toLocaleString("pt-BR"),
      delta: data.total.delta,
      series: data.total.series,
      icon: Users,
      color: "#3b82f6",
      bg: "from-blue-500/10 to-blue-500/5",
      iconBg: "bg-blue-500/15 text-blue-400",
    },
    {
      label: "Leads hoje",
      value: data.today.value.toLocaleString("pt-BR"),
      delta: data.today.delta,
      series: data.today.series,
      icon: CalendarDays,
      color: "#22c55e",
      bg: "from-green-500/10 to-green-500/5",
      iconBg: "bg-green-500/15 text-green-400",
    },
    {
      label: "Última hora",
      value: data.lastHour.value.toLocaleString("pt-BR"),
      delta: data.lastHour.delta,
      series: data.lastHour.series,
      icon: Clock,
      color: "#f59e0b",
      bg: "from-amber-500/10 to-amber-500/5",
      iconBg: "bg-amber-500/15 text-amber-400",
    },
    {
      label: "Qualidade dos leads",
      value: data.scoreAB.hasGraded ? `${data.scoreAB.value}%` : "—",
      sub: data.scoreAB.hasGraded ? "Score A/B" : "sem dados",
      delta: data.scoreAB.delta,
      series: data.scoreAB.series,
      icon: Award,
      color: "#8b5cf6",
      bg: "from-violet-500/10 to-violet-500/5",
      iconBg: "bg-violet-500/15 text-violet-400",
    },
    {
      label: "Sincronização",
      value: `${data.sync.syncPct}%`,
      sub: data.sync.pending > 0 ? `${data.sync.pending} pendente(s)` : "todos sincronizados",
      delta: 0,
      series: [],
      icon: CheckCircle2,
      color: data.sync.failed > 0 ? "#ef4444" : data.sync.pending > 0 ? "#f59e0b" : "#22c55e",
      bg:
        data.sync.failed > 0
          ? "from-red-500/10 to-red-500/5"
          : data.sync.pending > 0
            ? "from-amber-500/10 to-amber-500/5"
            : "from-green-500/10 to-green-500/5",
      iconBg:
        data.sync.failed > 0
          ? "bg-red-500/15 text-red-400"
          : data.sync.pending > 0
            ? "bg-amber-500/15 text-amber-400"
            : "bg-green-500/15 text-green-400",
    },
    {
      label: "Pendências",
      value: (data.sync.pending + data.sync.failed).toString(),
      sub:
        data.sync.failed > 0
          ? `${data.sync.failed} com erro`
          : "tudo limpo",
      delta: 0,
      series: [],
      icon: AlertTriangle,
      color: data.sync.failed > 0 ? "#ef4444" : data.sync.pending > 0 ? "#f59e0b" : "#22c55e",
      bg:
        data.sync.failed > 0
          ? "from-red-500/10 to-red-500/5"
          : data.sync.pending > 0
            ? "from-amber-500/10 to-amber-500/5"
            : "from-green-500/10 to-green-500/5",
      iconBg:
        data.sync.failed > 0
          ? "bg-red-500/15 text-red-400"
          : data.sync.pending > 0
            ? "bg-amber-500/15 text-amber-400"
            : "bg-green-500/15 text-green-400",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Acompanhe volume, origem, qualidade e sincronização dos leads em
            tempo real.
          </p>
          <div className="mt-1.5">
            <LiveBadge />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period pills */}
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            {(["today", "7d", "30d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {p === "today" ? "Hoje" : p === "7d" ? "7 dias" : "30 dias"}
              </button>
            ))}
          </div>
          {/* Source */}
          <select
            value={sourceSlug ?? ""}
            onChange={(e) => handleSource(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm"
          >
            <option value="">Todas as campanhas</option>
            {sources.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          {/* Actions */}
          <ExportBtn />
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>
      </div>

      {/* KPI Cards — 6 columns on lg, 3 on md, 2 on sm */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPI.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br ${c.bg} bg-white p-4 shadow-sm transition-shadow hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.iconBg}`}>
                  <Icon size={16} />
                </div>
                {c.delta !== 0 && <Delta value={c.delta} />}
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                {c.value}
              </div>
              <div className="text-[11px] font-medium text-gray-500">{c.label}</div>
              {"sub" in c && c.sub && (
                <div className="text-[10px] text-gray-400">{c.sub}</div>
              )}
              {c.series.length > 0 && (
                <div className="mt-2">
                  <Sparkline data={c.series} color={c.color} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Activity size={13} /> Alertas operacionais
          </div>
          <div className="space-y-1.5">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                  a.type === "error"
                    ? "bg-red-50 text-red-700"
                    : a.type === "warn"
                      ? "bg-amber-50 text-amber-700"
                      : a.type === "success"
                        ? "bg-green-50 text-green-700"
                        : "bg-blue-50 text-blue-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.type === "error" ? (
                    <AlertTriangle size={13} />
                  ) : a.type === "warn" ? (
                    <Clock size={13} />
                  ) : a.type === "success" ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <Info size={13} />
                  )}
                  {a.msg}
                </div>
                {a.action && (
                  <a
                    href={a.action.href}
                    className="flex items-center gap-0.5 font-medium hover:underline"
                  >
                    {a.action.label} <ChevronRight size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart + Origin */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        {/* Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              Leads por dia
            </span>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-gray-200 p-0.5">
                {CHART_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setChartMode(m.key)}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      chartMode === m.key
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-gray-400">
                {period === "today"
                  ? "hoje, por hora"
                  : `últimos ${data.periodDays} dias`}
              </span>
            </div>
          </div>
          {data.chart.every((d) => d.value === 0) ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-1">
              <Inbox size={24} className="text-gray-300" />
              <span className="text-sm text-gray-400">Sem leads no período.</span>
            </div>
          ) : (
            <div className="h-[220px]">
              <AreaChart data={data.chart} />
            </div>
          )}
        </div>

        {/* Origin */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-gray-800">
            Origem dos leads
          </div>
          {data.origin.length === 0 ? (
            <div className="flex h-[180px] flex-col items-center justify-center gap-1">
              <Inbox size={24} className="text-gray-300" />
              <span className="text-sm text-gray-400">Sem dados ainda.</span>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {data.origin.map((o, i) => (
                  <button
                    key={o.label}
                    onClick={() => {
                      if (o.label === "direto") handleSource("");
                    }}
                    className="block w-full text-left"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{o.label}</span>
                      <span className="tabular-nums text-gray-500">
                        {o.count} lead{o.count !== 1 ? "s" : ""}{" "}
                        <span className="text-gray-400">({o.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.max(4, Math.round((o.count / originMax) * 100))}%`,
                          background: originColors[i] ?? "#64748b",
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
              {data.topOrigin && (
                <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                  <strong>Origem com maior volume:</strong> {data.topOrigin}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recent leads */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Table header */}
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-gray-800">
            Leads recentes
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar lead..."
                className="w-44 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {/* Quick filters */}
            <div className="flex rounded-md border border-gray-200 p-0.5">
              {LEAD_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setLeadFilter(f.key)}
                  className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                    leadFilter === f.key
                      ? "bg-blue-600 text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <a
              href="/leads"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Ver todos
            </a>
          </div>
        </div>

        {/* Table */}
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Inbox size={28} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-600">
              {search || leadFilter !== "all"
                ? "Nenhum lead encontrado com esse filtro."
                : "Nenhum lead capturado ainda."}
            </p>
            <p className="text-xs text-gray-400">
              {search || leadFilter !== "all"
                ? "Tente alterar os filtros ou a busca."
                : "Assim que um formulário enviar um webhook, ele aparece aqui."}
            </p>
            {!search && leadFilter === "all" && (
              <a
                href="/fontes"
                className="mt-1 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Ver fontes
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Recebido
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Lead
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Email / Telefone
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Origem
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Campanha
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Score
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Sync
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map((l) => (
                  <tr
                    key={l.id}
                    className="group transition-colors hover:bg-gray-50/50"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-500">
                      {fmtTime(l.receivedAt)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {l.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {l.email ?? l.phone ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {l.utmSource ?? "direto"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {l.source?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <ScoreBadge grade={l.grade} />
                    </td>
                    <td className="px-4 py-2.5">
                      <SyncBadge logs={l.syncLogs} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <a
                          href={`/leads?q=${l.email ?? l.name ?? ""}`}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Ver
                        </a>
                        <button
                          onClick={() => copyContact(l)}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-100"
                        >
                          {copiedId === l.id ? (
                            <Check size={10} className="text-green-600" />
                          ) : (
                            <Copy size={10} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline LiveBadge to avoid extra component
function LiveBadge() {
  const [secs, setSecs] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const tick = setInterval(() => setSecs((s) => s + 1), 1000);
    const refresh = setInterval(() => {
      router.refresh();
      setSecs(0);
    }, 30000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router]);

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
        Ao vivo
      </span>
      <span className="text-[11px] text-gray-400">Atualizado há {secs}s</span>
    </div>
  );
}

// Inline export button
function ExportBtn() {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const { leads } = await res.json();
      const csvCell = (v: unknown) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;
      const header = ["recebido", "nome", "email", "telefone", "campanha", "utm_source", "score", "grade", "status"];
      const rows = leads.map((l: Record<string, unknown>) =>
        [l.receivedAt, l.name, l.email, l.phone, (l.source as Record<string, unknown>)?.name, l.utmSource, l.score, l.grade, l.status]
          .map(csvCell)
          .join(",")
      );
      const csv = [header.map(csvCell).join(","), ...rows].join("\n");
      const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? <RotateCw size={13} className="animate-spin" /> : null}
      CSV
    </button>
  );
}
