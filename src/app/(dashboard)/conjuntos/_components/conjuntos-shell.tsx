"use client";

import { useRouter } from "next/navigation";
import { Megaphone, RotateCw } from "lucide-react";
import { useState } from "react";

type ConjuntoRow = {
  conjunto: string;
  status: string;
  budgetDia: number;
  gasto: number;
  leads: number;
  cpl: number | null;
};
type Campanha = {
  campanha: string;
  lp: string | null;
  budgetDia: number;
  gasto: number;
  leads: number;
  cpl: number | null;
  conjuntos: ConjuntoRow[];
};

function money(v: number | null): string {
  return v == null
    ? "—"
    : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const LP_BADGE: Record<string, string> = {
  LP01: "bg-blue-50 text-blue-700",
  LP02: "bg-amber-50 text-amber-700",
};

export default function ConjuntosShell({ campanhas }: { campanhas: Campanha[] }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const totBudget = campanhas.reduce((s, c) => s + c.budgetDia, 0);
  const totGasto = campanhas.reduce((s, c) => s + c.gasto, 0);
  const totLeads = campanhas.reduce((s, c) => s + c.leads, 0);
  const totCpl = totLeads > 0 ? totGasto / totLeads : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Megaphone size={20} /> Conjuntos (Meta Ads)
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Orçamento, gasto e CPL por conjunto — campanhas [PROJETOTRT2].
          </p>
        </div>
        <button
          onClick={() => {
            setRefreshing(true);
            router.refresh();
            setTimeout(() => setRefreshing(false), 1200);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RotateCw size={13} className={refreshing ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Orçamento/dia", value: money(totBudget) },
          { label: "Gasto total", value: money(totGasto) },
          { label: "Leads (Meta)", value: totLeads.toLocaleString("pt-BR") },
          { label: "CPL geral", value: money(totCpl) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{k.value}</div>
          </div>
        ))}
      </div>

      {campanhas.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Nenhuma campanha [PROJETOTRT2] encontrada (ou Meta indisponível).
        </div>
      )}

      {campanhas.map((c) => (
        <div key={c.campanha} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
            <div className="flex items-center gap-2">
              {c.lp && (
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${LP_BADGE[c.lp] ?? "bg-gray-100 text-gray-600"}`}>
                  {c.lp}
                </span>
              )}
              <span className="text-sm font-medium text-gray-900">{c.campanha}</span>
            </div>
            <div className="flex gap-4 text-xs text-gray-600">
              <span>Orçamento: <b className="text-gray-900">{money(c.budgetDia)}/dia</b></span>
              <span>Gasto: <b className="text-gray-900">{money(c.gasto)}</b></span>
              <span>CPL: <b className="text-gray-900">{money(c.cpl)}</b></span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">Conjunto</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Orçamento/dia</th>
                <th className="px-4 py-2 text-right font-medium">Gasto</th>
                <th className="px-4 py-2 text-right font-medium">Leads</th>
                <th className="px-4 py-2 text-right font-medium">CPL</th>
              </tr>
            </thead>
            <tbody>
              {c.conjuntos.map((j, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 text-gray-800">{j.conjunto}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] ${j.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">{money(j.budgetDia)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{money(j.gasto)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{j.leads.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{money(j.cpl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
