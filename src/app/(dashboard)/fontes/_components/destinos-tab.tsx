"use client";

import type { SourceWithStats } from "@/lib/fontes";
import {
  Sheet,
  Webhook,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageCircle,
  Zap,
} from "lucide-react";

const DEST_META: Record<
  string,
  { label: string; icon: typeof Sheet; color: string }
> = {
  sheets: { label: "Google Sheets", icon: Sheet, color: "bg-green-100 text-green-700" },
  datacrazy: { label: "DataCrazy (CRM)", icon: Webhook, color: "bg-purple-100 text-purple-700" },
};

const FUTURE_DESTS = [
  { key: "kommo", label: "Kommo CRM", icon: Webhook },
  { key: "make", label: "Make (Integromat)", icon: Zap },
  { key: "n8n", label: "n8n", icon: Zap },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "webhook", label: "Webhook Externo", icon: Webhook },
];

type Props = {
  sources: SourceWithStats[];
  destStats: Record<
    string,
    { done: number; failed: number; pending: number; total: number; lastAttempt: string | null }
  >;
};

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

export default function DestinosTab({ sources, destStats }: Props) {
  const activeDests = Object.entries(destStats);
  const connectedSources = (dest: string) =>
    sources.filter((s) => s.destinations.includes(dest));

  return (
    <div className="space-y-4">
      {/* Active destinations */}
      {activeDests.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {activeDests.map(([dest, stats]) => {
            const meta = DEST_META[dest] ?? {
              label: dest,
              icon: Webhook,
              color: "bg-gray-100 text-gray-600",
            };
            const Icon = meta.icon;
            const health =
              stats.failed > 0 ? "erro" : stats.pending > 0 ? "pendências" : "saudável";

            return (
              <div
                key={dest}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {meta.label}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {connectedSources(dest).length} fonte(s) conectada(s)
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      health === "saudável"
                        ? "bg-green-50 text-green-700"
                        : health === "pendências"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {health}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <CheckCircle2 size={13} />
                      <span className="text-base font-semibold">{stats.done}</span>
                    </div>
                    <div className="text-[10px] text-gray-400">enviados</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-amber-600">
                      <Clock size={13} />
                      <span className="text-base font-semibold">{stats.pending}</span>
                    </div>
                    <div className="text-[10px] text-gray-400">pendentes</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-red-600">
                      <AlertTriangle size={13} />
                      <span className="text-base font-semibold">{stats.failed}</span>
                    </div>
                    <div className="text-[10px] text-gray-400">falhas</div>
                  </div>
                </div>

                <div className="mt-3 border-t border-gray-100 pt-2 text-center text-[11px] text-gray-400">
                  {stats.total.toLocaleString("pt-BR")} envios · Último: {timeAgo(stats.lastAttempt)}
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {connectedSources(dest).map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Future destinations */}
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase text-gray-400">
          Disponíveis em breve
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {FUTURE_DESTS.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-gray-200 bg-white/50 px-3 py-4 text-center opacity-50"
            >
              <Icon size={18} className="text-gray-400" />
              <span className="text-[11px] font-medium text-gray-500">{label}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-medium text-gray-400">
                em breve
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
