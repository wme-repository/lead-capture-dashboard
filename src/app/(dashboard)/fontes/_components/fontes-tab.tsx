"use client";

import type { SourceWithStats } from "@/lib/fontes";
import { Plug, ChevronRight, Sheet, Webhook } from "lucide-react";

const DEST_ICONS: Record<string, { label: string; color: string }> = {
  sheets: { label: "Sheets", color: "bg-green-100 text-green-700" },
  datacrazy: { label: "DataCrazy", color: "bg-purple-100 text-purple-700" },
};

function StatusBadge({ count }: { count: number }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        count > 0
          ? "bg-green-50 text-green-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {count > 0 ? "ativa" : "sem leads"}
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

export default function FontesTab({ sources, onManage }: Props) {
  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
        <Plug size={28} className="text-gray-300" />
        <p className="text-sm font-medium text-gray-600">
          Nenhuma fonte cadastrada
        </p>
        <p className="text-xs text-gray-400">
          Clique em &ldquo;+ Nova Fonte&rdquo; para criar a primeira.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-4 py-2.5 font-medium text-gray-500">Status</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Nome</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Slug</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Tipo</th>
              <th className="px-4 py-2.5 font-medium text-gray-500 text-right">
                Leads
              </th>
              <th className="px-4 py-2.5 font-medium text-gray-500">
                Último lead
              </th>
              <th className="px-4 py-2.5 font-medium text-gray-500">
                Destinos
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sources.map((s) => (
              <tr
                key={s.id}
                className="group transition-colors hover:bg-gray-50/50"
              >
                <td className="px-4 py-3">
                  <StatusBadge count={s.leadCount} />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {s.name}
                </td>
                <td className="px-4 py-3">
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600">
                    /{s.slug}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    {s.schemaType === "questionnaire" ? "questionário" : "padrão"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                  {s.leadCount.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {timeAgo(s.lastLeadAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {s.destinations.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      s.destinations.map((d) => {
                        const meta = DEST_ICONS[d];
                        return (
                          <span
                            key={d}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              meta?.color ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {meta?.label ?? d}
                          </span>
                        );
                      })
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onManage(s)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-blue-600 opacity-0 transition-opacity hover:bg-blue-50 group-hover:opacity-100"
                  >
                    Gerenciar <ChevronRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-gray-100 md:hidden">
        {sources.map((s) => (
          <button
            key={s.id}
            onClick={() => onManage(s)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{s.name}</span>
                <StatusBadge count={s.leadCount} />
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                /{s.slug} · {s.leadCount} leads · {timeAgo(s.lastLeadAt)}
              </div>
            </div>
            <ChevronRight size={16} className="shrink-0 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
