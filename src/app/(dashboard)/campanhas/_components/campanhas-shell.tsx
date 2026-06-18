"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  CampaignRow,
  CampaignSummary,
  SourceBreakdown,
  PageBreakdown,
} from "@/lib/campanhas";
import {
  Megaphone,
  Users,
  Award,
  TrendingUp,
  Crown,
  Star,
  Search,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  ExternalLink,
  Inbox,
  Activity,
  Info,
  AlertTriangle,
  RotateCw,
  Loader2,
} from "lucide-react";
import AreaChart from "../../_components/area-chart";

/* ─── Types ─── */

type Props = {
  campaigns: CampaignRow[];
  summary: CampaignSummary;
  sourceBreakdown: SourceBreakdown[];
  pageBreakdown: PageBreakdown[];
  dailyChart: { label: string; value: number }[];
  period: string;
  filterSource: string | undefined;
  filterMedium: string | undefined;
  filterPage: string | undefined;
  filterOptions: { sources: string[]; mediums: string[]; pages: string[] };
};

type SortKey = "count" | "scoreAvg" | "qualifiedPct" | "lastLead" | "name";
type SortDir = "asc" | "desc";

const PERIODS = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
] as const;

const QUICK_FILTERS = [
  { key: "all", label: "Todas" },
  { key: "with", label: "Com campanha" },
  { key: "without", label: "Sem campanha" },
  { key: "best-quality", label: "Melhor qualidade" },
  { key: "most-volume", label: "Maior volume" },
] as const;

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-amber-500",
  D: "bg-red-500",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Main Shell ─── */

export default function CampanhasShell({
  campaigns,
  summary,
  sourceBreakdown,
  pageBreakdown,
  dailyChart,
  period,
  filterSource,
  filterMedium,
  filterPage,
  filterOptions,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [drawerCampaign, setDrawerCampaign] = useState<CampaignRow | null>(null);
  const [exporting, setExporting] = useState(false);

  const navigate = (params: Record<string, string>) => {
    const sp = new URLSearchParams();
    sp.set("period", period);
    if (filterSource) sp.set("source", filterSource);
    if (filterMedium) sp.set("medium", filterMedium);
    if (filterPage) sp.set("page", filterPage);
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`/campanhas?${sp.toString()}`);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let list = campaigns;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    if (quickFilter === "with")
      list = list.filter((c) => c.name !== "(sem campanha)");
    else if (quickFilter === "without")
      list = list.filter((c) => c.name === "(sem campanha)");
    else if (quickFilter === "best-quality")
      list = [...list].sort((a, b) => (b.scoreAvg ?? 0) - (a.scoreAvg ?? 0)).slice(0, 10);
    else if (quickFilter === "most-volume")
      list = [...list].sort((a, b) => b.count - a.count).slice(0, 10);

    if (quickFilter !== "best-quality" && quickFilter !== "most-volume") {
      list = [...list].sort((a, b) => {
        let va: number | string, vb: number | string;
        switch (sortKey) {
          case "count": va = a.count; vb = b.count; break;
          case "scoreAvg": va = a.scoreAvg ?? -1; vb = b.scoreAvg ?? -1; break;
          case "qualifiedPct": va = a.qualifiedPct ?? -1; vb = b.qualifiedPct ?? -1; break;
          case "lastLead": va = a.lastLead; vb = b.lastLead; break;
          case "name": va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
          default: va = a.count; vb = b.count;
        }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [campaigns, search, quickFilter, sortKey, sortDir]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csvCell = (v: unknown) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;
      const header = ["campanha", "leads", "score_medio", "qualificados_pct", "melhor_faixa", "origem_principal", "medium_principal", "pagina_principal", "ultimo_lead"];
      const rows = filtered.map((c) =>
        [c.name, c.count, c.scoreAvg, c.qualifiedPct, c.bestGrade, c.topSource, c.topMedium, c.topPage, c.lastLead]
          .map(csvCell)
          .join(",")
      );
      const csv = [header.map(csvCell).join(","), ...rows].join("\n");
      const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campanhas-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // Insights
  const insights: { msg: string; type: "info" | "success" | "warn" }[] = [];
  if (summary.topVolumeCampaign)
    insights.push({ msg: `"${summary.topVolumeCampaign}" gerou o maior volume de leads no período.`, type: "info" });
  if (summary.topQualityCampaign)
    insights.push({ msg: `"${summary.topQualityCampaign}" tem o maior leadscore médio.`, type: "success" });
  const noUtm = campaigns.find((c) => c.name === "(sem campanha)");
  if (noUtm && noUtm.count > 0)
    insights.push({ msg: `${noUtm.count} lead(s) sem utm_campaign agrupados em "(sem campanha)".`, type: "warn" });
  if (sourceBreakdown.length > 0)
    insights.push({ msg: `Principal origem: ${sourceBreakdown[0].label} (${sourceBreakdown[0].count} leads).`, type: "info" });

  const barMax = Math.max(1, ...sourceBreakdown.map((s) => s.count));
  const pageMax = Math.max(1, ...pageBreakdown.map((p) => p.count));
  const barColors = ["#3b82f6", "#6366f1", "#8b5cf6", "#a78bfa", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Campanhas</h1>
          <p className="mt-1 text-xs text-gray-500">
            Acompanhe o volume e a qualidade dos leads agrupados por utm_campaign.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period */}
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => navigate({ period: p.key })}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Filters */}
          <select
            value={filterSource ?? ""}
            onChange={(e) => navigate({ source: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-sm"
          >
            <option value="">Todas origens</option>
            {filterOptions.sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterMedium ?? ""}
            onChange={(e) => navigate({ medium: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-sm"
          >
            <option value="">Todos mediums</option>
            {filterOptions.mediums.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={filterPage ?? ""}
            onChange={(e) => navigate({ page: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-sm"
          >
            <option value="">Todas páginas</option>
            {filterOptions.pages.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? <Loader2 size={13} className="animate-spin" /> : null}
            CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards summary={summary} />

      {/* Insights */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Activity size={13} /> Insights da campanha
          </div>
          <div className="space-y-1.5">
            {insights.map((ins, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  ins.type === "success"
                    ? "bg-green-50 text-green-700"
                    : ins.type === "warn"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-blue-50 text-blue-700"
                }`}
              >
                {ins.type === "success" ? <Star size={13} /> : ins.type === "warn" ? <AlertTriangle size={13} /> : <Info size={13} />}
                {ins.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
        {/* Daily chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-gray-800">Leads por dia</div>
          {dailyChart.every((d) => d.value === 0) ? (
            <div className="flex h-[180px] items-center justify-center text-sm text-gray-400">
              Sem leads no período.
            </div>
          ) : (
            <div className="h-[180px]">
              <AreaChart data={dailyChart} />
            </div>
          )}
        </div>

        {/* Source breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-gray-800">Origens</div>
          {sourceBreakdown.length === 0 ? (
            <div className="flex h-[140px] items-center justify-center text-sm text-gray-400">Sem dados.</div>
          ) : (
            <div className="space-y-2.5">
              {sourceBreakdown.slice(0, 6).map((s, i) => (
                <div key={s.label}>
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="tabular-nums text-gray-500">{s.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${Math.max(4, Math.round((s.count / barMax) * 100))}%`,
                        background: barColors[i] ?? "#64748b",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Page breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-gray-800">Páginas de captura</div>
          {pageBreakdown.length === 0 ? (
            <div className="flex h-[140px] items-center justify-center text-sm text-gray-400">Sem dados.</div>
          ) : (
            <div className="space-y-2.5">
              {pageBreakdown.slice(0, 6).map((p, i) => (
                <div key={p.label}>
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="truncate text-gray-600">{p.label}</span>
                    <span className="ml-2 tabular-nums text-gray-500">{p.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${Math.max(4, Math.round((p.count / pageMax) * 100))}%`,
                        background: barColors[i] ?? "#64748b",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar campanha..."
            className="w-48 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex rounded-md border border-gray-200 p-0.5">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setQuickFilter(f.key)}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                quickFilter === f.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-400">
          {filtered.length} campanha(s)
        </span>
      </div>

      {/* Campaigns Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <Inbox size={28} className="text-gray-300" />
          <p className="text-sm font-medium text-gray-600">
            {search || quickFilter !== "all"
              ? "Nenhuma campanha encontrada com esse filtro."
              : "Nenhuma campanha encontrada."}
          </p>
          <p className="text-xs text-gray-400">
            {search || quickFilter !== "all"
              ? "Tente alterar os filtros ou a busca."
              : "Não há leads com utm_campaign no período selecionado."}
          </p>
          {(search || quickFilter !== "all") && (
            <button
              onClick={() => { setSearch(""); setQuickFilter("all"); }}
              className="mt-1 rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <SortHeader label="Campanha" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Leads" sortKey="count" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Score médio" sortKey="scoreAvg" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Qualificados" sortKey="qualifiedPct" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Distribuição</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Origem</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Medium</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Página</th>
                  <SortHeader label="Último lead" sortKey="lastLead" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c, idx) => (
                  <tr key={c.name} className="group transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900">{c.name}</span>
                        {idx === 0 && quickFilter === "all" && (
                          <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-blue-500">
                            #1
                          </span>
                        )}
                        {c.name === "(sem campanha)" && (
                          <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
                            sem UTM
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-gray-900">
                      {c.count.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.scoreAvg != null ? (
                        <span className={`font-semibold ${c.scoreAvg >= 70 ? "text-green-600" : c.scoreAvg >= 40 ? "text-amber-500" : "text-red-500"}`}>
                          {c.scoreAvg}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.qualifiedPct != null ? (
                        <span className={`font-medium ${c.qualifiedPct >= 60 ? "text-green-600" : c.qualifiedPct >= 30 ? "text-amber-500" : "text-red-500"}`}>
                          {c.qualifiedPct}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <GradeBar distribution={c.gradeDistribution} total={c.count} />
                    </td>
                    <td className="px-4 py-2.5">
                      {c.topSource ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                          {c.topSource}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{c.topMedium ?? "—"}</td>
                    <td className="max-w-[120px] truncate px-4 py-2.5 text-gray-500">
                      {c.topPage ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-500">
                      {fmtTime(c.lastLead)}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setDrawerCampaign(c)}
                        className="rounded px-2 py-1 text-[10px] font-medium text-blue-600 opacity-0 transition-opacity hover:bg-blue-50 group-hover:opacity-100"
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawerCampaign && (
        <CampaignDrawer
          campaign={drawerCampaign}
          onClose={() => setDrawerCampaign(null)}
        />
      )}
    </div>
  );
}

/* ─── KPI Cards ─── */

function KPICards({ summary }: { summary: CampaignSummary }) {
  const cards = [
    {
      label: "Total de campanhas",
      value: summary.totalCampaigns,
      icon: Megaphone,
      bg: "from-blue-500/10 to-blue-500/5",
      iconBg: "bg-blue-500/15 text-blue-400",
    },
    {
      label: "Total de leads",
      value: summary.totalLeads.toLocaleString("pt-BR"),
      icon: Users,
      bg: "from-green-500/10 to-green-500/5",
      iconBg: "bg-green-500/15 text-green-400",
    },
    {
      label: "Leads qualificados",
      value: summary.qualifiedCount,
      sub: summary.qualifiedPct > 0 ? `${summary.qualifiedPct}% A/B` : undefined,
      icon: Award,
      bg: "from-violet-500/10 to-violet-500/5",
      iconBg: "bg-violet-500/15 text-violet-400",
    },
    {
      label: "Leadscore médio",
      value: summary.avgScore ?? "—",
      icon: TrendingUp,
      bg: "from-amber-500/10 to-amber-500/5",
      iconBg: "bg-amber-500/15 text-amber-400",
    },
    {
      label: "Maior volume",
      value: summary.topVolumeCampaign ?? "—",
      isText: true,
      icon: Crown,
      bg: "from-indigo-500/10 to-indigo-500/5",
      iconBg: "bg-indigo-500/15 text-indigo-400",
    },
    {
      label: "Melhor qualidade",
      value: summary.topQualityCampaign ?? "—",
      isText: true,
      icon: Star,
      bg: "from-emerald-500/10 to-emerald-500/5",
      iconBg: "bg-emerald-500/15 text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className={`rounded-xl border border-gray-200 bg-gradient-to-br ${c.bg} bg-white p-4 shadow-sm`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.iconBg}`}>
              <Icon size={16} />
            </div>
            <div
              className={`mt-3 font-bold tracking-tight text-gray-900 ${
                "isText" in c && c.isText
                  ? "truncate text-sm"
                  : "text-2xl"
              }`}
            >
              {c.value}
            </div>
            <div className="text-[11px] font-medium text-gray-500">{c.label}</div>
            {"sub" in c && c.sub && (
              <div className="text-[10px] text-gray-400">{c.sub}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Grade Bar ─── */

function GradeBar({
  distribution,
  total,
}: {
  distribution: Record<string, number>;
  total: number;
}) {
  const grades = ["A", "B", "C", "D"];
  const graded = grades.reduce((sum, g) => sum + (distribution[g] ?? 0), 0);
  if (graded === 0) return <span className="text-gray-300">—</span>;

  return (
    <div className="flex items-center gap-1">
      <div className="flex h-2 w-20 overflow-hidden rounded-full bg-gray-100">
        {grades.map((g) => {
          const count = distribution[g] ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={g}
              className={`h-full ${GRADE_COLORS[g]}`}
              style={{ width: `${(count / graded) * 100}%` }}
            />
          );
        })}
      </div>
      <span className="text-[9px] text-gray-400">
        {grades.map((g) => distribution[g] ?? 0).join("/")}
      </span>
    </div>
  );
}

/* ─── Sort Header ─── */

function SortHeader({
  label,
  sortKey: key,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  return (
    <th className="px-4 py-2.5 text-left font-medium text-gray-500">
      <button
        onClick={() => onSort(key)}
        className="inline-flex items-center gap-1 hover:text-gray-800"
      >
        {label}
        {current === key ? (
          dir === "desc" ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronUp size={12} />
          )
        ) : (
          <ArrowUpDown size={10} className="opacity-30" />
        )}
      </button>
    </th>
  );
}

/* ─── Campaign Drawer ─── */

function CampaignDrawer({
  campaign: c,
  onClose,
}: {
  campaign: CampaignRow;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyName = async () => {
    await navigator.clipboard.writeText(c.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const grades = ["A", "B", "C", "D"];
  const graded = grades.reduce((sum, g) => sum + (c.gradeDistribution[g] ?? 0), 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">{c.name}</div>
            <div className="text-[11px] text-gray-500">Detalhe da campanha</div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Main stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total de leads" value={c.count} color="text-blue-600" />
            <StatBox label="Leadscore médio" value={c.scoreAvg ?? "—"} color="text-violet-600" />
            <StatBox label="Melhor faixa" value={c.bestGrade ?? "—"} color="text-green-600" />
            <StatBox label="Qualificados A/B" value={c.qualifiedPct != null ? `${c.qualifiedPct}%` : "—"} color="text-emerald-600" />
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-medium uppercase text-gray-400">Primeiro lead</div>
              <div className="mt-0.5 text-xs text-gray-600">{fmtTime(c.firstLead)}</div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase text-gray-400">Último lead</div>
              <div className="mt-0.5 text-xs text-gray-600">{fmtTime(c.lastLead)}</div>
            </div>
          </div>

          {/* Grade distribution */}
          {graded > 0 && (
            <div>
              <div className="mb-2 text-[10px] font-medium uppercase text-gray-400">
                Distribuição por faixa
              </div>
              <div className="space-y-1.5">
                {grades.map((g) => {
                  const count = c.gradeDistribution[g] ?? 0;
                  return (
                    <div key={g} className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${GRADE_COLORS[g]}`}>
                        {g}
                      </span>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className={`h-2 rounded-full ${GRADE_COLORS[g]}`}
                            style={{ width: `${graded > 0 ? (count / graded) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-8 text-right text-[11px] tabular-nums text-gray-500">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* UTM details */}
          <div>
            <div className="mb-2 text-[10px] font-medium uppercase text-gray-400">
              Parâmetros UTM
            </div>
            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <DetailRow label="utm_source" value={c.topSource} />
              <DetailRow label="utm_medium" value={c.topMedium} />
              <DetailRow label="utm_content" value={c.topContent} />
              <DetailRow label="utm_term" value={c.topTerm} />
            </div>
          </div>

          {/* Page, group, pesquisa */}
          <div>
            <div className="mb-2 text-[10px] font-medium uppercase text-gray-400">
              Contexto
            </div>
            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <DetailRow label="Página de captura" value={c.topPage} />
              <DetailRow label="Grupo" value={c.topGroup} />
              <DetailRow label="Pesquisa" value={c.topPesquisa} />
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="mb-2 text-[10px] font-medium uppercase text-gray-400">Ações</div>
            <div className="space-y-1.5">
              <a
                href={`/leads?q=${encodeURIComponent(c.name)}`}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink size={14} /> Ver leads da campanha
              </a>
              <button
                onClick={copyName}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                Copiar nome da campanha
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-700">{value ?? "—"}</span>
    </div>
  );
}
