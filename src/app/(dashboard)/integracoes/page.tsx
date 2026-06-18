import { prisma } from "@/lib/prisma";
import { Sheet, Webhook, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const DEST_META: Record<string, { label: string; icon: typeof Sheet }> = {
  sheets: { label: "Google Sheets", icon: Sheet },
  "google-sheets": { label: "Google Sheets", icon: Sheet },
  datacrazy: { label: "DataCrazy (CRM)", icon: Webhook },
};

export default async function IntegracoesPage() {
  const groups = await prisma.syncLog.groupBy({
    by: ["destination", "status"],
    _count: { _all: true },
  });

  const byDest = new Map<string, { done: number; pending: number; failed: number }>();
  for (const g of groups) {
    const e = byDest.get(g.destination) ?? { done: 0, pending: 0, failed: 0 };
    if (g.status === "done" || g.status === "synced") e.done += g._count._all;
    else if (g.status === "failed") e.failed += g._count._all;
    else e.pending += g._count._all;
    byDest.set(g.destination, e);
  }

  const destinations = [...byDest.entries()];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Integrações</h1>
        <p className="mt-1 text-xs text-gray-500">
          Status de sincronização dos leads com cada destino externo.
        </p>
      </div>

      {destinations.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-600">Nenhuma sincronização registrada</p>
          <p className="mt-1 text-xs text-gray-400">
            Quando uma fonte tiver um destino configurado (Sheets ou CRM), o histórico aparece aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {destinations.map(([dest, c]) => {
            const meta = DEST_META[dest] ?? { label: dest, icon: Webhook };
            const Icon = meta.icon;
            const totals=c.done+c.pending+c.failed;
            const health = c.failed > 0 ? "erro" : c.pending > 0 ? "pendências" : "saudável";
            return (
              <div key={dest} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <Icon size={17} />
                    </div>
                    <span className="font-medium text-gray-900">{meta.label}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
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
                      <CheckCircle2 size={14} />
                      <span className="text-lg font-semibold">{c.done}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">sincronizados</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-amber-600">
                      <Clock size={14} />
                      <span className="text-lg font-semibold">{c.pending}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">pendentes</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-red-600">
                      <AlertTriangle size={14} />
                      <span className="text-lg font-semibold">{c.failed}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">com erro</div>
                  </div>
                </div>
                <div className="mt-3 text-center text-[11px] text-gray-400">
                  {totals.toLocaleString("pt-BR")} tentativas no total
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
