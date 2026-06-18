"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AttrData,
  AttrLead,
  GroupStats,
  UtmCombo,
  DailyPoint,
  LpStats,
} from "@/lib/atribuicao";
import {
  GitFork,
  RefreshCw,
  Download,
  Search,
  X,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Inbox,
  Lightbulb,
  Users,
  Tag,
  Globe,
  Smartphone,
  LayoutGrid,
  Link2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Phone,
  Mail,
  FileText,
  TrendingUp,
  Target,
  BarChart3,
} from "lucide-react";

type Tab = "resumo" | "plataformas" | "posicionamentos" | "utms" | "lps" | "leads";
type Period = "7d" | "30d" | "90d";

const TABS: { key: Tab; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "plataformas", label: "Plataformas" },
  { key: "posicionamentos", label: "Posicionamentos" },
  { key: "utms", label: "UTMs" },
  { key: "lps", label: "LPs" },
  { key: "leads", label: "Leads" },
];

const REC_BADGE: Record<string, string> = {
  Escalar: "bg-emerald-100 text-emerald-700",
  Manter: "bg-blue-100 text-blue-700",
  Otimizar: "bg-amber-100 text-amber-700",
  Pausar: "bg-red-100 text-red-600",
};

const ORIGIN_COLORS: Record<string, string> = {
  "Meta Ads": "bg-blue-500",
  "Orgânico": "bg-emerald-500",
  "Sem classificação - sem UTM": "bg-gray-400",
  "Google": "bg-amber-500",
  "WhatsApp": "bg-green-500",
  "Referral": "bg-purple-500",
  "Não identificado": "bg-gray-300",
};

const ORIGIN_BADGE: Record<string, string> = {
  "Meta Ads": "bg-blue-100 text-blue-700",
  "Orgânico": "bg-emerald-100 text-emerald-700",
  "Sem classificação - sem UTM": "bg-gray-100 text-gray-600",
  "Google": "bg-amber-100 text-amber-700",
  "WhatsApp": "bg-green-100 text-green-700",
  "Referral": "bg-purple-100 text-purple-700",
  "Não identificado": "bg-gray-100 text-gray-500",
};

const GRADE_BADGE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-red-100 text-red-700",
};

const UTM_STATUS_BADGE: Record<string, string> = {
  Completa: "bg-emerald-100 text-emerald-700",
  Parcial: "bg-amber-100 text-amber-700",
  "Sem campanha": "bg-orange-100 text-orange-700",
  "Sem source": "bg-red-100 text-red-600",
  "Sem medium": "bg-red-100 text-red-600",
  "Sem content": "bg-amber-100 text-amber-600",
  "Sem UTM": "bg-gray-100 text-gray-500",
};

const BRT_MS = 3 * 60 * 60 * 1000;

function fmtDate(iso: string) {
  const d = new Date(new Date(iso).getTime() - BRT_MS);
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
}
function fmtTime(iso: string) {
  const d = new Date(new Date(iso).getTime() - BRT_MS);
  return d.toISOString().slice(11, 16);
}
function fmtAgo(iso: string | null) {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
}

function copyText(t: string) {
  navigator.clipboard.writeText(t).catch(() => {});
}

function downloadCsv(headers: string[], rows: string[][], filename: string) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* ================================================================ */

export default function AtribuicaoShell({
  data,
  period,
  filterCampaign,
  filterSource,
  filterPlatform,
}: {
  data: AttrData;
  period: Period;
  filterCampaign?: string;
  filterSource?: string;
  filterPlatform?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>("resumo");
  const [refreshing, setRefreshing] = useState(false);
  const [drawerLead, setDrawerLead] = useState<AttrLead | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [leadsSearch, setLeadsSearch] = useState("");
  const [leadsPage, setLeadsPage] = useState(0);

  const navigate = useCallback(
    (params: Record<string, string | undefined>) => {
      const u = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(params)) {
        if (v) u.set(k, v);
        else u.delete(k);
      }
      router.push(`/atribuicao?${u.toString()}`);
    },
    [router, sp]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 1500);
  }, [router]);

  const handleCopy = useCallback((id: string, text: string) => {
    copyText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  }, []);

  const clearFilters = useCallback(() => {
    router.push(`/atribuicao?period=${period}`);
  }, [router, period]);

  const hasFilters = !!filterCampaign || !!filterSource || !!filterPlatform;

  const exportLeadsCsv = useCallback(() => {
    const headers = ["Data", "Hora", "Nome", "Email", "Telefone", "Origem", "Plataforma", "Posicionamento", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "Página", "Leadscore", "Faixa"];
    const rows = data.leads.map((l) => [
      fmtDate(l.receivedAt), fmtTime(l.receivedAt), l.name ?? "", l.email ?? "", l.phone ?? "",
      l.origin, l.platform, l.placement, l.utmSource ?? "", l.utmMedium ?? "",
      l.utmCampaign ?? "", l.utmContent ?? "", l.utmTerm ?? "", l.paginaCaptura ?? "",
      l.score != null ? String(l.score) : "", l.grade ?? "",
    ]);
    downloadCsv(headers, rows, `atribuicao-leads-${Date.now()}.csv`);
  }, [data.leads]);

  // Leads tab filtering
  const filteredLeads = useMemo(() => {
    if (!leadsSearch) return data.leads;
    const q = leadsSearch.toLowerCase();
    return data.leads.filter((l) =>
      [l.name, l.email, l.phone, l.utmSource, l.utmCampaign, l.origin, l.platform, l.placement]
        .some((v) => v && v.toLowerCase().includes(q))
    );
  }, [data.leads, leadsSearch]);

  const leadsPerPage = 50;
  const totalLeadPages = Math.max(1, Math.ceil(filteredLeads.length / leadsPerPage));
  const safeLPage = Math.min(leadsPage, totalLeadPages - 1);
  const pageLeads = filteredLeads.slice(safeLPage * leadsPerPage, (safeLPage + 1) * leadsPerPage);

  const { summary: s } = data;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10">
            <GitFork size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Atribuição</h1>
            <p className="text-xs text-gray-500">Analise de onde vêm os leads por origem, plataforma, posicionamento e UTMs.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period */}
          <select
            value={period}
            onChange={(e) => navigate({ period: e.target.value })}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none"
          >
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
          </select>
          {/* Campaign filter */}
          <select
            value={filterCampaign ?? ""}
            onChange={(e) => navigate({ campaign: e.target.value || undefined })}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none"
          >
            <option value="">Todas campanhas</option>
            {data.filterOptions.campaigns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {/* Source filter */}
          <select
            value={filterSource ?? ""}
            onChange={(e) => navigate({ source: e.target.value || undefined })}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none"
          >
            <option value="">Todas origens</option>
            {data.filterOptions.sources.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {/* Platform filter */}
          <select
            value={filterPlatform ?? ""}
            onChange={(e) => navigate({ platform: e.target.value || undefined })}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none"
          >
            <option value="">Todas plataformas</option>
            {data.filterOptions.platforms.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button onClick={handleRefresh} className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-medium text-white hover:bg-blue-700">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Atualizar
          </button>
          <button onClick={exportLeadsCsv} className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Active filters breadcrumb */}
      {hasFilters && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Filtro ativo:</span>
          {filterSource && <FilterChip label={filterSource} onClear={() => navigate({ source: undefined })} />}
          {filterPlatform && <FilterChip label={filterPlatform} onClear={() => navigate({ platform: undefined })} />}
          {filterCampaign && <FilterChip label={filterCampaign} onClear={() => navigate({ campaign: undefined })} />}
          <button onClick={clearFilters} className="ml-1 text-red-500 hover:text-red-700">Limpar todos</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setLeadsPage(0); }}
            className={`relative pb-2.5 pt-1 text-sm font-medium transition-colors ${
              tab === t.key ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
            {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {data.leads.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {tab === "resumo" && <ResumoTab data={data} onNavigate={navigate} />}
          {tab === "plataformas" && <GroupTab groups={data.platforms} title="Plataformas" colorMap={ORIGIN_COLORS} onFilter={(v) => navigate({ platform: v })} />}
          {tab === "posicionamentos" && <GroupTab groups={data.placements} title="Posicionamentos" colorMap={{}} onFilter={(v) => {}} />}
          {tab === "utms" && <UtmsTab data={data} />}
          {tab === "lps" && <LpsTab lps={data.lps} insights={data.lpInsights} onOpenLead={setDrawerLead} onCopy={handleCopy} copied={copied} />}
          {tab === "leads" && (
            <LeadsTab
              leads={pageLeads}
              total={filteredLeads.length}
              search={leadsSearch}
              onSearch={(v) => { setLeadsSearch(v); setLeadsPage(0); }}
              page={safeLPage}
              totalPages={totalLeadPages}
              onPage={setLeadsPage}
              onOpenLead={setDrawerLead}
              onCopy={handleCopy}
              copied={copied}
            />
          )}
        </>
      )}

      {/* Lead drawer */}
      {drawerLead && (
        <LeadDrawer lead={drawerLead} onClose={() => setDrawerLead(null)} onCopy={handleCopy} copied={copied} />
      )}
    </div>
  );
}

/* ================================================================
   RESUMO TAB
   ================================================================ */
function ResumoTab({ data, onNavigate }: { data: AttrData; onNavigate: (p: Record<string, string | undefined>) => void }) {
  const { summary: s, origins, dailyByOrigin, insights } = data;
  const originKeys = [...new Set(data.leads.map((l) => l.origin))];

  return (
    <div className="flex flex-col gap-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total de leads" value={s.total} />
        <KpiCard label="Com UTM" value={s.withUtm} accent="blue" />
        <KpiCard label="Sem UTM" value={s.withoutUtm} accent={s.withoutUtm > 0 ? "amber" : undefined} />
        <KpiCard label="Leadscore médio" value={s.avgScore ?? "—"} />
        <KpiCard label="Principal origem" value={s.topOrigin ?? "—"} small />
        <KpiCard label="Principal plataforma" value={s.topPlatform ?? "—"} small />
        <KpiCard label="Principal posicionamento" value={s.topPlacement ?? "—"} small />
        <KpiCard label="Melhor qualidade" value={s.bestQualityOrigin ?? "—"} small accent="emerald" />
      </div>

      {/* Origin bars + quality chart */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Origem dos leads">
          <div className="space-y-2.5">
            {origins.map((o) => (
              <button
                key={o.label}
                onClick={() => onNavigate({ source: undefined, platform: undefined })}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ORIGIN_COLORS[o.label] ?? "bg-gray-300"}`} />
                <span className="min-w-[100px] text-sm font-medium text-gray-800">{o.label}</span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${ORIGIN_COLORS[o.label] ?? "bg-gray-300"}`} style={{ width: `${o.pct}%` }} />
                  </div>
                </div>
                <span className="w-10 text-right text-xs font-semibold tabular-nums text-gray-700">{o.count}</span>
                <span className="w-10 text-right text-xs tabular-nums text-gray-400">{o.pct}%</span>
                {o.avgScore != null && (
                  <span className="w-12 text-right text-xs tabular-nums text-gray-500">avg {o.avgScore}</span>
                )}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Qualidade por origem">
          <div className="space-y-2">
            {origins.filter((o) => o.avgScore != null).map((o) => (
              <div key={o.label} className="flex items-center gap-3">
                <span className="min-w-[100px] text-sm text-gray-700">{o.label}</span>
                <div className="flex-1">
                  <div className="h-5 overflow-hidden rounded bg-gray-100">
                    <div
                      className={`h-full rounded ${o.avgScore! >= 70 ? "bg-emerald-500" : o.avgScore! >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${Math.min(100, o.avgScore!)}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-sm font-semibold tabular-nums text-gray-800">{o.avgScore}</span>
              </div>
            ))}
            {origins.every((o) => o.avgScore == null) && (
              <p className="py-6 text-center text-xs text-gray-400">Nenhum leadscore disponível.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Daily chart */}
      <Card title="Leads por dia e origem">
        <DailyChart points={dailyByOrigin} keys={originKeys} />
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card title="Insights de atribuição" icon={<Lightbulb size={14} className="text-amber-500" />}>
          <ul className="space-y-1.5">
            {insights.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ================================================================
   GROUP TAB (Plataformas / Posicionamentos)
   ================================================================ */
function GroupTab({
  groups,
  title,
  colorMap,
  onFilter,
}: {
  groups: GroupStats[];
  title: string;
  colorMap: Record<string, string>;
  onFilter: (label: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Bar chart */}
      <Card title={`Leads por ${title.toLowerCase()}`}>
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.label} className="flex items-center gap-3">
              <span className="min-w-[140px] truncate text-sm font-medium text-gray-700">{g.label}</span>
              <div className="flex-1">
                <div className="h-5 overflow-hidden rounded bg-gray-100">
                  <div
                    className={`h-full rounded ${colorMap[g.label] ?? "bg-blue-500"}`}
                    style={{ width: `${g.pct}%`, minWidth: g.count > 0 ? "4px" : "0" }}
                  />
                </div>
              </div>
              <span className="w-10 text-right text-xs font-semibold tabular-nums text-gray-700">{g.count}</span>
              <span className="w-10 text-right text-xs tabular-nums text-gray-400">{g.pct}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Quality chart */}
      <Card title={`Qualidade por ${title.toLowerCase()}`}>
        <div className="space-y-2">
          {groups.filter((g) => g.avgScore != null).map((g) => (
            <div key={g.label} className="flex items-center gap-3">
              <span className="min-w-[140px] truncate text-sm text-gray-700">{g.label}</span>
              <div className="flex-1">
                <div className="h-5 overflow-hidden rounded bg-gray-100">
                  <div
                    className={`h-full rounded ${g.avgScore! >= 70 ? "bg-emerald-500" : g.avgScore! >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(100, g.avgScore!)}%` }}
                  />
                </div>
              </div>
              <span className="w-10 text-right text-sm font-semibold tabular-nums text-gray-800">{g.avgScore}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Grade distribution */}
      <Card title="Distribuição de faixa">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-3 py-2">{title.slice(0, -1)}</th>
                <th className="px-3 py-2 text-center">A</th>
                <th className="px-3 py-2 text-center">B</th>
                <th className="px-3 py-2 text-center">C</th>
                <th className="px-3 py-2 text-center">D</th>
                <th className="px-3 py-2 text-center">S/ nota</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map((g) => {
                const graded = (g.grades.A ?? 0) + (g.grades.B ?? 0) + (g.grades.C ?? 0) + (g.grades.D ?? 0);
                return (
                  <tr key={g.label} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{g.label}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{g.grades.A ?? 0}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{g.grades.B ?? 0}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{g.grades.C ?? 0}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{g.grades.D ?? 0}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-gray-400">{g.count - graded}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{g.count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail table */}
      <Card title={`Detalhes por ${title.toLowerCase()}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-3 py-2">{title.slice(0, -1)}</th>
                <th className="px-3 py-2 text-right">Leads</th>
                <th className="px-3 py-2 text-right">%</th>
                <th className="px-3 py-2 text-right">Score médio</th>
                <th className="px-3 py-2">Faixa</th>
                <th className="px-3 py-2">Campanha</th>
                <th className="px-3 py-2">Página</th>
                <th className="px-3 py-2">Último lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map((g) => (
                <tr key={g.label} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-700">{g.label}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{g.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">{g.pct}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.avgScore ?? "—"}</td>
                  <td className="px-3 py-2">{g.topGrade ? <Badge cls={GRADE_BADGE[g.topGrade]}>{g.topGrade}</Badge> : "—"}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-gray-500">{g.topCampaign ?? "—"}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-gray-500">{g.topPage ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-400">{fmtAgo(g.lastLead)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ================================================================
   UTMs TAB
   ================================================================ */
function UtmsTab({ data }: { data: AttrData }) {
  const { utmKpis: k, utmCombos, utmAlerts } = data;
  const total = k.complete + k.partial + k.noUtm;

  return (
    <div className="flex flex-col gap-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <KpiCard label="UTM completa" value={k.complete} accent="emerald" />
        <KpiCard label="UTM parcial" value={k.partial} accent="amber" />
        <KpiCard label="Sem UTM" value={k.noUtm} accent={k.noUtm > 0 ? "red" : undefined} />
        <KpiCard label="Campanhas" value={k.campaigns} />
        <KpiCard label="Sources" value={k.sources} />
        <KpiCard label="Mediums" value={k.mediums} />
        <KpiCard label="Contents" value={k.contents} />
      </div>

      {/* Completude chart */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Completude das UTMs">
          <div className="space-y-3">
            {[
              { label: "Completa", count: k.complete, cls: "bg-emerald-500" },
              { label: "Parcial", count: k.partial, cls: "bg-amber-400" },
              { label: "Sem UTM", count: k.noUtm, cls: "bg-gray-300" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="min-w-[80px] text-sm text-gray-700">{item.label}</span>
                <div className="flex-1">
                  <div className="h-5 overflow-hidden rounded bg-gray-100">
                    <div className={`h-full rounded ${item.cls}`} style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }} />
                  </div>
                </div>
                <span className="w-10 text-right text-sm font-semibold tabular-nums text-gray-700">{item.count}</span>
                <span className="w-10 text-right text-xs tabular-nums text-gray-400">{total > 0 ? Math.round((item.count / total) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top utm_source */}
        <Card title="Top utm_source">
          <TopValuesChart data={data} field="utmSource" />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Top utm_medium">
          <TopValuesChart data={data} field="utmMedium" />
        </Card>
        <Card title="Top utm_campaign">
          <TopValuesChart data={data} field="utmCampaign" />
        </Card>
      </div>

      <Card title="Top utm_content">
        <TopValuesChart data={data} field="utmContent" />
      </Card>

      {/* Alerts */}
      {utmAlerts.length > 0 && (
        <Card title="Problemas de UTM" icon={<AlertTriangle size={14} className="text-amber-500" />}>
          <ul className="space-y-1.5">
            {utmAlerts.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* UTM combos table */}
      <Card title="Combinações UTM">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-3 py-2">utm_source</th>
                <th className="px-3 py-2">utm_medium</th>
                <th className="px-3 py-2">utm_campaign</th>
                <th className="px-3 py-2">utm_content</th>
                <th className="px-3 py-2">utm_term</th>
                <th className="px-3 py-2 text-right">Leads</th>
                <th className="px-3 py-2 text-right">%</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {utmCombos.slice(0, 30).map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="max-w-[120px] truncate px-3 py-2 text-gray-700">{c.utmSource || <span className="text-gray-300">—</span>}</td>
                  <td className="max-w-[100px] truncate px-3 py-2 text-gray-600">{c.utmMedium || <span className="text-gray-300">—</span>}</td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-gray-600">{c.utmCampaign || <span className="text-gray-300">—</span>}</td>
                  <td className="max-w-[120px] truncate px-3 py-2 text-gray-500">{c.utmContent || <span className="text-gray-300">—</span>}</td>
                  <td className="max-w-[100px] truncate px-3 py-2 text-gray-500">{c.utmTerm || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{c.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-400">{c.pct}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.avgScore ?? "—"}</td>
                  <td className="px-3 py-2"><Badge cls={UTM_STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-500"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ================================================================
   LEADS TAB
   ================================================================ */
function LeadsTab({
  leads,
  total,
  search,
  onSearch,
  page,
  totalPages,
  onPage,
  onOpenLead,
  onCopy,
  copied,
}: {
  leads: AttrLead[];
  total: number;
  search: string;
  onSearch: (v: string) => void;
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  onOpenLead: (l: AttrLead) => void;
  onCopy: (id: string, text: string) => void;
  copied: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar lead, email, UTM..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="px-3 py-2.5">Data</th>
                <th className="px-3 py-2.5">Nome</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Origem</th>
                <th className="px-3 py-2.5">Plataforma</th>
                <th className="px-3 py-2.5">Posicionamento</th>
                <th className="px-3 py-2.5">utm_source</th>
                <th className="px-3 py-2.5">utm_medium</th>
                <th className="px-3 py-2.5">utm_campaign</th>
                <th className="px-3 py-2.5">Página</th>
                <th className="px-3 py-2.5 text-center">Score</th>
                <th className="px-3 py-2.5 text-center">Faixa</th>
                <th className="px-3 py-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((l) => (
                <tr key={l.id} className="group transition-colors hover:bg-blue-50/40">
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500">{fmtDate(l.receivedAt)} {fmtTime(l.receivedAt)}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">{l.name ?? "—"}</td>
                  <td className="px-3 py-2 text-blue-600">{l.email ?? "—"}</td>
                  <td className="px-3 py-2"><Badge cls={ORIGIN_BADGE[l.origin] ?? "bg-gray-100 text-gray-500"}>{l.origin}</Badge></td>
                  <td className="px-3 py-2 text-gray-600">{l.platform}</td>
                  <td className="max-w-[120px] truncate px-3 py-2 text-gray-500">{l.placement}</td>
                  <td className="px-3 py-2 text-gray-600">{l.utmSource ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-gray-600">{l.utmMedium ?? <span className="text-gray-300">—</span>}</td>
                  <td className="max-w-[120px] truncate px-3 py-2 text-gray-600">{l.utmCampaign ?? <span className="text-gray-300">—</span>}</td>
                  <td className="max-w-[100px] truncate px-3 py-2 text-gray-500">{l.paginaCaptura ?? "—"}</td>
                  <td className="px-3 py-2 text-center">
                    {l.score != null ? (
                      <span className={`font-semibold tabular-nums ${l.score >= 70 ? "text-emerald-600" : l.score >= 40 ? "text-amber-600" : "text-red-500"}`}>{l.score}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {l.grade ? <Badge cls={GRADE_BADGE[l.grade] ?? "bg-gray-100 text-gray-500"}>{l.grade}</Badge> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => onOpenLead(l)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Ver detalhes">
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
          <span className="text-xs text-gray-500">{total} lead{total !== 1 ? "s" : ""} · Página {page + 1} de {totalPages}</span>
          <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <PgBtn disabled={page === 0} onClick={() => onPage(0)}><ChevronsLeft size={13} /></PgBtn>
            <PgBtn disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft size={13} /></PgBtn>
            <span className="min-w-[3rem] text-center text-xs font-medium tabular-nums text-gray-600">{page + 1}</span>
            <PgBtn disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}><ChevronRight size={13} /></PgBtn>
            <PgBtn disabled={page >= totalPages - 1} onClick={() => onPage(totalPages - 1)}><ChevronsRight size={13} /></PgBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   LEAD DRAWER
   ================================================================ */
function LeadDrawer({
  lead: l,
  onClose,
  onCopy,
  copied,
}: {
  lead: AttrLead;
  onClose: () => void;
  onCopy: (id: string, text: string) => void;
  copied: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Detalhes do lead</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="space-y-6 p-5">
          {/* Contact */}
          <Section title="Contato">
            <DrawerRow label="Nome" value={l.name} />
            <DrawerRow label="Email" value={l.email} copyId="d-email" onCopy={onCopy} copied={copied} />
            <DrawerRow label="Telefone" value={l.phone} copyId="d-phone" onCopy={onCopy} copied={copied} />
            <DrawerRow label="Data" value={`${fmtDate(l.receivedAt)} ${fmtTime(l.receivedAt)}`} />
          </Section>

          {/* Attribution */}
          <Section title="Atribuição">
            <DrawerRow label="Origem" value={l.origin} badge={ORIGIN_BADGE[l.origin]} />
            <DrawerRow label="Plataforma" value={l.platform} />
            <DrawerRow label="Posicionamento" value={l.placement} />
            <DrawerRow label="utm_source" value={l.utmSource} />
            <DrawerRow label="utm_medium" value={l.utmMedium} />
            <DrawerRow label="utm_campaign" value={l.utmCampaign} />
            <DrawerRow label="utm_content" value={l.utmContent} />
            <DrawerRow label="utm_term" value={l.utmTerm} />
            <DrawerRow label="Página de captura" value={l.paginaCaptura} />
          </Section>

          {/* Quality */}
          <Section title="Qualidade">
            <DrawerRow label="Leadscore" value={l.score != null ? String(l.score) : null} />
            <DrawerRow label="Faixa" value={l.grade} badge={l.grade ? GRADE_BADGE[l.grade] : undefined} />
          </Section>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {l.email && (
              <DrawerAction
                icon={<Mail size={13} />}
                label="Copiar email"
                onClick={() => onCopy("da-email", l.email!)}
                active={copied === "da-email"}
              />
            )}
            {l.phone && (
              <DrawerAction
                icon={<Phone size={13} />}
                label="Copiar telefone"
                onClick={() => onCopy("da-phone", l.phone!)}
                active={copied === "da-phone"}
              />
            )}
            <DrawerAction
              icon={<Copy size={13} />}
              label="Copiar UTMs"
              onClick={() => onCopy("da-utms", [l.utmSource, l.utmMedium, l.utmCampaign, l.utmContent, l.utmTerm].filter(Boolean).join(" | "))}
              active={copied === "da-utms"}
            />
            {l.paginaCaptura && (
              <DrawerAction icon={<ExternalLink size={13} />} label="Abrir página" onClick={() => window.open(l.paginaCaptura!, "_blank")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   LPs TAB
   ================================================================ */
function LpsTab({
  lps,
  insights,
  onOpenLead,
  onCopy,
  copied,
}: {
  lps: LpStats[];
  insights: string[];
  onOpenLead: (l: AttrLead) => void;
  onCopy: (id: string, text: string) => void;
  copied: string | null;
}) {
  const [drawerLp, setDrawerLp] = useState<LpStats | null>(null);
  const [compareLps, setCompareLps] = useState<[string, string] | null>(null);

  const totalLeads = lps.reduce((s, l) => s + l.count, 0);
  const avgDi = lps.length > 0 ? Math.round(lps.reduce((s, l) => s + l.decisionIndex, 0) / lps.length) : 0;
  const escalarCount = lps.filter((l) => l.recommendation === "Escalar").length;
  const pausarCount = lps.filter((l) => l.recommendation === "Pausar").length;

  const maxCount = Math.max(1, ...lps.map((l) => l.count));
  const maxScore = Math.max(1, ...lps.filter((l) => l.avgScore != null).map((l) => l.avgScore!));

  return (
    <div className="flex flex-col gap-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <KpiCard label="Landing Pages" value={lps.length} />
        <KpiCard label="Total de leads" value={totalLeads} />
        <KpiCard label="Índice médio" value={avgDi} accent={avgDi >= 60 ? "emerald" : avgDi >= 40 ? "amber" : "red"} />
        <KpiCard label="Escalar" value={escalarCount} accent="emerald" />
        <KpiCard label="Otimizar" value={lps.filter((l) => l.recommendation === "Otimizar").length} accent="amber" />
        <KpiCard label="Pausar" value={pausarCount} accent={pausarCount > 0 ? "red" : undefined} />
      </div>

      {/* Decision cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lps.slice(0, 6).map((lp) => (
          <button
            key={lp.raw}
            onClick={() => setDrawerLp(lp)}
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800">{lp.label}</span>
              <Badge cls={REC_BADGE[lp.recommendation]}>{lp.recommendation}</Badge>
            </div>
            <div className="text-xs text-gray-500 truncate">{lp.raw === "(sem página)" ? "Sem página identificada" : lp.raw}</div>
            <div className="mt-1 flex items-center gap-3">
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-[10px] text-gray-400">
                  <span>Índice de decisão</span>
                  <span className="font-semibold text-gray-700">{lp.decisionIndex}/100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${lp.decisionIndex >= 80 ? "bg-emerald-500" : lp.decisionIndex >= 60 ? "bg-blue-500" : lp.decisionIndex >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${lp.decisionIndex}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-gray-500">
              <span>{lp.count} leads</span>
              <span>Score {lp.avgScore ?? "—"}</span>
              <span>{lp.qualifiedPct}% qualificados</span>
            </div>
          </button>
        ))}
      </div>

      {/* Volume bars */}
      <Card title="Volume por Landing Page" icon={<BarChart3 size={14} className="text-blue-500" />}>
        <div className="space-y-2">
          {lps.map((lp) => (
            <button
              key={lp.raw}
              onClick={() => setDrawerLp(lp)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50"
            >
              <span className="min-w-[50px] text-sm font-semibold text-gray-700">{lp.label}</span>
              <div className="flex-1">
                <div className="h-5 overflow-hidden rounded bg-gray-100">
                  <div className="h-full rounded bg-blue-500" style={{ width: `${(lp.count / maxCount) * 100}%`, minWidth: lp.count > 0 ? "4px" : "0" }} />
                </div>
              </div>
              <span className="w-10 text-right text-xs font-semibold tabular-nums text-gray-700">{lp.count}</span>
              <span className="w-10 text-right text-xs tabular-nums text-gray-400">{lp.pct}%</span>
              <Badge cls={REC_BADGE[lp.recommendation]}>{lp.recommendation}</Badge>
            </button>
          ))}
        </div>
      </Card>

      {/* Scatter: Volume x Quality */}
      <Card title="Volume x Qualidade (Scatter)" icon={<Target size={14} className="text-purple-500" />}>
        <LpScatter lps={lps} onSelect={setDrawerLp} />
      </Card>

      {/* Quality bars */}
      <Card title="Score médio por LP">
        <div className="space-y-2">
          {lps.filter((l) => l.avgScore != null).map((lp) => (
            <div key={lp.raw} className="flex items-center gap-3">
              <span className="min-w-[50px] text-sm font-medium text-gray-700">{lp.label}</span>
              <div className="flex-1">
                <div className="h-5 overflow-hidden rounded bg-gray-100">
                  <div
                    className={`h-full rounded ${lp.avgScore! >= 70 ? "bg-emerald-500" : lp.avgScore! >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(100, lp.avgScore!)}%` }}
                  />
                </div>
              </div>
              <span className="w-10 text-right text-sm font-semibold tabular-nums">{lp.avgScore}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Grade distribution */}
      <Card title="Distribuição de faixa por LP">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-3 py-2">LP</th>
                <th className="px-3 py-2 text-center">A</th>
                <th className="px-3 py-2 text-center">B</th>
                <th className="px-3 py-2 text-center">C</th>
                <th className="px-3 py-2 text-center">D</th>
                <th className="px-3 py-2 text-center">S/ nota</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">% Qualif.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lps.map((lp) => {
                const graded = (lp.grades.A ?? 0) + (lp.grades.B ?? 0) + (lp.grades.C ?? 0) + (lp.grades.D ?? 0);
                return (
                  <tr key={lp.raw} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDrawerLp(lp)}>
                    <td className="px-3 py-2 font-medium text-gray-700">{lp.label}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{lp.grades.A ?? 0}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{lp.grades.B ?? 0}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{lp.grades.C ?? 0}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{lp.grades.D ?? 0}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-gray-400">{lp.count - graded}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{lp.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={lp.qualifiedPct >= 50 ? "text-emerald-600 font-semibold" : lp.qualifiedPct >= 25 ? "text-amber-600" : "text-red-500"}>{lp.qualifiedPct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Comparison */}
      {lps.length >= 2 && (
        <Card title="Comparar LPs" icon={<ArrowUpDown size={14} className="text-indigo-500" />}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={compareLps?.[0] ?? ""}
              onChange={(e) => setCompareLps([e.target.value, compareLps?.[1] ?? lps[1]?.raw ?? ""])}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none"
            >
              <option value="">LP A</option>
              {lps.map((l) => <option key={l.raw} value={l.raw}>{l.label} — {l.raw === "(sem página)" ? "sem página" : l.raw}</option>)}
            </select>
            <span className="text-xs text-gray-400">vs</span>
            <select
              value={compareLps?.[1] ?? ""}
              onChange={(e) => setCompareLps([compareLps?.[0] ?? lps[0]?.raw ?? "", e.target.value])}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none"
            >
              <option value="">LP B</option>
              {lps.map((l) => <option key={l.raw} value={l.raw}>{l.label} — {l.raw === "(sem página)" ? "sem página" : l.raw}</option>)}
            </select>
          </div>
          {compareLps && compareLps[0] && compareLps[1] && (() => {
            const a = lps.find((l) => l.raw === compareLps[0]);
            const b = lps.find((l) => l.raw === compareLps[1]);
            if (!a || !b) return null;
            const rows: { label: string; va: string; vb: string; winner: "a" | "b" | "tie" }[] = [
              { label: "Leads", va: String(a.count), vb: String(b.count), winner: a.count > b.count ? "a" : a.count < b.count ? "b" : "tie" },
              { label: "Score médio", va: a.avgScore != null ? String(a.avgScore) : "—", vb: b.avgScore != null ? String(b.avgScore) : "—", winner: (a.avgScore ?? 0) > (b.avgScore ?? 0) ? "a" : (a.avgScore ?? 0) < (b.avgScore ?? 0) ? "b" : "tie" },
              { label: "% Qualificados", va: `${a.qualifiedPct}%`, vb: `${b.qualifiedPct}%`, winner: a.qualifiedPct > b.qualifiedPct ? "a" : a.qualifiedPct < b.qualifiedPct ? "b" : "tie" },
              { label: "% Fracos", va: `${a.weakPct}%`, vb: `${b.weakPct}%`, winner: a.weakPct < b.weakPct ? "a" : a.weakPct > b.weakPct ? "b" : "tie" },
              { label: "Índice de decisão", va: String(a.decisionIndex), vb: String(b.decisionIndex), winner: a.decisionIndex > b.decisionIndex ? "a" : a.decisionIndex < b.decisionIndex ? "b" : "tie" },
              { label: "Recomendação", va: a.recommendation, vb: b.recommendation, winner: "tie" },
            ];
            return (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-3 py-2">Métrica</th>
                    <th className="px-3 py-2 text-right">{a.label}</th>
                    <th className="px-3 py-2 text-right">{b.label}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <td className="px-3 py-2 text-gray-600">{r.label}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${r.winner === "a" ? "text-emerald-600" : "text-gray-700"}`}>{r.va}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${r.winner === "b" ? "text-emerald-600" : "text-gray-700"}`}>{r.vb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </Card>
      )}

      {/* Detail table */}
      <Card title="Detalhes por Landing Page">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-3 py-2">LP</th>
                <th className="px-3 py-2">Página</th>
                <th className="px-3 py-2 text-right">Leads</th>
                <th className="px-3 py-2 text-right">%</th>
                <th className="px-3 py-2 text-right">Avg</th>
                <th className="px-3 py-2 text-right">Med</th>
                <th className="px-3 py-2 text-right">Min</th>
                <th className="px-3 py-2 text-right">Max</th>
                <th className="px-3 py-2 text-right">Qualif.</th>
                <th className="px-3 py-2 text-center">Índice</th>
                <th className="px-3 py-2">Recomendação</th>
                <th className="px-3 py-2">Origem</th>
                <th className="px-3 py-2">Último</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lps.map((lp) => (
                <tr key={lp.raw} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDrawerLp(lp)}>
                  <td className="px-3 py-2 font-semibold text-gray-700">{lp.label}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-gray-500">{lp.raw}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{lp.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-400">{lp.pct}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{lp.avgScore ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{lp.medianScore ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-400">{lp.minScore ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-400">{lp.maxScore ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className={lp.qualifiedPct >= 50 ? "text-emerald-600 font-semibold" : lp.qualifiedPct >= 25 ? "text-amber-600" : "text-red-500"}>{lp.qualifiedPct}%</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-bold tabular-nums ${lp.decisionIndex >= 80 ? "text-emerald-600" : lp.decisionIndex >= 60 ? "text-blue-600" : lp.decisionIndex >= 40 ? "text-amber-600" : "text-red-500"}`}>{lp.decisionIndex}</span>
                  </td>
                  <td className="px-3 py-2"><Badge cls={REC_BADGE[lp.recommendation]}>{lp.recommendation}</Badge></td>
                  <td className="px-3 py-2 text-gray-500">{lp.topOrigin ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-400">{fmtAgo(lp.lastLead)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card title="Insights de Landing Pages" icon={<Lightbulb size={14} className="text-amber-500" />}>
          <ul className="space-y-1.5">
            {insights.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* LP Drawer */}
      {drawerLp && (
        <LpDrawer lp={drawerLp} onClose={() => setDrawerLp(null)} onOpenLead={onOpenLead} onCopy={onCopy} copied={copied} />
      )}
    </div>
  );
}

/* LP Scatter plot */
function LpScatter({ lps, onSelect }: { lps: LpStats[]; onSelect: (lp: LpStats) => void }) {
  const scored = lps.filter((l) => l.avgScore != null && l.count > 0);
  if (scored.length === 0) return <p className="py-8 text-center text-xs text-gray-400">Nenhum leadscore disponível.</p>;

  const w = 640, h = 300, px = 48, pt = 20, pb = 36, pr = 20;
  const maxC = Math.max(1, ...scored.map((l) => l.count));
  const maxS = Math.max(1, ...scored.map((l) => l.avgScore!));
  const xOf = (c: number) => px + ((w - px - pr) * c) / maxC;
  const yOf = (s: number) => pt + (h - pt - pb) * (1 - s / maxS);
  const midX = xOf(maxC / 2), midY = yOf(maxS / 2);

  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#6b7280", "#ec4899"];

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3">
        {scored.map((lp, i) => (
          <div key={lp.raw} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {lp.label}
          </div>
        ))}
      </div>
      <div className="relative overflow-hidden" style={{ maxHeight: "340px" }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" preserveAspectRatio="xMidYMid meet">
          {/* Quadrant lines */}
          <line x1={midX} x2={midX} y1={pt} y2={h - pb} stroke="var(--color-gray-200)" strokeWidth={1} strokeDasharray="4 4" />
          <line x1={px} x2={w - pr} y1={midY} y2={midY} stroke="var(--color-gray-200)" strokeWidth={1} strokeDasharray="4 4" />
          {/* Quadrant labels */}
          <text x={px + 4} y={pt + 14} fontSize={9} fill="var(--color-gray-300)">Alto score / Baixo vol.</text>
          <text x={w - pr - 4} y={pt + 14} fontSize={9} fill="var(--color-gray-300)" textAnchor="end">Alto score / Alto vol.</text>
          <text x={px + 4} y={h - pb - 6} fontSize={9} fill="var(--color-gray-300)">Baixo score / Baixo vol.</text>
          <text x={w - pr - 4} y={h - pb - 6} fontSize={9} fill="var(--color-gray-300)" textAnchor="end">Baixo score / Alto vol.</text>
          {/* Axes */}
          <line x1={px} x2={w - pr} y1={h - pb} y2={h - pb} stroke="var(--color-gray-300)" strokeWidth={1} />
          <line x1={px} x2={px} y1={pt} y2={h - pb} stroke="var(--color-gray-300)" strokeWidth={1} />
          <text x={w / 2} y={h - 4} fontSize={10} fill="var(--color-gray-400)" textAnchor="middle">Volume</text>
          <text x={12} y={h / 2} fontSize={10} fill="var(--color-gray-400)" textAnchor="middle" transform={`rotate(-90, 12, ${h / 2})`}>Score</text>
          {/* Dots */}
          {scored.map((lp, i) => {
            const cx = xOf(lp.count);
            const cy = yOf(lp.avgScore!);
            const r = Math.max(6, Math.min(18, 4 + lp.count * 0.5));
            return (
              <g key={lp.raw} className="cursor-pointer" onClick={() => onSelect(lp)}>
                <circle cx={cx} cy={cy} r={r} fill={COLORS[i % COLORS.length]} opacity={0.7} stroke="#fff" strokeWidth={2} />
                <text x={cx} y={cy - r - 4} fontSize={10} fill="var(--color-gray-600)" textAnchor="middle" fontWeight={600}>{lp.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* LP detail drawer */
function LpDrawer({
  lp,
  onClose,
  onOpenLead,
  onCopy,
  copied,
}: {
  lp: LpStats;
  onClose: () => void;
  onOpenLead: (l: AttrLead) => void;
  onCopy: (id: string, text: string) => void;
  copied: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{lp.label}</h3>
            <p className="text-xs text-gray-500 truncate max-w-[300px]">{lp.raw}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="space-y-6 p-5">
          {/* Recommendation + index */}
          <div className="flex items-center gap-3">
            <Badge cls={REC_BADGE[lp.recommendation]}>{lp.recommendation}</Badge>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-[10px] text-gray-400">
                <span>Índice de decisão</span>
                <span className="font-semibold text-gray-700">{lp.decisionIndex}/100</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${lp.decisionIndex >= 80 ? "bg-emerald-500" : lp.decisionIndex >= 60 ? "bg-blue-500" : lp.decisionIndex >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${lp.decisionIndex}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metrics */}
          <Section title="Métricas">
            <div className="grid grid-cols-2 gap-2">
              <DrawerRow label="Leads" value={String(lp.count)} />
              <DrawerRow label="% do total" value={`${lp.pct}%`} />
              <DrawerRow label="Score médio" value={lp.avgScore != null ? String(lp.avgScore) : "—"} />
              <DrawerRow label="Mediana" value={lp.medianScore != null ? String(lp.medianScore) : "—"} />
              <DrawerRow label="Min / Max" value={lp.minScore != null ? `${lp.minScore} / ${lp.maxScore}` : "—"} />
              <DrawerRow label="% Qualificados" value={`${lp.qualifiedPct}%`} />
              <DrawerRow label="% Fracos" value={`${lp.weakPct}%`} />
              <DrawerRow label="Origem principal" value={lp.topOrigin} />
              <DrawerRow label="Campanha principal" value={lp.topCampaign} />
              <DrawerRow label="Último lead" value={fmtAgo(lp.lastLead)} />
            </div>
          </Section>

          {/* Grade distribution bar */}
          <Section title="Faixas">
            <div className="flex gap-1">
              {["A", "B", "C", "D"].map((g) => {
                const n = lp.grades[g] ?? 0;
                const pct = lp.count > 0 ? (n / lp.count) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={g}
                    className={`flex items-center justify-center rounded text-[10px] font-bold text-white ${g === "A" ? "bg-emerald-500" : g === "B" ? "bg-blue-500" : g === "C" ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${pct}%`, minWidth: "24px", height: "24px" }}
                  >
                    {g}:{n}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Daily mini chart */}
          <Section title="Volume diário">
            <LpMiniChart daily={lp.daily} />
          </Section>

          {/* Recent leads */}
          <Section title="Leads recentes">
            <div className="space-y-1">
              {lp.recentLeads.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onOpenLead(l)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-700">{l.name ?? l.email ?? "—"}</span>
                  <span className="text-gray-400">{fmtDate(l.receivedAt)}</span>
                  {l.grade && <Badge cls={GRADE_BADGE[l.grade]}>{l.grade}</Badge>}
                  {l.score != null && <span className="ml-auto tabular-nums text-gray-500">{l.score}</span>}
                </button>
              ))}
            </div>
          </Section>

          {/* Copy action */}
          <div className="flex flex-wrap gap-2">
            <DrawerAction
              icon={<Copy size={13} />}
              label="Copiar URL"
              onClick={() => onCopy("lp-url", lp.raw)}
              active={copied === "lp-url"}
            />
            {lp.raw !== "(sem página)" && (
              <DrawerAction icon={<ExternalLink size={13} />} label="Abrir página" onClick={() => window.open(lp.raw, "_blank")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* LP mini daily chart */
function LpMiniChart({ daily }: { daily: { day: string; count: number }[] }) {
  const max = Math.max(1, ...daily.map((d) => d.count));
  const w = 400, h = 60, px = 4, pt = 4, pb = 14;
  const n = daily.length;
  const step = n > 1 ? (w - px * 2) / (n - 1) : 0;
  const yOf = (v: number) => pt + (h - pt - pb) * (1 - v / max);
  const line = daily.map((d, i) => `${(px + i * step).toFixed(1)},${yOf(d.count).toFixed(1)}`).join(" ");
  const tickEvery = Math.ceil(n / 6);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" preserveAspectRatio="xMidYMid meet">
      <polyline points={line} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {daily.map((d, i) => i % tickEvery === 0 && (
        <text key={i} x={px + i * step} y={h - 2} fontSize={8} fill="var(--color-gray-400)" textAnchor="middle">{d.day}</text>
      ))}
    </svg>
  );
}

/* ================================================================
   SHARED COMPONENTS
   ================================================================ */
function KpiCard({ label, value, accent, small }: { label: string; value: string | number; accent?: string; small?: boolean }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-500",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</div>
      <div className={`mt-0.5 font-semibold ${small ? "text-xs" : "text-lg tabular-nums"} ${accent ? colorMap[accent] ?? "text-gray-800" : "text-gray-800"}`}>
        {value}
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      {label}
      <button onClick={onClear} className="rounded-full p-0.5 hover:bg-blue-100"><X size={10} /></button>
    </span>
  );
}

function PgBtn({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button disabled={disabled} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200/60 disabled:text-gray-300">
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DrawerRow({
  label,
  value,
  badge,
  copyId,
  onCopy,
  copied,
}: {
  label: string;
  value: string | null | undefined;
  badge?: string;
  copyId?: string;
  onCopy?: (id: string, text: string) => void;
  copied?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        {badge && value ? (
          <Badge cls={badge}>{value}</Badge>
        ) : (
          <span className="text-sm text-gray-700">{value || "—"}</span>
        )}
        {copyId && onCopy && value && (
          <button onClick={() => onCopy(copyId, value)} className="rounded p-0.5 text-gray-300 hover:text-gray-600">
            {copied === copyId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
          </button>
        )}
      </div>
    </div>
  );
}

function DrawerAction({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
    >
      {active ? <Check size={13} className="text-emerald-500" /> : icon}
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white py-24 text-center" style={{ minHeight: "400px" }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <GitFork size={28} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">Nenhum dado de atribuição encontrado.</p>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-gray-400">
          Os leads ainda não possuem UTMs, plataforma ou posicionamento identificados.
        </p>
      </div>
      <a href="/planilhas" className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-medium text-white hover:bg-blue-700">
        Ver planilhas
      </a>
    </div>
  );
}

/* Daily line chart (simple SVG) */
function DailyChart({ points, keys }: { points: DailyPoint[]; keys: string[] }) {
  if (points.length === 0) return <p className="py-8 text-center text-xs text-gray-400">Sem dados no período.</p>;

  const COLORS = ["#2563eb", "#10b981", "#6b7280", "#f59e0b", "#a855f7", "#14b8a6", "#ef4444"];
  const w = 640, h = 160, px = 8, pt = 12, pb = 24;
  const allVals = points.flatMap((p) => Object.values(p.series));
  const max = Math.max(1, ...allVals);
  const n = points.length;
  const step = n > 1 ? (w - px * 2) / (n - 1) : 0;
  const yOf = (v: number) => pt + (h - pt - pb) * (1 - v / max);
  const xOf = (i: number) => px + i * step;
  const tickEvery = Math.ceil(n / 7);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        {keys.map((k, i) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {k}
          </div>
        ))}
      </div>
      <div className="relative overflow-hidden" style={{ maxHeight: "200px" }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" preserveAspectRatio="xMidYMid meet">
          {[0, 0.5, 1].map((f, i) => (
            <line key={i} x1={px} x2={w - px} y1={pt + (h - pt - pb) * f} y2={pt + (h - pt - pb) * f} stroke="var(--color-gray-200)" strokeWidth={1} strokeDasharray="3 4" />
          ))}
          {keys.map((k, ki) => {
            const color = COLORS[ki % COLORS.length];
            const line = points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.series[k] ?? 0).toFixed(1)}`).join(" ");
            return <polyline key={k} points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />;
          })}
          {points.map((p, i) => i % tickEvery === 0 && (
            <text key={i} x={xOf(i)} y={h - 6} fontSize={10} fill="var(--color-gray-400)" textAnchor="middle">{p.label}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* Top values bar chart */
function TopValuesChart({ data, field }: { data: AttrData; field: "utmSource" | "utmMedium" | "utmCampaign" | "utmContent" }) {
  const counts = new Map<string, number>();
  for (const l of data.leads) {
    const v = l[field];
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] ?? 1;

  if (sorted.length === 0) return <p className="py-6 text-center text-xs text-gray-400">Nenhum valor encontrado.</p>;

  return (
    <div className="space-y-2">
      {sorted.map(([label, count]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="min-w-[100px] truncate text-xs font-medium text-gray-700">{label}</span>
          <div className="flex-1">
            <div className="h-4 overflow-hidden rounded bg-gray-100">
              <div className="h-full rounded bg-blue-500" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </div>
          <span className="w-8 text-right text-xs font-semibold tabular-nums text-gray-700">{count}</span>
        </div>
      ))}
    </div>
  );
}
