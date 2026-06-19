"use client";

import { useState, useCallback, useMemo } from "react";
import type { SourceWithStats, SyncLogEntry } from "@/lib/fontes";
import {
  Plus,
  Send,
  ScrollText,
  Plug,
  Globe,
  ArrowUpRight,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";
import FontesTab from "./fontes-tab";
import WebhooksTab from "./webhooks-tab";
import DestinosTab from "./destinos-tab";
import LogsTab from "./logs-tab";
import SourceDrawer from "./source-drawer";
import NewSourceModal from "./new-source-modal";
import TestLeadModal from "./test-lead-modal";

const TABS = [
  { key: "fontes", label: "Fontes", icon: Plug },
  { key: "webhooks", label: "Webhooks", icon: Globe },
  { key: "destinos", label: "Destinos de Envio", icon: ArrowUpRight },
  { key: "logs", label: "Logs", icon: ScrollText },
  { key: "falhas", label: "Falhas", icon: AlertTriangle },
] as const;

type Tab = (typeof TABS)[number]["key"];

type Props = {
  sources: SourceWithStats[];
  logs: SyncLogEntry[];
  failures: SyncLogEntry[];
  destStats: Record<string, { done: number; failed: number; pending: number; total: number; lastAttempt: string | null }>;
  appUrl: string;
};

const BG = "#0d1117";
const CARD = "#161b22";
const BORDER = "#30363d";
const TEXT = "#c9d1d9";
const MUTED = "#8b949e";
const ACCENT = "#58a6ff";

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

export default function FontesShell({ sources, logs, failures, destStats, appUrl }: Props) {
  const [tab, setTab] = useState<Tab>("fontes");
  const [drawerSource, setDrawerSource] = useState<SourceWithStats | null>(null);
  const [showNewSource, setShowNewSource] = useState(false);
  const [showTestLead, setShowTestLead] = useState(false);

  const handleManage = useCallback((s: SourceWithStats) => setDrawerSource(s), []);

  const stats = useMemo(() => {
    const totalLeads = sources.reduce((s, src) => s + src.leadCount, 0);
    const activeSources = sources.filter((s) => s.leadCount > 0).length;
    const lastLeadTimes = sources.map((s) => s.lastLeadAt).filter(Boolean) as string[];
    const lastReceived = lastLeadTimes.length > 0
      ? lastLeadTimes.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;
    // Leads received today (BRT)
    const now = new Date();
    const brtOffset = -3 * 60;
    const brtNow = new Date(now.getTime() + (brtOffset + now.getTimezoneOffset()) * 60000);
    const todayStart = new Date(brtNow.getFullYear(), brtNow.getMonth(), brtNow.getDate());
    const todayStartUtc = new Date(todayStart.getTime() - (brtOffset + now.getTimezoneOffset()) * 60000);
    const leadsToday = logs.filter((l) => new Date(l.attemptedAt) >= todayStartUtc).length;
    return { totalSources: sources.length, activeSources, totalLeads, leadsToday, lastReceived };
  }, [sources, logs]);

  const destTotals = useMemo(() => {
    const entries = Object.values(destStats);
    return {
      count: Object.keys(destStats).length,
      active: entries.filter((s) => s.done > 0).length,
      sent: entries.reduce((a, s) => a + s.done, 0),
      pending: entries.reduce((a, s) => a + s.pending, 0),
      failed: entries.reduce((a, s) => a + s.failed, 0),
      lastAttempt: entries
        .map((s) => s.lastAttempt)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ?? null,
    };
  }, [destStats]);

  const summaryCards = tab === "destinos" ? [
    {
      label: "Total de destinos",
      value: destTotals.count,
      icon: ArrowUpRight,
      color: "#58a6ff",
      bg: "rgba(88,166,255,0.1)",
      borderColor: "rgba(88,166,255,0.3)",
      trend: BarChart3,
    },
    {
      label: "Destinos ativos",
      value: destTotals.active,
      icon: CheckCircle2,
      color: "#3fb950",
      bg: "rgba(63,185,80,0.1)",
      borderColor: "rgba(63,185,80,0.3)",
      trend: Activity,
    },
    {
      label: "Leads enviados hoje",
      value: stats.leadsToday,
      icon: Send,
      color: "#a371f7",
      bg: "rgba(163,113,247,0.1)",
      borderColor: "rgba(163,113,247,0.3)",
      trend: BarChart3,
    },
    {
      label: "Último envio",
      value: timeAgo(destTotals.lastAttempt),
      icon: Clock,
      color: "#d29922",
      bg: "rgba(210,153,34,0.1)",
      borderColor: "rgba(210,153,34,0.3)",
      trend: Clock,
    },
  ] : tab === "webhooks" ? [
    {
      label: "Total de webhooks",
      value: stats.totalSources,
      icon: Globe,
      color: "#58a6ff",
      bg: "rgba(88,166,255,0.1)",
      borderColor: "rgba(88,166,255,0.3)",
      trend: BarChart3,
    },
    {
      label: "Webhooks ativos",
      value: stats.activeSources,
      icon: CheckCircle2,
      color: "#3fb950",
      bg: "rgba(63,185,80,0.1)",
      borderColor: "rgba(63,185,80,0.3)",
      trend: Activity,
    },
    {
      label: "Leads hoje",
      value: stats.leadsToday,
      icon: Send,
      color: "#a371f7",
      bg: "rgba(163,113,247,0.1)",
      borderColor: "rgba(163,113,247,0.3)",
      trend: BarChart3,
    },
    {
      label: "Último recebimento",
      value: timeAgo(stats.lastReceived),
      icon: Clock,
      color: "#d29922",
      bg: "rgba(210,153,34,0.1)",
      borderColor: "rgba(210,153,34,0.3)",
      trend: Clock,
    },
  ] : [
    {
      label: "Total de fontes",
      value: stats.totalSources,
      icon: Plug,
      color: "#58a6ff",
      bg: "rgba(88,166,255,0.1)",
      borderColor: "rgba(88,166,255,0.3)",
      trend: BarChart3,
    },
    {
      label: "Fontes ativas",
      value: stats.activeSources,
      icon: CheckCircle2,
      color: "#3fb950",
      bg: "rgba(63,185,80,0.1)",
      borderColor: "rgba(63,185,80,0.3)",
      trend: Activity,
    },
    {
      label: "Leads hoje",
      value: stats.leadsToday,
      icon: Send,
      color: "#a371f7",
      bg: "rgba(163,113,247,0.1)",
      borderColor: "rgba(163,113,247,0.3)",
      trend: BarChart3,
    },
    {
      label: "Último recebimento",
      value: timeAgo(stats.lastReceived),
      icon: Clock,
      color: "#d29922",
      bg: "rgba(210,153,34,0.1)",
      borderColor: "rgba(210,153,34,0.3)",
      trend: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: TEXT }}>
            Fontes de captação
          </h1>
          <p className="mt-1 text-xs" style={{ color: MUTED }}>
            {tab === "destinos"
              ? "Gerencie os destinos conectados que recebem leads das landing pages e acompanhe envios, pendências e falhas."
              : tab === "webhooks"
                ? "Gerencie endpoints de entrada, autenticação e recebimento dos leads das landing pages."
                : "Controle operacional das fontes, webhooks, destinos e sincronizações das landing pages."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowNewSource(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors"
            style={{ background: ACCENT }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#4090e0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
          >
            <Plus size={14} /> Nova Fonte
          </button>
          <button
            onClick={() => setShowTestLead(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors"
            style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2129")}
            onMouseLeave={(e) => (e.currentTarget.style.background = CARD)}
          >
            <Send size={14} /> Lead Teste
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((c) => {
          const TrendIcon = c.trend;
          return (
            <div
              key={c.label}
              className="flex items-center gap-3 rounded-xl px-4 py-4"
              style={{ background: CARD, border: `1px solid ${c.borderColor}` }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: c.bg }}>
                <c.icon size={18} style={{ color: c.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium" style={{ color: MUTED }}>{c.label}</div>
                <div className="text-lg font-bold" style={{ color: TEXT }}>{c.value}</div>
              </div>
              <TrendIcon size={18} style={{ color: c.color, opacity: 0.5 }} />
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors"
            style={{
              borderBottom: `2px solid ${tab === key ? ACCENT : "transparent"}`,
              color: tab === key ? ACCENT : MUTED,
            }}
          >
            <Icon size={14} />
            {label}
            {key === "falhas" && failures.length > 0 && (
              <span
                className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "rgba(248,81,73,0.15)", color: "#f85149" }}
              >
                {failures.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "fontes" && (
        <FontesTab sources={sources} appUrl={appUrl} onManage={handleManage} />
      )}
      {tab === "webhooks" && (
        <WebhooksTab sources={sources} appUrl={appUrl} />
      )}
      {tab === "destinos" && (
        <DestinosTab sources={sources} destStats={destStats} />
      )}
      {tab === "logs" && <LogsTab logs={logs} />}
      {tab === "falhas" && <LogsTab logs={failures} isFalhas />}

      {/* Drawer */}
      {drawerSource && (
        <SourceDrawer
          source={drawerSource}
          appUrl={appUrl}
          onClose={() => setDrawerSource(null)}
        />
      )}

      {/* Modals */}
      {showNewSource && (
        <NewSourceModal onClose={() => setShowNewSource(false)} />
      )}
      {showTestLead && (
        <TestLeadModal
          sources={sources}
          onClose={() => setShowTestLead(false)}
        />
      )}
    </div>
  );
}
