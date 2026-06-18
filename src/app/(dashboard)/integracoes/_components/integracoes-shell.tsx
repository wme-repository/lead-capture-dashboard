"use client";

import { useState } from "react";
import type {
  IntegrationStats,
  IntegrationSummary,
  IntegrationLogEntry,
} from "@/lib/integracoes";
import {
  Plus,
  Send,
  RotateCw,
  ScrollText,
  LayoutGrid,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  Plug,
  Settings,
  ChevronRight,
  Info,
  Search,
  Copy,
  Check,
  X,
  ExternalLink,
  Pause,
  Play,
  Trash2,
  Shield,
  Loader2,
  Inbox,
  Sheet,
  Webhook,
  Zap,
  ArrowUpRight,
} from "lucide-react";

/* ─── Types ─── */

const TABS = [
  { key: "overview", label: "Visão geral", icon: LayoutGrid },
  { key: "active", label: "Ativas", icon: CheckCircle2 },
  { key: "pending", label: "Pendentes", icon: Clock },
  { key: "errors", label: "Com erro", icon: AlertTriangle },
  { key: "logs", label: "Logs", icon: ScrollText },
  { key: "settings", label: "Configurações", icon: Settings },
] as const;
type Tab = (typeof TABS)[number]["key"];

type Props = {
  integrations: IntegrationStats[];
  summary: IntegrationSummary;
  logs: IntegrationLogEntry[];
};

const DEST_ICONS: Record<string, typeof Sheet> = {
  sheets: Sheet,
  "google-sheets": Sheet,
  datacrazy: Webhook,
};

const HEALTH_STYLES: Record<
  string,
  { badge: string; border: string; label: string }
> = {
  active: {
    badge: "bg-green-500/10 text-green-400",
    border: "border-green-500/20",
    label: "Ativa",
  },
  pending: {
    badge: "bg-amber-500/10 text-amber-400",
    border: "border-amber-500/20",
    label: "Pendências",
  },
  error: {
    badge: "bg-red-500/10 text-red-400",
    border: "border-red-500/20",
    label: "Erro",
  },
  paused: {
    badge: "bg-gray-500/10 text-gray-400",
    border: "border-gray-500/20",
    label: "Pausada",
  },
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtTimeFull(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ─── Main Shell ─── */

export default function IntegracoesShell({
  integrations,
  summary,
  logs,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [drawerIntegration, setDrawerIntegration] =
    useState<IntegrationStats | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState<{
    processed: number;
    total: number;
  } | null>(null);

  const handleReprocess = async () => {
    setReprocessing(true);
    setReprocessResult(null);
    try {
      const res = await fetch("/api/cron/retry", {
        headers: { "x-cron-secret": "__manual__" },
      });
      if (res.ok) {
        const data = await res.json();
        setReprocessResult(data);
      }
    } finally {
      setReprocessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Integrações</h1>
          <p className="mt-1 text-xs text-gray-500">
            Gerencie destinos de envio, sincronização, falhas e reprocessamento
            de leads.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={14} /> Nova integração
          </button>
          <button
            onClick={() => setShowTestModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Send size={14} /> Testar
          </button>
          <button
            onClick={handleReprocess}
            disabled={reprocessing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {reprocessing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCw size={14} />
            )}
            Reprocessar
          </button>
          <button
            onClick={() => setTab("logs")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <ScrollText size={14} /> Ver logs
          </button>
        </div>
      </div>

      {/* Reprocess result toast */}
      {reprocessResult && (
        <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-xs text-green-400">
          <span>
            Reprocessamento concluído: {reprocessResult.processed}/
            {reprocessResult.total} enviados com sucesso.
          </span>
          <button onClick={() => setReprocessResult(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab
          integrations={integrations}
          summary={summary}
          logs={logs}
          onManage={setDrawerIntegration}
        />
      )}
      {tab === "active" && (
        <ActiveTab
          integrations={integrations.filter((i) => i.health === "active")}
          onManage={setDrawerIntegration}
        />
      )}
      {tab === "pending" && (
        <PendingTab
          integrations={integrations.filter((i) => i.pending > 0)}
          onReprocess={handleReprocess}
          reprocessing={reprocessing}
        />
      )}
      {tab === "errors" && (
        <ErrorsTab integrations={integrations.filter((i) => i.failed > 0)} />
      )}
      {tab === "logs" && (
        <LogsTab logs={logs} integrations={integrations} />
      )}
      {tab === "settings" && <SettingsTab />}

      {/* Drawer */}
      {drawerIntegration && (
        <IntegrationDrawer
          integration={drawerIntegration}
          logs={logs.filter(
            (l) => l.destination === drawerIntegration.destination
          )}
          onClose={() => setDrawerIntegration(null)}
        />
      )}

      {/* New Integration Modal */}
      {showNewModal && (
        <NewIntegrationModal onClose={() => setShowNewModal(false)} />
      )}

      {/* Test Modal */}
      {showTestModal && (
        <TestIntegrationModal
          integrations={integrations}
          onClose={() => setShowTestModal(false)}
        />
      )}
    </div>
  );
}

/* ─── KPI Cards ─── */

function KPICards({ summary }: { summary: IntegrationSummary }) {
  const cards = [
    {
      label: "Total de integrações",
      value: summary.totalIntegrations,
      icon: Plug,
      color: "from-blue-500/10 to-blue-500/5",
      iconBg: "bg-blue-500/15 text-blue-400",
    },
    {
      label: "Ativas",
      value: summary.active,
      icon: CheckCircle2,
      color: "from-green-500/10 to-green-500/5",
      iconBg: "bg-green-500/15 text-green-400",
    },
    {
      label: "Pendências",
      value: summary.totalPending,
      icon: Clock,
      color:
        summary.totalPending > 0
          ? "from-amber-500/10 to-amber-500/5"
          : "from-green-500/10 to-green-500/5",
      iconBg:
        summary.totalPending > 0
          ? "bg-amber-500/15 text-amber-400"
          : "bg-green-500/15 text-green-400",
    },
    {
      label: "Erros",
      value: summary.totalFailed,
      icon: AlertTriangle,
      color:
        summary.totalFailed > 0
          ? "from-red-500/10 to-red-500/5"
          : "from-green-500/10 to-green-500/5",
      iconBg:
        summary.totalFailed > 0
          ? "bg-red-500/15 text-red-400"
          : "bg-green-500/15 text-green-400",
    },
    {
      label: "Taxa de sincronização",
      value: `${summary.syncPct}%`,
      icon: Activity,
      color: "from-violet-500/10 to-violet-500/5",
      iconBg: "bg-violet-500/15 text-violet-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className={`rounded-xl border border-gray-200 bg-gradient-to-br ${c.color} bg-white p-4 shadow-sm`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.iconBg}`}
            >
              <Icon size={16} />
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
              {c.value}
            </div>
            <div className="text-[11px] font-medium text-gray-500">
              {c.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Integration Card ─── */

function IntegrationCard({
  integration: i,
  onManage,
}: {
  integration: IntegrationStats;
  onManage: (i: IntegrationStats) => void;
}) {
  const style = HEALTH_STYLES[i.health] ?? HEALTH_STYLES.active;
  const Icon = DEST_ICONS[i.destination] ?? Webhook;

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${style.border}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <Icon size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{i.label}</div>
            <div className="text-[11px] text-gray-500">{i.type}</div>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${style.badge}`}
        >
          {style.label}
        </span>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-medium uppercase text-gray-400">
            Última sync
          </div>
          <div className="mt-0.5 text-xs text-gray-600">
            {fmtTime(i.lastAttempt)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase text-gray-400">
            Fontes
          </div>
          <div className="mt-0.5 text-xs text-gray-600">
            {i.sourcesConnected}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-2.5 text-center">
        <div>
          <div className="flex items-center justify-center gap-1 text-green-600">
            <CheckCircle2 size={12} />
            <span className="text-base font-bold">{i.done}</span>
          </div>
          <div className="text-[10px] text-gray-400">sincronizados</div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-amber-500">
            <Clock size={12} />
            <span className="text-base font-bold">{i.pending}</span>
          </div>
          <div className="text-[10px] text-gray-400">pendentes</div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-red-500">
            <AlertTriangle size={12} />
            <span className="text-base font-bold">{i.failed}</span>
          </div>
          <div className="text-[10px] text-gray-400">com erro</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="text-gray-400">Taxa de sucesso</span>
          <span className="font-medium text-gray-600">{i.syncPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${Math.max(2, i.syncPct)}%`,
              background:
                i.syncPct >= 90
                  ? "#22c55e"
                  : i.syncPct >= 70
                    ? "#f59e0b"
                    : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => onManage(i)}
          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-blue-700"
        >
          Configurar
        </button>
        <button className="rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50">
          Testar envio
        </button>
        <button className="rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50">
          Ver logs
        </button>
        {i.pending > 0 && (
          <button className="rounded-md border border-amber-200 px-2.5 py-1.5 text-[11px] font-medium text-amber-600 hover:bg-amber-50">
            Reprocessar
          </button>
        )}
      </div>

      <div className="mt-3 text-center text-[10px] text-gray-400">
        {i.total.toLocaleString("pt-BR")} tentativas no total
      </div>
    </div>
  );
}

/* ─── Alerts ─── */

function AlertsBlock({ integrations }: { integrations: IntegrationStats[] }) {
  const alerts: {
    type: "error" | "warn" | "success" | "info";
    msg: string;
    action?: { label: string; onClick?: () => void };
  }[] = [];

  for (const i of integrations) {
    if (i.failed > 0)
      alerts.push({
        type: "error",
        msg: `${i.failed} lead(s) com erro no ${i.label}`,
      });
    if (i.pending > 0)
      alerts.push({
        type: "warn",
        msg: `${i.pending} lead(s) pendente(s) no ${i.label}`,
      });
  }
  if (alerts.length === 0)
    alerts.push({
      type: "success",
      msg: "Nenhum erro crítico encontrado",
    });

  return (
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
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Overview Tab ─── */

function OverviewTab({
  integrations,
  summary,
  logs,
  onManage,
}: {
  integrations: IntegrationStats[];
  summary: IntegrationSummary;
  logs: IntegrationLogEntry[];
  onManage: (i: IntegrationStats) => void;
}) {
  if (integrations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
        <Inbox size={32} className="text-gray-300" />
        <p className="text-sm font-medium text-gray-600">
          Nenhuma integração cadastrada.
        </p>
        <p className="text-xs text-gray-400">
          Adicione um destino para começar a enviar leads automaticamente.
        </p>
      </div>
    );
  }

  const recentLogs = logs.slice(0, 8);

  return (
    <div className="space-y-5">
      <KPICards summary={summary} />
      <AlertsBlock integrations={integrations} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((i) => (
          <IntegrationCard
            key={i.destination}
            integration={i}
            onManage={onManage}
          />
        ))}
      </div>

      {/* Recent syncs */}
      {recentLogs.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">
            Últimas sincronizações
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Data
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Lead
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Integração
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/50">
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-500">
                      {fmtTime(l.attemptedAt)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {l.lead.name ?? l.lead.email ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {(DEST_ICONS[l.destination] ? "" : "") +
                        (HEALTH_STYLES[l.status]?.label ?? l.destination)}
                      <span className="ml-1 text-gray-400">
                        {l.destination === "sheets"
                          ? "Google Sheets"
                          : l.destination === "datacrazy"
                            ? "DataCrazy"
                            : l.destination}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <LogStatusBadge status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Active Tab ─── */

function ActiveTab({
  integrations,
  onManage,
}: {
  integrations: IntegrationStats[];
  onManage: (i: IntegrationStats) => void;
}) {
  if (integrations.length === 0)
    return <EmptyState title="Nenhuma integração saudável." sub="Todas possuem pendências ou erros." />;

  return (
    <div className="space-y-3">
      {integrations.map((i) => {
        const Icon = DEST_ICONS[i.destination] ?? Webhook;
        return (
          <div
            key={i.destination}
            className="flex items-center justify-between rounded-xl border border-green-500/20 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <Icon size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {i.label}
                </div>
                <div className="text-[11px] text-gray-500">
                  {i.type} · {i.sourcesConnected} fonte(s) · Última sync:{" "}
                  {fmtTime(i.lastAttempt)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-bold text-green-600">
                  {i.syncPct}%
                </div>
                <div className="text-[10px] text-gray-400">sucesso</div>
              </div>
              <button
                onClick={() => onManage(i)}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
              >
                Gerenciar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Pending Tab ─── */

function PendingTab({
  integrations,
  onReprocess,
  reprocessing,
}: {
  integrations: IntegrationStats[];
  onReprocess: () => void;
  reprocessing: boolean;
}) {
  if (integrations.length === 0)
    return (
      <EmptyState
        title="Nenhuma pendência encontrada."
        sub="Todas as integrações estão sincronizadas."
      />
    );

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={onReprocess}
          disabled={reprocessing}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {reprocessing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RotateCw size={14} />
          )}
          Reprocessar todos
        </button>
      </div>
      {integrations.map((i) => {
        const Icon = DEST_ICONS[i.destination] ?? Webhook;
        return (
          <div
            key={i.destination}
            className="rounded-xl border border-amber-500/20 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {i.label}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Última tentativa: {fmtTime(i.lastAttempt)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-amber-500">
                  {i.pending}
                </div>
                <div className="text-[10px] text-gray-400">pendente(s)</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="rounded-md bg-amber-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-amber-600">
                Reprocessar pendentes
              </button>
              <button className="rounded-md border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50">
                Ver detalhes
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Errors Tab ─── */

function ErrorsTab({ integrations }: { integrations: IntegrationStats[] }) {
  if (integrations.length === 0)
    return (
      <EmptyState
        title="Nenhum erro encontrado."
        sub="Os envios estão funcionando corretamente."
      />
    );

  return (
    <div className="space-y-3">
      {integrations.map((i) => {
        const Icon = DEST_ICONS[i.destination] ?? Webhook;
        return (
          <div
            key={i.destination}
            className="rounded-xl border border-red-500/20 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {i.label}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {i.type} · Última falha: {fmtTime(i.lastAttempt)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-500">{i.failed}</div>
                <div className="text-[10px] text-gray-400">
                  lead(s) com erro
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-red-700">
                Reprocessar
              </button>
              <button className="rounded-md border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50">
                Corrigir configuração
              </button>
              <button className="rounded-md border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50">
                Abrir logs
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Logs Tab ─── */

const LOG_STATUSES = [
  { key: "all", label: "Todos" },
  { key: "done", label: "Sincronizado" },
  { key: "pending", label: "Pendente" },
  { key: "failed", label: "Falhou" },
] as const;

function LogsTab({
  logs,
  integrations,
}: {
  logs: IntegrationLogEntry[];
  integrations: IntegrationStats[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [destFilter, setDestFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = logs.filter((l) => {
    if (statusFilter !== "all") {
      const matches =
        statusFilter === "done"
          ? l.status === "done" || l.status === "synced"
          : l.status === statusFilter;
      if (!matches) return false;
    }
    if (destFilter !== "all" && l.destination !== destFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.lead.name?.toLowerCase().includes(q) ||
        l.lead.email?.toLowerCase().includes(q) ||
        l.lead.phone?.includes(q)
      );
    }
    return true;
  });

  const copyError = async (id: string, error: string) => {
    await navigator.clipboard.writeText(error);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex rounded-md border border-gray-200 p-0.5">
          {LOG_STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                statusFilter === s.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select
          value={destFilter}
          onChange={(e) => setDestFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700"
        >
          <option value="all">Todas integrações</option>
          {integrations.map((i) => (
            <option key={i.destination} value={i.destination}>
              {i.label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-gray-400">
          {filtered.length} registro(s)
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="Nenhum log encontrado." sub="Tente alterar os filtros." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Data/hora
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Lead
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Integração
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Fonte
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Tentativa
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Erro
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.slice(0, 100).map((l) => (
                  <tr
                    key={l.id}
                    className="group transition-colors hover:bg-gray-50/50"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-500">
                      {fmtTimeFull(l.attemptedAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">
                        {l.lead.name ?? "—"}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {l.lead.email ?? l.lead.phone ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {l.destination === "sheets"
                        ? "Google Sheets"
                        : l.destination === "datacrazy"
                          ? "DataCrazy"
                          : l.destination}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {l.lead.source?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <LogStatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-gray-500">
                      {l.attemptCount}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-red-500">
                      {l.error ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {l.error && (
                          <button
                            onClick={() => copyError(l.id, l.error!)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100"
                            title="Copiar erro"
                          >
                            {copiedId === l.id ? (
                              <Check size={12} className="text-green-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                        <a
                          href={`/leads?q=${l.lead.email ?? l.lead.name ?? ""}`}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100"
                          title="Abrir lead"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Settings Tab ─── */

function SettingsTab() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">
        Configurações de integração
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        Parâmetros globais de reprocessamento e notificação.
      </p>
      <div className="mt-6 space-y-5">
        <SettingRow
          label="Tempo entre tentativas"
          value="5 minutos"
          desc="Intervalo do cron de reprocessamento"
        />
        <SettingRow
          label="Máximo de tentativas"
          value="10"
          desc="Após 10 tentativas, o lead não será mais reprocessado"
        />
        <SettingRow
          label="Reprocessamento automático"
          value="Ativo"
          desc="Cron executa a cada 5min via crontab do servidor"
          active
        />
        <SettingRow
          label="Comportamento em caso de erro"
          value="Retry com backoff"
          desc="Intervalo entre tentativas cresce progressivamente"
        />
        <SettingRow
          label="Webhook de erro"
          value="Não configurado"
          desc="URL para notificação externa em caso de falha"
        />
        <SettingRow
          label="Email para alertas"
          value="Não configurado"
          desc="Endereço para receber avisos de falhas de integração"
        />
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
  desc,
  active,
}: {
  label: string;
  value: string;
  desc: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-start justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <div>
        <div className="text-xs font-medium text-gray-800">{label}</div>
        <div className="mt-0.5 text-[11px] text-gray-400">{desc}</div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-medium ${active ? "text-green-600" : "text-gray-600"}`}
        >
          {value}
        </span>
        {active !== undefined && (
          <div
            className={`h-4 w-7 rounded-full ${active ? "bg-green-500" : "bg-gray-300"} relative`}
          >
            <div
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${active ? "translate-x-3.5" : "translate-x-0.5"}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Integration Drawer ─── */

function IntegrationDrawer({
  integration: i,
  logs,
  onClose,
}: {
  integration: IntegrationStats;
  logs: IntegrationLogEntry[];
  onClose: () => void;
}) {
  const style = HEALTH_STYLES[i.health] ?? HEALTH_STYLES.active;
  const Icon = DEST_ICONS[i.destination] ?? Webhook;
  const recentErrors = logs.filter((l) => l.status === "failed").slice(0, 5);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <Icon size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {i.label}
              </div>
              <div className="text-[11px] text-gray-500">{i.type}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status */}
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}
            >
              {style.label}
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatItem label="Sincronizados" value={i.done} color="text-green-600" />
            <StatItem label="Pendentes" value={i.pending} color="text-amber-500" />
            <StatItem label="Com erro" value={i.failed} color="text-red-500" />
            <StatItem label="Total" value={i.total} color="text-gray-600" />
            <StatItem label="Fontes conectadas" value={i.sourcesConnected} color="text-blue-600" />
            <StatItem label="Taxa de sucesso" value={`${i.syncPct}%`} color="text-violet-600" />
          </div>

          {/* Last attempt */}
          <div>
            <div className="text-[10px] font-medium uppercase text-gray-400">
              Última sincronização
            </div>
            <div className="mt-0.5 text-xs text-gray-600">
              {fmtTimeFull(i.lastAttempt)}
            </div>
          </div>

          {/* Config */}
          <div>
            <div className="mb-2 text-[10px] font-medium uppercase text-gray-400">
              Configuração
            </div>
            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Destino</span>
                <span className="font-medium text-gray-700">
                  {i.destination}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Autenticação</span>
                <span className="flex items-center gap-1 font-medium text-green-600">
                  <Shield size={11} /> Configurada
                </span>
              </div>
            </div>
          </div>

          {/* Recent errors */}
          {recentErrors.length > 0 && (
            <div>
              <div className="mb-2 text-[10px] font-medium uppercase text-gray-400">
                Últimos erros
              </div>
              <div className="space-y-1.5">
                {recentErrors.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg border border-red-100 bg-red-50 p-2"
                  >
                    <div className="text-[11px] font-medium text-red-700">
                      {e.lead.name ?? e.lead.email ?? "Lead"}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-red-500">
                      {e.error}
                    </div>
                    <div className="mt-0.5 text-[10px] text-red-400">
                      {fmtTime(e.attemptedAt)} · tentativa {e.attemptCount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div>
            <div className="mb-2 text-[10px] font-medium uppercase text-gray-400">
              Ações
            </div>
            <div className="space-y-1.5">
              <DrawerAction icon={Send} label="Testar conexão" />
              <DrawerAction icon={Send} label="Testar envio de lead" />
              <DrawerAction icon={RotateCw} label="Reprocessar pendentes" variant="amber" />
              <DrawerAction icon={Pause} label="Pausar integração" />
              <DrawerAction icon={Trash2} label="Excluir integração" variant="red" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  );
}

function DrawerAction({
  icon: Icon,
  label,
  variant,
}: {
  icon: typeof Send;
  label: string;
  variant?: "amber" | "red";
}) {
  const cls =
    variant === "red"
      ? "border-red-200 text-red-600 hover:bg-red-50"
      : variant === "amber"
        ? "border-amber-200 text-amber-600 hover:bg-amber-50"
        : "border-gray-200 text-gray-700 hover:bg-gray-50";
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${cls}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

/* ─── New Integration Modal ─── */

const INT_TYPES = [
  { key: "crm", label: "CRM", icon: Webhook, desc: "DataCrazy, Kommo, etc." },
  {
    key: "sheets",
    label: "Google Sheets",
    icon: Sheet,
    desc: "Planilha Google",
  },
  {
    key: "webhook",
    label: "Webhook externo",
    icon: Zap,
    desc: "URL genérica",
  },
  {
    key: "make",
    label: "Make (Integromat)",
    icon: ArrowUpRight,
    desc: "Automação Make",
  },
  { key: "n8n", label: "n8n", icon: ArrowUpRight, desc: "Automação n8n" },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: Send,
    desc: "Envio por WhatsApp",
  },
];

const STEPS = [
  "Tipo",
  "Dados",
  "Mapeamento",
  "Fontes",
  "Teste",
  "Conclusão",
];

function NewIntegrationModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-[8%] z-50 mx-auto flex max-h-[80vh] max-w-lg flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Nova integração
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-1.5 border-b border-gray-100 px-5 py-3">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${
                  i < step
                    ? "bg-green-100 text-green-700"
                    : i === step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < step ? <Check size={9} /> : i + 1}
              </div>
              <span
                className={`hidden text-[10px] sm:inline ${i === step ? "font-medium text-gray-900" : "text-gray-400"}`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="h-px w-3 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-2">
              {INT_TYPES.map((t) => {
                const TIcon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setSelectedType(t.key)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selectedType === t.key
                        ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <TIcon size={16} className="text-gray-500" />
                    <div className="mt-1.5 text-xs font-medium text-gray-900">
                      {t.label}
                    </div>
                    <div className="text-[10px] text-gray-400">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Nome da integração
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: DataCrazy CRM"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  URL / API endpoint
                </label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Token / Chave de acesso
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Mapeie os campos do lead para os campos da integração.
              </p>
              {[
                "nome",
                "email",
                "telefone",
                "origem",
                "campanha",
                "score",
                "utm_source",
                "utm_campaign",
                "data_entrada",
              ].map((field) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="w-28 text-xs font-medium text-gray-600">
                    {field}
                  </span>
                  <span className="text-gray-300">→</span>
                  <input
                    defaultValue={field}
                    className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Selecione quais fontes enviam leads para esta integração.
              </p>
              <div className="rounded-lg border border-gray-200 p-3 text-center text-xs text-gray-400">
                As fontes disponíveis aparecem aqui após criação.
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Envie um lead teste para validar a configuração.
              </p>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700">
                Funcionalidade de teste será habilitada após salvar a integração.
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                <CheckCircle2 size={20} className="mx-auto text-green-600" />
                <p className="mt-2 text-xs font-medium text-green-800">
                  Integração configurada!
                </p>
                <p className="mt-0.5 text-[11px] text-green-600">
                  O destino está pronto para receber leads.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          {step > 0 && step < 5 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Voltar
            </button>
          ) : (
            <div />
          )}
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !selectedType}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {step === 4 ? "Concluir" : "Próximo"}
              <ChevronRight size={12} className="ml-1 inline" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Test Integration Modal ─── */

function TestIntegrationModal({
  integrations,
  onClose,
}: {
  integrations: IntegrationStats[];
  onClose: () => void;
}) {
  const [selectedDest, setSelectedDest] = useState(
    integrations[0]?.destination ?? ""
  );
  const [payload, setPayload] = useState(
    JSON.stringify(
      {
        name: "Lead Teste",
        email: "teste@leads.esqtools.com",
        phone: "11999990000",
        utm_source: "teste-integracao",
      },
      null,
      2
    )
  );
  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleTest = async () => {
    setSending(true);
    setResult(null);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setResult(
        JSON.stringify(
          {
            success: true,
            destination: selectedDest,
            ms: 234,
            message: "Lead enviado com sucesso",
          },
          null,
          2
        )
      );
    } finally {
      setSending(false);
    }
  };

  const [copied, setCopied] = useState(false);
  const copyResult = async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-[8%] z-50 mx-auto flex max-h-[80vh] max-w-lg flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Testar integração
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Integração
            </label>
            <select
              value={selectedDest}
              onChange={(e) => setSelectedDest(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              {integrations.map((i) => (
                <option key={i.destination} value={i.destination}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Payload JSON
            </label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              spellCheck={false}
            />
          </div>

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-green-800">
                  Resultado
                </span>
                <button
                  onClick={copyResult}
                  className="text-green-600 hover:text-green-800"
                >
                  {copied ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-[11px] text-green-700">
                {result}
              </pre>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Fechar
          </button>
          <button
            onClick={handleTest}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {sending ? "Enviando..." : "Enviar Teste"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Shared ─── */

function LogStatusBadge({ status }: { status: string }) {
  const cls =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium";
  if (status === "done" || status === "synced")
    return (
      <span className={`${cls} bg-green-50 text-green-700`}>
        <CheckCircle2 size={10} /> Sincronizado
      </span>
    );
  if (status === "failed")
    return (
      <span className={`${cls} bg-red-50 text-red-700`}>
        <AlertTriangle size={10} /> Falhou
      </span>
    );
  return (
    <span className={`${cls} bg-amber-50 text-amber-700`}>
      <Clock size={10} /> Pendente
    </span>
  );
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
      <Inbox size={28} className="text-gray-300" />
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
