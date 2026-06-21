"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DashboardV2Data, RecentLead, GroupStats, LpStats, Insight, Period, OriginAnalysis, UtmRow, UtmDimRow, OriginUtmTables, SurveyData } from "@/lib/dashboard-v2";
import {
  Users, Award, TrendingUp, Target, BarChart3, RefreshCw,
  CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Search, Copy, Check, RotateCw, Inbox, Clock, Info,
  ChevronRight, Activity, XCircle, Eye, X, Link2,
  Download, Share2, Filter, Zap, Globe, Smartphone,
  Monitor, MapPin, FileText, GitBranch, Settings,
  ChevronDown, ExternalLink, Layers
} from "lucide-react";
import Sparkline from "./sparkline";
import { ComboChart } from "./combo-chart";
import { DonutChart } from "./donut-chart";
import { HorizontalBars } from "./horizontal-bars";
import { ScatterPlot } from "./scatter-plot";
import { StackedBars } from "./stacked-bars";
import { ScoreBadge, SyncBadge } from "./badges";
import PesquisaTab from "./pesquisa-tab";

type Props = {
  data: DashboardV2Data;
  period: Period;
  sourceSlug: string | undefined;
};

const TABS = [
  { key: "captacao", label: "Captação", icon: Zap },
  { key: "pesquisa", label: "Pesquisa", icon: Search },
  { key: "origem", label: "Origem", icon: Globe },
  { key: "plataformas", label: "Plataformas", icon: Smartphone },
  { key: "lps", label: "LPs", icon: FileText },
  { key: "insights", label: "Insights", icon: Layers },
  { key: "leads", label: "Leads", icon: Users },
  { key: "sync", label: "Sincronização", icon: GitBranch },
] as const;

const LEAD_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "qualified", label: "Qualificados" },
  { key: "A", label: "Faixa A" },
  { key: "B", label: "Faixa B" },
  { key: "noUtm", label: "Sem UTM" },
  { key: "pending", label: "Pendentes" },
  { key: "failed", label: "Falharam" },
] as const;

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
      up ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
    }`}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(value)}%
    </span>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function normalizeLpLabel(raw: string | null): string {
  if (!raw) return "(sem página)";
  const lower = raw.toLowerCase();
  const m1 = lower.match(/lp=lp(\d+)/);
  if (m1) return `LP${m1[1].padStart(2, "0")}`;
  const m2 = lower.match(/lp(\d+)/);
  if (m2) return `LP${m2[1].padStart(2, "0")}`;
  return raw;
}

function topGradeFromMap(grades: Record<string, number>): string | null {
  let best: string | null = null;
  let max = 0;
  for (const [k, v] of Object.entries(grades)) {
    if (k !== "none" && v > max) { max = v; best = k; }
  }
  return best;
}

function InsightIcon({ name, type }: { name: string; type: string }) {
  const cls = `shrink-0 mt-0.5 ${
    type === "danger" ? "text-red-500" :
    type === "warning" ? "text-amber-500" :
    type === "success" ? "text-green-500" : "text-blue-500"
  }`;
  switch (name) {
    case "AlertTriangle": return <AlertTriangle size={14} className={cls} />;
    case "TrendingUp": return <TrendingUp size={14} className={cls} />;
    case "BarChart3": return <BarChart3 size={14} className={cls} />;
    case "XCircle": return <XCircle size={14} className={cls} />;
    case "Clock": return <Clock size={14} className={cls} />;
    case "CheckCircle": return <CheckCircle2 size={14} className={cls} />;
    default: return <Info size={14} className={cls} />;
  }
}

function RecommendationBadge({ rec }: { rec: string }) {
  const cls = rec === "Escalar" ? "bg-green-50 text-green-700" :
              rec === "Manter" ? "bg-blue-50 text-blue-700" :
              rec === "Otimizar" ? "bg-amber-50 text-amber-700" :
              rec === "Pausar" ? "bg-red-50 text-red-700" :
              "bg-gray-100 text-gray-600";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{rec}</span>;
}

function OriginRecommendationBadge({ rec }: { rec: string }) {
  const cls = rec === "Escalar" ? "bg-green-50 text-green-700" :
              rec === "Manter" ? "bg-blue-50 text-blue-700" :
              rec === "Otimizar" ? "bg-amber-50 text-amber-700" :
              rec === "Pausar" ? "bg-red-50 text-red-700" :
              rec === "Corrigir UTM" ? "bg-orange-50 text-orange-700" :
              "bg-gray-100 text-gray-600";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${cls}`}>{rec}</span>;
}

function KpiCard({ label, value, sub, color, delta }: {
  label: string; value: string; sub?: string; color?: string; delta?: number;
}) {
  const bg = color === "green" ? "bg-green-500/10" :
             color === "blue" ? "bg-blue-500/10" :
             color === "amber" ? "bg-amber-500/10" :
             color === "red" ? "bg-red-500/10" :
             color === "violet" ? "bg-violet-500/10" : "";
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {delta != null && delta !== 0 && <Delta value={delta} />}
      </div>
      <div className="mt-1 text-3xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function EmptyState({ msg, sub }: { msg: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12">
      <Inbox size={28} className="text-gray-300" />
      <p className="text-sm font-medium text-gray-600">{msg}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

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

function MetaExportBtn() {
  return (
    <a
      href="/api/export/meta"
      title="Exporta nome, email e telefone (emails únicos) para subir no Meta Ads"
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
    >
      CSV Meta Ads
    </a>
  );
}

export default function DashboardShell({ data, period, sourceSlug }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("captacao");
  const [search, setSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<RecentLead | null>(null);
  const [platformTab, setPlatformTab] = useState(data.platforms[0]?.label ?? "");
  const [originTabKey, setOriginTabKey] = useState("Meta Ads");
  const [captacaoPlatTab, setCaptacaoPlatTab] = useState("Meta Ads");
  const [selectedOrigin, setSelectedOrigin] = useState<OriginAnalysis | null>(null);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setSecs(s => s + 1), 1000);
    const refresh = setInterval(() => { router.refresh(); setSecs(0); }, 30000);
    return () => { clearInterval(tick); clearInterval(refresh); };
  }, [router]);

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

  const copyContact = async (lead: RecentLead) => {
    const text = [lead.name, lead.email, lead.phone].filter(Boolean).join(" — ");
    await navigator.clipboard.writeText(text);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const copyUtms = async (lead: RecentLead) => {
    const parts = [
      lead.utmSource && `utm_source=${lead.utmSource}`,
      lead.utmMedium && `utm_medium=${lead.utmMedium}`,
      lead.utmCampaign && `utm_campaign=${lead.utmCampaign}`,
      lead.utmContent && `utm_content=${lead.utmContent}`,
      lead.utmTerm && `utm_term=${lead.utmTerm}`,
    ].filter(Boolean);
    await navigator.clipboard.writeText(parts.join("&"));
  };

  const filteredLeads = data.recentLeads.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      if (!(l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q))) return false;
    }
    if (leadFilter === "all") return true;
    if (leadFilter === "qualified") return l.grade === "A" || l.grade === "B" || (l.score != null && l.score >= 70);
    if (leadFilter === "A") return l.grade === "A";
    if (leadFilter === "B") return l.grade === "B";
    if (leadFilter === "noUtm") return !l.utmSource && !l.utmMedium && !l.utmCampaign;
    if (leadFilter === "pending") return l.syncLogs.some(s => s.status === "pending");
    if (leadFilter === "failed") return l.syncLogs.some(s => s.status === "failed");
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Visão geral da captação, qualidade dos leads e performance por origem.
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Ao vivo
            </span>
            <span className="text-[11px] text-gray-400">Atualizado há {secs}s</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            {(["today", "7d", "30d"] as const).map(p => (
              <button key={p} onClick={() => handlePeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}>
                {p === "today" ? "Hoje" : p === "7d" ? "7 dias" : "30 dias"}
              </button>
            ))}
          </div>
          <select value={sourceSlug ?? ""} onChange={e => handleSource(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm">
            <option value="">Todas as fontes</option>
            {data.sources.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
          <ExportBtn />
          <MetaExportBtn />
          <button onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === t.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Captação */}
      {activeTab === "captacao" && (() => {
        const qualifiedCount = data.qualifiedLeads;
        const notQualifiedCount = data.totalLeads - qualifiedCount;
        const metaLabels = ["Facebook", "Instagram", "Meta Ads"];
        const googleLabels = ["Google", "Google Ads"];
        const metaPlats = data.platforms.filter(p => metaLabels.includes(p.label));
        const googlePlats = data.platforms.filter(p => googleLabels.includes(p.label));
        const mergePlats = (plats: typeof data.platforms): typeof data.platforms[0] | null => {
          if (plats.length === 0) return null;
          const count = plats.reduce((s, p) => s + p.count, 0);
          const scores = plats.flatMap(p => p.avgScore != null ? [p.avgScore * p.count] : []);
          const totalScored = plats.reduce((s, p) => s + (p.avgScore != null ? p.count : 0), 0);
          const daily = plats[0].daily.map((d, i) => ({
            label: d.label,
            count: plats.reduce((s, p) => s + (p.daily[i]?.count ?? 0), 0),
          }));
          const grades: Record<string, number> = {};
          plats.forEach(p => Object.entries(p.grades).forEach(([k, v]) => { grades[k] = (grades[k] ?? 0) + v; }));
          return { ...plats[0], label: plats.map(p => p.label).join(" + "), count, avgScore: totalScored > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalScored) : null, qualifiedPct: count > 0 ? Math.round(plats.reduce((s, p) => s + p.count * p.qualifiedPct / 100, 0) / count * 100) : 0, daily, grades };
        };
        const platMeta = mergePlats(metaPlats);
        const platGoogle = mergePlats(googlePlats);
        const PLAT_TABS = ["Meta Ads", "Google Ads"] as const;
        type PlatTab = typeof PLAT_TABS[number];
        const activePlat = captacaoPlatTab as PlatTab;
        const selectedPlat = activePlat === "Meta Ads" ? platMeta : platGoogle;

        return (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs" style={{ color: "#8b949e" }}>Visão geral do desempenho da captação com volume, qualidade e evolução temporal.</p>
          </div>

          {/* 1. KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-13 gap-2">
            <KpiCard label="Leads reais totais" value={data.totalLeads.toLocaleString("pt-BR")} delta={data.totalDelta} />
            <KpiCard label="Leads qualificados (MQL)" value={qualifiedCount.toLocaleString("pt-BR")} sub={`${data.qualificationRate}%`} delta={data.qualifiedDelta} color="green" />
            <KpiCard label="CPA tráfego" value="—" sub="não conectado" />
            <KpiCard label="Valor investido" value="—" sub="não conectado" />
            <KpiCard label="Falta para a meta" value="—" sub="não configurado" />
            <KpiCard label="Falta investir" value="—" sub="não configurado" />
            <KpiCard label="Taxa resp. pesquisa" value="—" sub="indisponível" />
            <KpiCard label="Leads no WhatsApp" value="—" sub="indisponível" />
            <KpiCard label="Taxa leads WhatsApp" value="—" sub="indisponível" />
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm" style={{ background: "rgba(34,197,94,0.08)" }}>
              <div className="text-[11px] font-medium" style={{ color: "#8b949e" }}>Leads faixa A (ótimos)</div>
              <div className="mt-1 text-xl font-bold text-green-400">{data.gradePcts.A}%</div>
              <div className="text-[10px] text-gray-400">{data.grades.A} leads</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm" style={{ background: "rgba(59,130,246,0.08)" }}>
              <div className="text-[11px] font-medium" style={{ color: "#8b949e" }}>Leads faixa B (bons)</div>
              <div className="mt-1 text-xl font-bold text-blue-400">{data.gradePcts.B}%</div>
              <div className="text-[10px] text-gray-400">{data.grades.B} leads</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm" style={{ background: "rgba(245,158,11,0.08)" }}>
              <div className="text-[11px] font-medium" style={{ color: "#8b949e" }}>Leads faixa C (médium)</div>
              <div className="mt-1 text-xl font-bold text-amber-400">{data.gradePcts.C}%</div>
              <div className="text-[10px] text-gray-400">{data.grades.C} leads</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm" style={{ background: "rgba(239,68,68,0.08)" }}>
              <div className="text-[11px] font-medium" style={{ color: "#8b949e" }}>Leads faixa D (péssimos)</div>
              <div className="mt-1 text-xl font-bold text-red-400">{data.gradePcts.D}%</div>
              <div className="text-[10px] text-gray-400">{data.grades.D} leads</div>
            </div>
          </div>

          {/* 2. Desempenho geral da captação */}
          <div className="rounded-xl p-5" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
            <div className="mb-4 text-base font-semibold" style={{ color: "#c9d1d9" }}>Desempenho geral da captação</div>
            <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-5">
              {/* GRÁFICO 1 — Evolução geral da captação */}
              <div className="rounded-lg p-4" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "#c9d1d9" }}>Evolução geral da captação</span>
                  <span className="text-[11px]" style={{ color: "#484f58" }}>últimos {data.periodDays} dias</span>
                </div>
                {data.dailyChart.every(d => d.leads === 0) ? (
                  <EmptyState msg="Sem leads no período" />
                ) : (
                  <ComboChart
                    data={data.dailyChart.map(d => ({
                      label: d.label,
                      bar: d.leads,
                      lines: { score: d.avgScore ?? 0, qualified: d.qualifiedCount },
                    }))}
                    barLabel="Leads"
                    barColor="#58a6ff"
                    height={320}
                    lines={[
                      { key: "score", color: "#d29922", label: "Score médio" },
                      { key: "qualified", color: "#3fb950", label: "Qualificados" },
                    ]}
                  />
                )}
              </div>

              {/* GRÁFICO 2 — Distribuição da qualidade */}
              <div className="rounded-lg p-4" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                <div className="mb-3 text-sm font-semibold" style={{ color: "#c9d1d9" }}>Distribuição da qualidade dos leads</div>
                <DonutChart data={[
                  { label: "Leads quentes", value: qualifiedCount, color: "#f85149" },
                  { label: "Leads frios", value: notQualifiedCount, color: "#58a6ff" },
                ].filter(s => s.value > 0)} />
              </div>
            </div>
          </div>

          {/* 3. Desempenho por plataformas */}
          <div className="rounded-xl p-5" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
            <div className="mb-4 text-base font-semibold" style={{ color: "#c9d1d9" }}>Desempenho por plataformas</div>
            {/* Platform sub-tabs */}
            <div className="flex items-center gap-6 mb-5 border-b pb-0" style={{ borderColor: "#30363d" }}>
              {PLAT_TABS.map(t => (
                <button key={t} onClick={() => setCaptacaoPlatTab(t)}
                  className="pb-2 text-sm font-medium transition-colors border-b-2"
                  style={{
                    borderColor: activePlat === t ? "#58a6ff" : "transparent",
                    color: activePlat === t ? "#58a6ff" : "#8b949e",
                  }}>{t}</button>
              ))}
            </div>

            {selectedPlat ? (
              <div className="space-y-5">
                {/* 4.1 Cards de plataforma */}
                <div className="flex gap-3">
                  <div className="rounded-lg px-5 py-3" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                    <div className="text-[11px]" style={{ color: "#8b949e" }}>Leads gerados</div>
                    <div className="text-2xl font-bold" style={{ color: "#c9d1d9" }}>{selectedPlat.count.toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="rounded-lg px-5 py-3" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                    <div className="text-[11px]" style={{ color: "#8b949e" }}>CPA</div>
                    <div className="text-2xl font-bold" style={{ color: "#c9d1d9" }}>—</div>
                  </div>
                  <div className="rounded-lg px-5 py-3" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                    <div className="text-[11px]" style={{ color: "#8b949e" }}>Gasto</div>
                    <div className="text-2xl font-bold" style={{ color: "#c9d1d9" }}>—</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* GRÁFICO 3 — Leads e custo por plataforma */}
                  <div className="rounded-lg p-4" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                    <div className="mb-3 text-sm font-semibold" style={{ color: "#c9d1d9" }}>Leads e custo por plataforma ao longo do tempo</div>
                    {selectedPlat.daily.length > 0 ? (
                      <ComboChart
                        data={selectedPlat.daily.map(d => ({
                          label: d.label,
                          bar: d.count,
                        }))}
                        barLabel="Leads"
                        barColor="#58a6ff"
                        height={240}
                      />
                    ) : (
                      <EmptyState msg="Sem dados diários" />
                    )}
                  </div>

                  {/* GRÁFICO 4 — Donut leads quentes/frios por plataforma */}
                  <div className="rounded-lg p-4" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                    <div className="mb-3 text-sm font-semibold" style={{ color: "#c9d1d9" }}>Distribuição de leads por temperatura</div>
                    {(() => {
                      const platQual = Math.round(selectedPlat.count * (selectedPlat.qualifiedPct / 100));
                      const platNotQual = selectedPlat.count - platQual;
                      return (
                        <DonutChart data={[
                          { label: "Leads quentes", value: platQual, color: "#f85149" },
                          { label: "Leads frios", value: platNotQual, color: "#58a6ff" },
                        ].filter(s => s.value > 0)} />
                      );
                    })()}
                  </div>
                </div>

                {/* GRÁFICO 5 — Indicadores da plataforma (CPM/CTR/Conversão/Connect rate) */}
                <div className="rounded-lg p-4" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                  <div className="mb-3 text-sm font-semibold" style={{ color: "#c9d1d9" }}>Indicadores da plataforma ao longo do tempo</div>
                  <div className="flex gap-3 mb-3">
                    {[
                      { label: "CPM", value: "—" },
                      { label: "CTR", value: "—" },
                      { label: "Connect rate", value: "—" },
                      { label: "Conversão", value: "—" },
                    ].map(m => (
                      <div key={m.label} className="rounded-lg px-4 py-2" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                        <div className="text-[10px]" style={{ color: "#8b949e" }}>{m.label}</div>
                        <div className="text-lg font-bold" style={{ color: "#c9d1d9" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center py-10" style={{ color: "#484f58" }}>
                    <div className="text-center">
                      <div className="text-sm">Dados de mídia paga não conectados</div>
                      <div className="text-[11px] mt-1">Conecte Meta Ads ou Google Ads para visualizar CPM, CTR, Conversão e Connect rate</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg p-8 text-center" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                <div className="text-sm" style={{ color: "#484f58" }}>Sem dados para {activePlat}</div>
                <div className="text-[11px] mt-1" style={{ color: "#30363d" }}>Conecte a plataforma para visualizar métricas de captação</div>
              </div>
            )}
          </div>

          {/* 4. Comparativo de qualidade */}
          <div className="rounded-xl p-5" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
            <div className="mb-4 text-base font-semibold" style={{ color: "#c9d1d9" }}>Comparativo de qualidade</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* GRÁFICO 6 — Leadscore médio ao longo do tempo */}
              <div className="rounded-lg p-4" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                <div className="mb-3 text-sm font-semibold" style={{ color: "#c9d1d9" }}>Leadscore médio ao longo do tempo</div>
                {data.dailyChart.some(d => d.avgScore != null && d.avgScore > 0) ? (
                  <ComboChart
                    data={data.dailyChart.map(d => ({
                      label: d.label,
                      bar: 0,
                      lines: { score: d.avgScore ?? 0 },
                    }))}
                    barLabel=""
                    barColor="transparent"
                    height={240}
                    lines={[
                      { key: "score", color: "#a371f7", label: "Score médio" },
                    ]}
                  />
                ) : (
                  <EmptyState msg="Sem dados de score no período" />
                )}
              </div>

              {/* GRÁFICO 7 — Distribuição por faixa do lead */}
              <div className="rounded-lg p-4" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                <div className="mb-3 text-sm font-semibold" style={{ color: "#c9d1d9" }}>Distribuição por faixa do lead</div>
                <DonutChart data={[
                  { label: `Faixa A — ${data.grades.A}`, value: data.grades.A, color: "#3fb950" },
                  { label: `Faixa B — ${data.grades.B}`, value: data.grades.B, color: "#58a6ff" },
                  { label: `Faixa C — ${data.grades.C}`, value: data.grades.C, color: "#d29922" },
                  { label: `Faixa D — ${data.grades.D}`, value: data.grades.D, color: "#f85149" },
                  { label: `Sem nota — ${data.grades.none}`, value: data.grades.none, color: "#484f58" },
                ].filter(s => s.value > 0)} />
              </div>
            </div>
          </div>

          {/* 5. Leitura de decisão */}
          {data.insights.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
              <div className="mb-4 flex items-center gap-2 text-base font-semibold" style={{ color: "#c9d1d9" }}>
                <Activity size={16} /> Leitura de decisão
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg p-4" style={{
                    background: ins.type === "danger" ? "rgba(248,81,73,0.1)" :
                      ins.type === "warning" ? "rgba(210,153,34,0.1)" :
                      ins.type === "success" ? "rgba(63,185,80,0.1)" : "rgba(88,166,255,0.1)",
                    border: `1px solid ${
                      ins.type === "danger" ? "rgba(248,81,73,0.2)" :
                      ins.type === "warning" ? "rgba(210,153,34,0.2)" :
                      ins.type === "success" ? "rgba(63,185,80,0.2)" : "rgba(88,166,255,0.2)"
                    }`,
                  }}>
                    <InsightIcon name={ins.icon} type={ins.type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{
                        color: ins.type === "danger" ? "#f85149" :
                          ins.type === "warning" ? "#d29922" :
                          ins.type === "success" ? "#3fb950" : "#58a6ff"
                      }}>{ins.text}</div>
                      {ins.metric && <div className="mt-0.5 text-[10px]" style={{ color: "#8b949e" }}>{ins.metric}</div>}
                    </div>
                    {ins.action && (
                      <a href={ins.action.href} className="shrink-0 text-[10px] font-medium hover:underline" style={{ color: "#58a6ff" }}>
                        {ins.action.label}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* Tab: Pesquisa */}
      {activeTab === "pesquisa" && <PesquisaTab survey={data.surveyData} />}

      {/* Tab: Origem */}
      {activeTab === "origem" && (() => {
        const oa = data.originAnalysis;
        const FIXED_ORIGINS = ["Meta Ads", "Google Ads", "Orgânico"];
        const fixedSet = new Set(FIXED_ORIGINS);
        const dynamicTabs = oa
          .filter(o => o.count > 0 && o.label !== "Sem classificação - sem UTM" && !fixedSet.has(o.label))
          .map(o => ({ key: o.label, label: o.label }));
        const originTabs = [
          ...FIXED_ORIGINS.map(l => ({ key: l, label: l })),
          ...dynamicTabs,
        ];
        const activeOriginKey = originTabKey;
        const tables = data.originUtmTables[activeOriginKey];
        const noOriginCount = oa.find(o => o.label === "Sem classificação - sem UTM")?.count ?? 0;
        const trafficCount = data.totalLeads - noOriginCount;
        const orgCount = oa.find(o => o.label === "Orgânico")?.count ?? 0;
        const selectedOriginLeads = tables?.totals.leads ?? 0;

        const thStyle = "px-4 py-3 text-right font-medium uppercase tracking-wider text-[11px]";
        const tdStyle = "px-4 py-3 text-right";

        function UtmDimTable({ title, rows, totals }: { title: string; rows: UtmDimRow[]; totals: OriginUtmTables["totals"] }) {
          if (rows.length === 0) return null;
          return (
            <div className="overflow-x-auto" style={{ background: "#0d1117" }}>
              <table className="min-w-full text-[13px]">
                <thead>
                  <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[11px]" style={{ color: "#8b949e" }}>{title}</th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>Potencial <span className="inline-block" style={{ opacity: 0.5 }}>&#9432;</span></th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>Valor gasto</th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>Leads</th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>CPA</th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>CPM</th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>CTR</th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>Leads qualificados (MQL)</th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>Leads Faixa A</th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>Leads Faixa B</th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>Leads Faixa C</th>
                    <th className={thStyle} style={{ color: "#8b949e" }}>Leads Faixa D</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #21262d" }} className="hover:brightness-125 transition-all">
                      <td className="px-4 py-3 font-medium text-left" style={{ color: "#c9d1d9" }}>{r.value}</td>
                      <td className={tdStyle}>
                        <span className="inline-block h-3 w-3 rounded-full" style={{
                          backgroundColor: r.status === "high" ? "#3fb950" :
                            r.status === "low" ? "#f85149" :
                            r.status === "attention" ? "#d29922" : "#484f58"
                        }} />
                      </td>
                      <td className={tdStyle} style={{ color: "#8b949e" }}>—</td>
                      <td className={tdStyle} style={{ color: "#c9d1d9" }}>{r.leads.toLocaleString("pt-BR")}</td>
                      <td className={tdStyle} style={{ color: "#8b949e" }}>—</td>
                      <td className={tdStyle} style={{ color: "#8b949e" }}>—</td>
                      <td className={tdStyle} style={{ color: "#8b949e" }}>—</td>
                      <td className={tdStyle} style={{ color: "#c9d1d9" }}>{r.qualifiedPct}%</td>
                      <td className={tdStyle} style={{ color: "#c9d1d9" }}>{r.gradePcts.A}%</td>
                      <td className={tdStyle} style={{ color: "#c9d1d9" }}>{r.gradePcts.B}%</td>
                      <td className={tdStyle} style={{ color: "#c9d1d9" }}>{r.gradePcts.C}%</td>
                      <td className={tdStyle} style={{ color: "#c9d1d9" }}>{r.gradePcts.D}%</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#161b22", borderTop: "1px solid #30363d" }} className="font-semibold">
                    <td className="px-4 py-3 text-left" style={{ color: "#c9d1d9" }}>Total</td>
                    <td className={tdStyle} />
                    <td className={tdStyle} style={{ color: "#58a6ff" }}>—</td>
                    <td className={tdStyle} style={{ color: "#58a6ff" }}>{totals.leads.toLocaleString("pt-BR")}</td>
                    <td className={tdStyle} style={{ color: "#58a6ff" }}>—</td>
                    <td className={tdStyle} style={{ color: "#58a6ff" }}>—</td>
                    <td className={tdStyle} style={{ color: "#58a6ff" }}>—</td>
                    <td className={tdStyle} style={{ color: "#58a6ff" }}>{totals.qualifiedPct}%</td>
                    <td className={tdStyle} style={{ color: "#58a6ff" }}>{totals.gradePcts.A}%</td>
                    <td className={tdStyle} style={{ color: "#58a6ff" }}>{totals.gradePcts.B}%</td>
                    <td className={tdStyle} style={{ color: "#58a6ff" }}>{totals.gradePcts.C}%</td>
                    <td className={tdStyle} style={{ color: "#58a6ff" }}>{totals.gradePcts.D}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="flex justify-center gap-4">
              {[
                { label: "Leads totais", value: data.totalLeads },
                { label: "Leads tráfego", value: trafficCount },
                { label: "Leads orgânicos", value: orgCount },
                { label: "Leads sem rastreio", value: noOriginCount },
              ].map(kpi => (
                <div key={kpi.label} className="rounded-xl px-8 py-4 text-center" style={{ background: "#161b22", border: "1px solid #30363d" }}>
                  <div className="text-sm font-medium" style={{ color: "#8b949e" }}>{kpi.label}</div>
                  <div className="text-4xl font-bold mt-1" style={{ color: "#c9d1d9" }}>{kpi.value.toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </div>

            {/* Origin Tabs */}
            <div className="flex items-center gap-6 border-b pb-0" style={{ borderColor: "#30363d" }}>
              {originTabs.map(t => (
                <button key={t.key} onClick={() => setOriginTabKey(t.key)}
                  className="pb-2 text-sm font-medium transition-colors border-b-2"
                  style={{
                    borderColor: activeOriginKey === t.key ? "#58a6ff" : "transparent",
                    color: activeOriginKey === t.key ? "#58a6ff" : "#8b949e",
                  }}>{t.label}</button>
              ))}
            </div>

            {/* UTM Dimension Tables */}
            {tables ? (
              <div className="space-y-6">
                <UtmDimTable title="UTM SOURCE" rows={tables.sources} totals={tables.totals} />
                <UtmDimTable title="UTM MEDIUM" rows={tables.mediums} totals={tables.totals} />
                <UtmDimTable title="UTM CAMPAIGN" rows={tables.campaigns} totals={tables.totals} />
                <UtmDimTable title="UTM CONTENT" rows={tables.contents} totals={tables.totals} />
                <UtmDimTable title="UTM TERM" rows={tables.terms} totals={tables.totals} />
              </div>
            ) : (
              <EmptyState msg="Nenhum dado de UTM para esta origem" sub="Selecione outra origem ou verifique se os leads possuem UTMs." />
            )}
          </div>
        );
      })()}

      {/* Tab: Plataformas */}
      {activeTab === "plataformas" && (
        <div className="space-y-4">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
            {data.platforms.map(p => (
              <button key={p.label} onClick={() => setPlatformTab(p.label)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  platformTab === p.label ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-800"
                }`}>{p.label}</button>
            ))}
          </div>

          {(() => {
            const plat = data.platforms.find(p => p.label === platformTab);
            if (!plat) return <EmptyState msg="Selecione uma plataforma" />;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard label="Leads" value={plat.count.toString()} />
                  <KpiCard label="% do total" value={`${plat.pct}%`} />
                  <KpiCard label="Score médio" value={plat.avgScore?.toString() ?? "—"} />
                  <KpiCard label="% qualificados" value={`${plat.qualifiedPct}%`} />
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold text-gray-800">Leads por dia — {plat.label}</div>
                  <ComboChart data={plat.daily.map(d => ({ label: d.label, bar: d.count }))} barLabel="Leads" />
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold text-gray-800">Distribuição de faixas — {plat.label}</div>
                  <DonutChart data={[
                    { label: "A", value: plat.grades["A"] ?? 0, color: "#22c55e" },
                    { label: "B", value: plat.grades["B"] ?? 0, color: "#3b82f6" },
                    { label: "C", value: plat.grades["C"] ?? 0, color: "#f59e0b" },
                    { label: "D", value: plat.grades["D"] ?? 0, color: "#ef4444" },
                    { label: "Sem nota", value: plat.grades["none"] ?? 0, color: "#6b7280" },
                  ].filter(s => s.value > 0)} size={180} />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: LPs */}
      {activeTab === "lps" && (
        <div className="space-y-5">
          {data.lps.length > 0 && (() => {
            const sorted = [...data.lps];
            const topVol = sorted.sort((a, b) => b.count - a.count)[0];
            const topScore = [...data.lps].filter(l => l.avgScore != null).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0];
            const topQual = [...data.lps].filter(l => l.count >= 3).sort((a, b) => b.qualifiedPct - a.qualifiedPct)[0];
            const toScale = data.lps.filter(l => l.recommendation === "Escalar");
            const toPause = data.lps.filter(l => l.recommendation === "Pausar");
            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard label="Maior volume" value={topVol?.label ?? "—"} sub={`${topVol?.count ?? 0} leads`} />
                <KpiCard label="Melhor score" value={topScore?.label ?? "—"} sub={`Score ${topScore?.avgScore ?? "—"}`} />
                <KpiCard label="Melhor qualificação" value={topQual?.label ?? "—"} sub={`${topQual?.qualifiedPct ?? 0}%`} />
                <KpiCard label="Para escalar" value={toScale.length.toString()} color={toScale.length > 0 ? "green" : undefined} />
                <KpiCard label="Para otimizar" value={data.lps.filter(l => l.recommendation === "Otimizar").length.toString()} color="amber" />
                <KpiCard label="Para pausar" value={toPause.length.toString()} color={toPause.length > 0 ? "red" : undefined} />
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-gray-800">Volume x Qualidade</div>
              <ScatterPlot data={data.lps.filter(l => l.count >= 2 && l.avgScore != null).map(l => ({
                label: l.label,
                x: l.count,
                y: l.avgScore ?? 0,
                size: Math.max(6, Math.min(18, l.qualifiedPct / 5)),
                color: l.recommendation === "Escalar" ? "#22c55e" :
                       l.recommendation === "Manter" ? "#3b82f6" :
                       l.recommendation === "Otimizar" ? "#f59e0b" : "#ef4444",
                recommendation: l.recommendation,
              }))} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-gray-800">Faixas por LP</div>
              <StackedBars data={data.lps.slice(0, 8).map(l => ({
                label: l.label,
                segments: [
                  { key: "A", value: l.grades["A"] ?? 0, color: "#22c55e" },
                  { key: "B", value: l.grades["B"] ?? 0, color: "#3b82f6" },
                  { key: "C", value: l.grades["C"] ?? 0, color: "#f59e0b" },
                  { key: "D", value: l.grades["D"] ?? 0, color: "#ef4444" },
                  { key: "—", value: l.grades["none"] ?? 0, color: "#6b7280" },
                ],
                total: l.count,
              }))} />
            </div>
          </div>

          {data.lpInsights.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-gray-800">Insights de LP</div>
              <div className="space-y-1">
                {data.lpInsights.map((ins, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <Info size={13} /> {ins}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <span className="text-sm font-semibold text-gray-800">Performance por LP</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">LP</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Leads</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">%</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Score médio</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">% Qualif.</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">% Fracos</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Faixa top</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Índice</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Recomendação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.lps.map(lp => (
                    <tr key={lp.label} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{lp.label}</td>
                      <td className="px-4 py-2.5 text-gray-500">{lp.count}</td>
                      <td className="px-4 py-2.5 text-gray-500">{lp.pct}%</td>
                      <td className="px-4 py-2.5 text-gray-500">{lp.avgScore ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{lp.qualifiedPct}%</td>
                      <td className="px-4 py-2.5 text-gray-500">{lp.weakPct}%</td>
                      <td className="px-4 py-2.5"><ScoreBadge grade={topGradeFromMap(lp.grades)} /></td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-gray-400">{lp.decisionIndex}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <RecommendationBadge rec={lp.recommendation} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Insights */}
      {activeTab === "insights" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 text-sm font-semibold text-gray-800">Insights de decisão</div>
            {data.insights.length === 0 ? (
              <EmptyState msg="Nenhum insight disponível" />
            ) : (
              <div className="space-y-2">
                {data.insights.map((ins, i) => (
                  <div key={i} className={`flex items-start gap-3 rounded-lg p-4 ${
                    ins.type === "danger" ? "bg-red-50" :
                    ins.type === "warning" ? "bg-amber-50" :
                    ins.type === "success" ? "bg-green-50" : "bg-blue-50"
                  }`}>
                    <InsightIcon name={ins.icon} type={ins.type} />
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${
                        ins.type === "danger" ? "text-red-700" :
                        ins.type === "warning" ? "text-amber-700" :
                        ins.type === "success" ? "text-green-700" : "text-blue-700"
                      }`}>{ins.text}</div>
                      {ins.metric && <div className="mt-1 text-xs text-gray-500">{ins.metric}</div>}
                    </div>
                    {ins.action && (
                      <a href={ins.action.href} className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline">
                        {ins.action.label} <ChevronRight size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {data.lpInsights.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-gray-800">Insights de Landing Pages</div>
              <div className="space-y-1.5">
                {data.lpInsights.map((ins, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <Info size={13} /> {ins}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Leads */}
      {activeTab === "leads" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-gray-800">Leads recentes</span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar lead..."
                  className="w-44 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex rounded-md border border-gray-200 p-0.5">
                {LEAD_FILTERS.map(f => (
                  <button key={f.key} onClick={() => setLeadFilter(f.key)}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      leadFilter === f.key ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"
                    }`}>{f.label}</button>
                ))}
              </div>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <EmptyState
              msg={search || leadFilter !== "all" ? "Nenhum lead encontrado com esse filtro." : "Nenhum lead capturado ainda."}
              sub={search || leadFilter !== "all" ? "Tente alterar os filtros ou a busca." : "Assim que um formulário enviar um webhook, ele aparece aqui."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Data/Hora</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Nome</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Email / Telefone</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Origem</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Plataforma</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">LP</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Campanha</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Score</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Sync</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLeads.map(l => (
                    <tr key={l.id} className="group transition-colors hover:bg-gray-50/50">
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-500">{fmtTime(l.receivedAt)}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{l.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.email ?? l.phone ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{l.origin}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{l.platform}</td>
                      <td className="px-4 py-2.5 text-gray-500">{normalizeLpLabel(l.paginaCaptura)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.utmCampaign ?? l.sourceName ?? "—"}</td>
                      <td className="px-4 py-2.5"><ScoreBadge grade={l.grade} /></td>
                      <td className="px-4 py-2.5"><SyncBadge logs={l.syncLogs} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => setSelectedLead(l)}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50">Ver</button>
                          <button onClick={() => copyContact(l)}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-100">
                            {copiedId === l.id ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
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
      )}

      {/* Tab: Sincronização */}
      {activeTab === "sync" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total" value={data.sync.total.toString()} />
            <KpiCard label="Sincronizados" value={data.sync.synced.toString()} color="green" />
            <KpiCard label="Pendentes" value={data.sync.pending.toString()} color={data.sync.pending > 0 ? "amber" : "green"} />
            <KpiCard label="Falharam" value={data.sync.failed.toString()} color={data.sync.failed > 0 ? "red" : "green"} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-gray-800">Progresso de sincronização</div>
            <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${data.sync.syncPct}%` }} />
            </div>
            <div className="mt-1 text-xs text-gray-500">{data.sync.syncPct}% sincronizado</div>
          </div>
        </div>
      )}

      {/* Origin Detail Drawer */}
      {selectedOrigin && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrigin(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
              <span className="text-sm font-semibold text-gray-800">Detalhes: {selectedOrigin.label}</span>
              <button onClick={() => setSelectedOrigin(null)} className="rounded p-1 hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-5 p-5">
              <Section title="Resumo">
                <Field label="Leads" value={selectedOrigin.count.toString()} />
                <Field label="% do total" value={`${selectedOrigin.pct}%`} />
                <Field label="Score médio" value={selectedOrigin.avgScore?.toString() ?? "—"} />
                <Field label="Score mediano" value={selectedOrigin.medianScore?.toString() ?? "—"} />
                <Field label="% qualificados" value={`${selectedOrigin.qualifiedPct}%`} />
                <Field label="% fracos" value={`${selectedOrigin.weakPct}%`} />
                <Field label="Faixa predominante" value={selectedOrigin.topGrade ?? "—"} />
                <Field label="Último lead" value={selectedOrigin.lastLead ? fmtTime(selectedOrigin.lastLead) : "—"} />
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">Recomendação</span>
                  <OriginRecommendationBadge rec={selectedOrigin.recommendation} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Índice de decisão</span>
                  <span className="font-mono font-medium text-gray-800">{selectedOrigin.decisionIndex}</span>
                </div>
              </Section>

              <Section title="Atribuição">
                <Field label="utm_source" value={selectedOrigin.topUtmSource} />
                <Field label="utm_medium" value={selectedOrigin.topUtmMedium} />
                <Field label="Campanha principal" value={selectedOrigin.topCampaign} />
                <Field label="LP principal" value={selectedOrigin.topPage ? normalizeLpLabel(selectedOrigin.topPage) : "—"} />
              </Section>

              <Section title="Qualidade — distribuição por faixa">
                <div className="space-y-1">
                  {["A", "B", "C", "D", "none"].map(g => {
                    const count = selectedOrigin.grades[g] ?? 0;
                    const pct = selectedOrigin.count > 0 ? Math.round((count / selectedOrigin.count) * 100) : 0;
                    const color = g === "A" ? "bg-green-500" : g === "B" ? "bg-blue-500" : g === "C" ? "bg-amber-500" : g === "D" ? "bg-red-500" : "bg-gray-400";
                    return (
                      <div key={g} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-gray-500">{g === "none" ? "Sem nota" : `Faixa ${g}`}</span>
                        <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 text-right text-gray-600">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </Section>

              {selectedOrigin.platforms.length > 0 && (
                <Section title="Plataformas desta origem">
                  {selectedOrigin.platforms.map(p => (
                    <Field key={p.label} label={p.label} value={`${p.count} leads`} />
                  ))}
                </Section>
              )}

              <Section title="Evolução diária">
                <div className="h-16">
                  <Sparkline data={selectedOrigin.daily.map(d => d.count)} color="#3b82f6" />
                </div>
              </Section>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedLead(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
              <span className="text-sm font-semibold text-gray-800">Detalhes do lead</span>
              <button onClick={() => setSelectedLead(null)} className="rounded p-1 hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-5 p-5">
              <Section title="Dados do lead">
                <Field label="Nome" value={selectedLead.name} />
                <Field label="Email" value={selectedLead.email} />
                <Field label="Telefone" value={selectedLead.phone} />
                <Field label="Data" value={fmtTime(selectedLead.receivedAt)} />
              </Section>

              <Section title="Captação">
                <Field label="Página de Captura" value={selectedLead.paginaCaptura} />
                <Field label="LP identificada" value={normalizeLpLabel(selectedLead.paginaCaptura)} />
                <Field label="Pesquisa" value={selectedLead.pesquisa} />
                <Field label="Grupo" value={selectedLead.grupo} />
              </Section>

              <Section title="Atribuição">
                <Field label="Origem" value={selectedLead.origin} />
                <Field label="Plataforma" value={selectedLead.platform} />
                <Field label="Posicionamento" value={selectedLead.placement} />
                <Field label="utm_source" value={selectedLead.utmSource} />
                <Field label="utm_medium" value={selectedLead.utmMedium} />
                <Field label="utm_campaign" value={selectedLead.utmCampaign} />
                <Field label="utm_content" value={selectedLead.utmContent} />
                <Field label="utm_term" value={selectedLead.utmTerm} />
              </Section>

              <Section title="Qualidade">
                <div className="flex items-center gap-2">
                  <ScoreBadge grade={selectedLead.grade} />
                  {selectedLead.score != null && (
                    <span className="text-xs text-gray-500">Score: {selectedLead.score}</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {selectedLead.grade === "A" || selectedLead.grade === "B" ? "Qualificado" :
                   selectedLead.grade === "C" ? "Intermediário" :
                   selectedLead.grade === "D" ? "Fraco" : "Sem classificação"}
                </div>
              </Section>

              <Section title="Integração">
                {selectedLead.syncLogs.length === 0 ? (
                  <div className="text-xs text-gray-400">Sem destino de integração</div>
                ) : (
                  selectedLead.syncLogs.map((s, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-xs">
                      <div>
                        <span className="font-medium text-gray-700">{s.destination}</span>
                        <span className="ml-2 text-gray-400">{fmtTime(s.attemptedAt)}</span>
                      </div>
                      <SyncBadge logs={[s]} />
                      {s.error && <span className="text-[10px] text-red-500 mt-1">{s.error}</span>}
                    </div>
                  ))
                )}
              </Section>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => copyContact(selectedLead)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                  <Copy size={12} className="inline mr-1" /> Copiar contato
                </button>
                <button onClick={() => copyUtms(selectedLead)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                  <Link2 size={12} className="inline mr-1" /> Copiar UTMs
                </button>
                <a href={`/leads?q=${selectedLead.email ?? selectedLead.name ?? ""}`} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                  <ExternalLink size={12} className="inline mr-1" /> Ver na listagem
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
