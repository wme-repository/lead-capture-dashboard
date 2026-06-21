"use client";

import { useRouter } from "next/navigation";
import { Megaphone, RotateCw, Flame, Snowflake } from "lucide-react";
import { useState } from "react";

type ConjuntoRow = {
  conjunto: string;
  campNum: string;
  status: string;
  budgetDia: number;
  gasto: number;
  leads: number;
  cpl: number | null;
};
type Campanha = {
  campanha: string;
  lp: string | null;
  temperatura: string | null;
  conjuntos: ConjuntoRow[];
};
type Row = ConjuntoRow & { campanha: string; _lp: string | null; _temp: string | null };

function money(v: number | null): string {
  return v == null
    ? "—"
    : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const LPS = ["LP01", "LP02", "Sem LP"] as const;
const TEMPS = ["QUENTE", "FRIO", "Outros"] as const;
const LP_BADGE: Record<string, string> = {
  LP01: "bg-blue-50 text-blue-700",
  LP02: "bg-amber-50 text-amber-700",
};

function subtotal(rows: Row[]) {
  const budgetDia = rows.reduce((s, r) => s + r.budgetDia, 0);
  const gasto = rows.reduce((s, r) => s + r.gasto, 0);
  const leads = rows.reduce((s, r) => s + r.leads, 0);
  return { budgetDia, gasto, leads, cpl: leads > 0 ? gasto / leads : null };
}

function TempIcon({ t }: { t: string }) {
  if (t === "QUENTE") return <Flame size={14} className="text-orange-500" />;
  if (t === "FRIO") return <Snowflake size={14} className="text-sky-500" />;
  return null;
}

export default function ConjuntosShell({ campanhas }: { campanhas: Campanha[] }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Flatten conjuntos, then group by LP → temperatura
  const all: Row[] = campanhas.flatMap((c) =>
    c.conjuntos.map((j) => ({ ...j, campanha: c.campanha, _lp: c.lp, _temp: c.temperatura }))
  );

  const grouped: Record<string, Record<string, Row[]>> = {};
  for (const r of all) {
    const lp = r._lp ?? "Sem LP";
    const t = r._temp ?? "Outros";
    (grouped[lp] ??= {});
    (grouped[lp][t] ??= []).push(r);
  }

  const tot = subtotal(all);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Megaphone size={20} /> Conjuntos (Meta Ads)
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Orçamento, gasto e CPL por conjunto — agrupado por LP e público (QUENTE/FRIO). Campanhas [PROJETOTRT2].
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Orçamento/dia", value: money(tot.budgetDia) },
          { label: "Gasto total", value: money(tot.gasto) },
          { label: "Leads (por UTM)", value: tot.leads.toLocaleString("pt-BR") },
          { label: "CPL geral", value: money(tot.cpl) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Resumo consolidado por LP e por público */}
      {all.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 text-xs font-medium text-gray-500">Por LP</div>
            <div className="space-y-1.5">
              {(["LP01", "LP02"] as const).map((lp) => {
                const rows = all.filter((r) => r._lp === lp);
                if (!rows.length) return null;
                const s = subtotal(rows);
                return (
                  <div key={lp} className="flex items-center justify-between text-sm">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${LP_BADGE[lp]}`}>{lp}</span>
                    <span className="text-gray-600">{money(s.budgetDia)}/dia · gasto {money(s.gasto)} · CPL {money(s.cpl)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 text-xs font-medium text-gray-500">Por público</div>
            <div className="space-y-1.5">
              {(["QUENTE", "FRIO"] as const).map((t) => {
                const rows = all.filter((r) => (r._temp ?? "Outros") === t);
                if (!rows.length) return null;
                const s = subtotal(rows);
                return (
                  <div key={t} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-700"><TempIcon t={t} />{t}</span>
                    <span className="text-gray-600">{money(s.budgetDia)}/dia · gasto {money(s.gasto)} · CPL {money(s.cpl)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {all.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Nenhuma campanha [PROJETOTRT2] encontrada (ou Meta indisponível).
        </div>
      )}

      {/* LP → QUENTE/FRIO → conjuntos */}
      {LPS.filter((lp) => grouped[lp]).map((lp) => {
        const lpRows = Object.values(grouped[lp]).flat();
        const sl = subtotal(lpRows);
        return (
          <div key={lp} className="space-y-3">
            <div className="flex items-center gap-2 pt-1">
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${LP_BADGE[lp] ?? "bg-gray-100 text-gray-600"}`}>{lp}</span>
              <span className="text-xs text-gray-500">
                · {money(sl.budgetDia)}/dia · gasto {money(sl.gasto)} · CPL {money(sl.cpl)}
              </span>
            </div>

            {TEMPS.filter((t) => grouped[lp][t]).map((t) => {
              const rows = grouped[lp][t];
              const s = subtotal(rows);
              return (
                <div key={t} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800"><TempIcon t={t} />{t}</span>
                    <div className="flex gap-4 text-xs text-gray-600">
                      <span>Orçamento: <b className="text-gray-900">{money(s.budgetDia)}/dia</b></span>
                      <span>Gasto: <b className="text-gray-900">{money(s.gasto)}</b></span>
                      <span>CPL: <b className="text-gray-900">{money(s.cpl)}</b></span>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                        <th className="px-4 py-2 font-medium">Camp.</th>
                        <th className="px-4 py-2 font-medium">Conjunto</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 text-right font-medium">Orçamento/dia</th>
                        <th className="px-4 py-2 text-right font-medium">Gasto</th>
                        <th className="px-4 py-2 text-right font-medium">Leads</th>
                        <th className="px-4 py-2 text-right font-medium">CPL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((j, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-2">
                            {j.campNum ? (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">#{j.campNum}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
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
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
