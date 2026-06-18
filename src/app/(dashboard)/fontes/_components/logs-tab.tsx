"use client";

import { useState } from "react";
import type { SyncLogEntry } from "@/lib/fontes";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  RotateCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const STATUS_MAP: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  done: { icon: CheckCircle2, color: "text-green-600", label: "sucesso" },
  failed: { icon: XCircle, color: "text-red-600", label: "falha" },
  pending: { icon: Clock, color: "text-amber-600", label: "pendente" },
};

function formatDt(iso: string | Date): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-600"
      title="Copiar ID"
    >
      {copied ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
      ID
    </button>
  );
}

type Props = {
  logs: SyncLogEntry[];
  isFalhas?: boolean;
};

export default function LogsTab({ logs, isFalhas }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-600">
          {isFalhas ? "Nenhuma falha registrada" : "Nenhum log registrado"}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {isFalhas
            ? "Todas as sincronizações estão funcionando normalmente."
            : "Quando leads forem enviados, os logs aparecerão aqui."}
        </p>
      </div>
    );
  }

  const handleRetry = async (logId: string) => {
    setRetrying(logId);
    try {
      await fetch("/api/cron/retry", {
        headers: { "X-Cron-Secret": "trigger" },
      });
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-4 py-2.5 font-medium text-gray-500">Data/hora</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Lead</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Fonte</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Destino</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Status</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Tentativas</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map((log) => {
              const meta = STATUS_MAP[log.status] ?? STATUS_MAP.pending;
              const Icon = meta.icon;
              const isExpanded = expandedId === log.id;

              return (
                <>
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-2.5 tabular-nums text-gray-600">
                      {formatDt(log.attemptedAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">
                        {log.lead.name ?? "—"}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {log.lead.email ?? log.lead.phone ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {log.lead.source.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          log.destination === "sheets"
                            ? "bg-green-100 text-green-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {log.destination === "sheets" ? "Sheets" : log.destination}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 ${meta.color}`}>
                        <Icon size={12} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-600">
                      {log.attemptCount}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {log.error && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-gray-700"
                          >
                            {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            Erro
                          </button>
                        )}
                        {log.status === "failed" && (
                          <button
                            onClick={() => handleRetry(log.id)}
                            disabled={retrying === log.id}
                            className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            <RotateCw size={10} className={retrying === log.id ? "animate-spin" : ""} />
                            Reprocessar
                          </button>
                        )}
                        <CopyId id={log.id} />
                      </div>
                    </td>
                  </tr>
                  {isExpanded && log.error && (
                    <tr key={`${log.id}-err`}>
                      <td colSpan={7} className="bg-red-50/50 px-4 py-2">
                        <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-red-700">
                          {log.error}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-2 text-center text-[11px] text-gray-400">
        Exibindo {logs.length} registro(s) mais recentes
      </div>
    </div>
  );
}
