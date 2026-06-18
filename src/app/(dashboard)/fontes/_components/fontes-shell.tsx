"use client";

import { useState, useCallback } from "react";
import type { SourceWithStats, SyncLogEntry } from "@/lib/fontes";
import {
  Plus,
  Send,
  ScrollText,
  Plug,
  Globe,
  ArrowUpRight,
  AlertTriangle,
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

export default function FontesShell({ sources, logs, failures, destStats, appUrl }: Props) {
  const [tab, setTab] = useState<Tab>("fontes");
  const [drawerSource, setDrawerSource] = useState<SourceWithStats | null>(null);
  const [showNewSource, setShowNewSource] = useState(false);
  const [showTestLead, setShowTestLead] = useState(false);

  const handleManage = useCallback((s: SourceWithStats) => setDrawerSource(s), []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Fontes de captação
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Controle operacional de fontes, webhooks, destinos e sincronizações.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowNewSource(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={14} /> Nova Fonte
          </button>
          <button
            onClick={() => setShowTestLead(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Send size={14} /> Lead Teste
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={14} />
            {label}
            {key === "falhas" && failures.length > 0 && (
              <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
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
