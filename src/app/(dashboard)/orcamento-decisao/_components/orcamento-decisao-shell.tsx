"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Scale,
  RotateCw,
  AlertTriangle,
  TrendingUp,
  Flame,
  Snowflake,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Janela } from "@/lib/orcamento-decisao/adapter";
import { buildView, type DecisionRow, type OrcamentoView } from "@/lib/orcamento-decisao/view";
import { DEFAULT_DECISION_CONFIG } from "@/lib/orcamento-decisao/config";
import type { AdSet } from "@/lib/orcamento-decisao/types";
import {
  money,
  int,
  pct,
  DECISAO,
  BAND_STROKE,
  prioridadeTier,
  PRIORIDADE_BADGE,
  LP_BADGE,
  PUBLICO_BADGE,
} from "./decisao-ui";

const JANELAS: { id: Janela; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "3d", label: "3D" },
  { id: "7d", label: "7D" },
  { id: "14d", label: "14D" },
  { id: "custom", label: "Personalizado" },
];

function fracaoDoDia(now: number): number {
  const inicio = new Date(now);
  inicio.setHours(0, 0, 0, 0);
  return Math.min(1, (now - inicio.getTime()) / 86_400_000);
}

// ── Anel de score ──────────────────────────────────────────────────────────
function ScoreRing({ row }: { row: DecisionRow }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const filled = (row.score / 100) * c;
  return (
    <div className="relative inline-flex h-9 w-9 items-center justify-center">
      <svg width={36} height={36} className="-rotate-90">
        <circle cx={18} cy={18} r={r} fill="none" stroke="#e5e7eb" strokeWidth={3} />
        <circle
          cx={18}
          cy={18}
          r={r}
          fill="none"
          stroke={BAND_STROKE[row.scoreBand]}
          strokeWidth={3}
          strokeDasharray={`${filled} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-semibold text-gray-700">{row.score}</span>
    </div>
  );
}

// ── KPI card ────────────────────────────────────────────────────────────────
function Kpi({
  label,
  value,
  valueClass = "text-gray-900",
  hint,
  delta,
}: {
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
  delta?: { up: boolean; texto: string } | null;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${valueClass}`}>{value}</div>
      {hint && <div className="mt-1 text-sm text-gray-500">{hint}</div>}
      {delta && (
        <div className={`mt-1 flex items-center gap-0.5 text-sm ${delta.up ? "text-green-600" : "text-red-600"}`}>
          {delta.up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          {delta.texto}
        </div>
      )}
    </div>
  );
}

// ── Card de distribuição (barra visual por linha) ────────────────────────────
function DistCard({
  titulo,
  itens,
  icon,
}: {
  titulo: string;
  itens: OrcamentoView["distLp"];
  icon?: (chave: string) => React.ReactNode;
}) {
  const max = Math.max(1, ...itens.map((i) => i.orcamentoDia));
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-medium text-gray-600">{titulo}</div>
      <div className="space-y-3">
        {itens.map((i) => (
          <div key={i.chave}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium text-gray-800">
                {icon?.(i.chave)}
                {i.chave}
              </span>
              <span className="text-gray-600">
                {money(i.orcamentoDia)}/dia · {pct(i.pct)} · {int(i.leads)} leads
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gray-400" style={{ width: `${(i.orcamentoDia / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PublicoIcon({ chave }: { chave: string }) {
  if (chave === "QUENTE") return <Flame size={13} className="text-orange-500" />;
  if (chave === "FRIO") return <Snowflake size={13} className="text-sky-500" />;
  return null;
}

export default function OrcamentoDecisaoShell() {
  const [janela, setJanela] = useState<Janela>("hoje");
  const [recarregar, setRecarregar] = useState(0);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [now, setNow] = useState(0); // carimbo do fetch (impuro fica fora do render)
  const [ontem, setOntem] = useState<AdSet[] | null>(null);
  const [fonte, setFonte] = useState<string>("real");
  const [loading, setLoading] = useState(true);
  const [lpFiltro, setLpFiltro] = useState<Set<string>>(new Set());
  const [pubFiltro, setPubFiltro] = useState<Set<string>>(new Set());
  const [selecionada, setSelecionada] = useState<DecisionRow | null>(null);
  const [aplicadas, setAplicadas] = useState<Record<string, string>>({});

  function trocarJanela(j: Janela) {
    setLoading(true);
    setJanela(j);
  }
  function atualizar() {
    setLoading(true);
    setRecarregar((n) => n + 1);
  }

  useEffect(() => {
    let vivo = true;
    fetch(`/api/orcamento-decisao?janela=${janela}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { adSets: AdSet[]; fonte: string }) => {
        if (!vivo) return;
        setAdSets(d.adSets ?? []);
        setFonte(d.fonte ?? "real");
        setNow(Date.now());
        setLoading(false);
      })
      .catch(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
  }, [janela, recarregar]);

  // Baseline p/ Δ vs ontem (só faz sentido na janela "hoje").
  useEffect(() => {
    fetch(`/api/orcamento-decisao?janela=ontem`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { adSets: AdSet[] }) => setOntem(d.adSets ?? []))
      .catch(() => {});
  }, []);

  const toggle = (set: Set<string>, v: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  };

  const filtrados = useMemo(
    () =>
      adSets.filter(
        (a) => (lpFiltro.size === 0 || lpFiltro.has(a.lp)) && (pubFiltro.size === 0 || pubFiltro.has(a.publico)),
      ),
    [adSets, lpFiltro, pubFiltro],
  );

  const view = useMemo(
    () => buildView(filtrados, DEFAULT_DECISION_CONFIG, now, fracaoDoDia(now)),
    [filtrados, now],
  );

  const deltaOntem = useMemo(() => {
    if (janela !== "hoje" || !ontem) return null;
    const g = ontem.reduce((a, s) => a + s.gasto, 0);
    const l = ontem.reduce((a, s) => a + s.leads, 0);
    return { gasto: g, leads: l, cpl: l > 0 ? g / l : null };
  }, [janela, ontem]);

  const pacingMeta = {
    abaixo: { cls: "text-amber-600", txt: "Abaixo do ideal" },
    ok: { cls: "text-green-600", txt: "No ritmo" },
    acima: { cls: "text-red-600", txt: "Acima do ritmo" },
  }[view.kpis.pacingStatus];

  const cplCls =
    view.kpis.cpl == null
      ? "text-gray-400"
      : view.kpis.cpl <= DEFAULT_DECISION_CONFIG.cplMeta
        ? "text-green-600"
        : view.kpis.cpl <= 1.3 * DEFAULT_DECISION_CONFIG.cplMeta
          ? "text-amber-600"
          : "text-red-600";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Scale size={24} /> Orçamento &amp; Decisão
            {fonte === "mock" && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                dados de exemplo
              </span>
            )}
          </h1>
          <p className="mt-1 text-base text-gray-600">
            Mesa de decisão — cada métrica termina numa ação. A coluna <b>Decisão</b> vale mais que o status “ACTIVE”.
          </p>
        </div>
        <button
          onClick={atualizar}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RotateCw size={15} className={loading ? "animate-spin" : ""} /> Atualizar dados
        </button>
      </div>

      {/* KpiBar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi
          label="Orçamento ativo"
          value={`${money(view.kpis.orcAtivo)}/dia`}
        />
        <Kpi
          label="Gasto"
          value={money(view.kpis.gasto)}
          delta={
            deltaOntem ? { up: view.kpis.gasto >= deltaOntem.gasto, texto: `vs ontem ${money(deltaOntem.gasto)}` } : null
          }
        />
        <Kpi label="Pacing" value={pct(view.kpis.pacing, 1)} valueClass={pacingMeta.cls} hint={pacingMeta.txt} />
        <Kpi
          label="Leads"
          value={int(view.kpis.leads)}
          delta={deltaOntem ? { up: view.kpis.leads >= deltaOntem.leads, texto: `vs ontem ${int(deltaOntem.leads)}` } : null}
        />
        <Kpi label="CPL atual" value={money(view.kpis.cpl)} valueClass={cplCls} hint={`meta ${money(DEFAULT_DECISION_CONFIG.cplMeta)}`} />
        <Kpi
          label="Budget em risco"
          value={`${money(view.kpis.budgetEmRisco)}/dia`}
          valueClass="text-red-600"
          hint={`${pct(view.kpis.budgetEmRiscoPct)} do orçamento`}
        />
      </div>

      {/* AlertStrip */}
      {view.alerts.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {view.alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-bold ${
                a.prioridade === "alta"
                  ? "border-red-700 bg-red-700 text-white"
                  : a.prioridade === "media"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-gray-200 bg-gray-50 text-gray-700"
              }`}
            >
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <span>{a.texto}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex gap-1">
          {JANELAS.map((j) => (
            <button
              key={j.id}
              onClick={() => trocarJanela(j.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                janela === j.id ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {j.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex gap-1">
          {["LP01", "LP02"].map((lp) => (
            <button
              key={lp}
              onClick={() => toggle(lpFiltro, lp, setLpFiltro)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                lpFiltro.has(lp) ? LP_BADGE[lp] : "bg-gray-100 text-gray-500"
              }`}
            >
              {lp}
            </button>
          ))}
          {["QUENTE", "FRIO"].map((p) => (
            <button
              key={p}
              onClick={() => toggle(pubFiltro, p, setPubFiltro)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium ${
                pubFiltro.has(p) ? PUBLICO_BADGE[p] : "bg-gray-100 text-gray-500"
              }`}
            >
              <PublicoIcon chave={p} />
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: distribuição + ações */}
      <div className="grid gap-3 lg:grid-cols-3">
        <DistCard titulo="Por LP" itens={view.distLp} icon={(k) => <span className={`rounded px-1 text-[10px] ${LP_BADGE[k] ?? ""}`}>{k}</span>} />
        <DistCard titulo="Por público" itens={view.distPublico} icon={(k) => <PublicoIcon chave={k} />} />
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-600">
            <TrendingUp size={15} /> Ações recomendadas
          </div>
          {view.actions.length === 0 ? (
            <div className="text-sm text-gray-500">Nada urgente — tudo dentro da meta.</div>
          ) : (
            <ol className="space-y-2.5">
              {view.actions.map((a, i) => (
                <li key={a.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                    {i + 1}
                  </span>
                  <span className="flex-1">{a.texto}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PRIORIDADE_BADGE[a.prioridade]}`}>
                    {a.prioridade === "alta" ? "Alta" : a.prioridade === "media" ? "Média" : "Baixa"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* DecisionTable */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-gray-100 text-left text-sm text-gray-600">
              <th className="px-3 py-3 font-medium">Prioridade</th>
              <th className="px-3 py-3 font-medium">LP</th>
              <th className="px-3 py-3 font-medium">Público</th>
              <th className="px-3 py-3 font-medium">Conjunto</th>
              <th className="px-3 py-3 text-right font-medium">Orç./dia</th>
              <th className="px-3 py-3 text-right font-medium">Gasto</th>
              <th className="px-3 py-3 text-right font-medium">Leads</th>
              <th className="px-3 py-3 text-right font-medium">CPL</th>
              <th className="px-3 py-3 text-right font-medium">CTR</th>
              <th className="px-3 py-3 text-right font-medium">Connect</th>
              <th className="px-3 py-3 text-center font-medium">Score</th>
              <th className="px-3 py-3 text-center font-medium">Decisão</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => {
              const tier = prioridadeTier(r.urgencia);
              const dec = DECISAO[r.decision];
              return (
                <tr
                  key={r.id}
                  onClick={() => setSelecionada(r)}
                  className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                >
                  <td className="px-3 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${tier.cls}`}>{tier.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${LP_BADGE[r.lp] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.lp}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`flex w-fit items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${PUBLICO_BADGE[r.publico]}`}>
                      <PublicoIcon chave={r.publico} />
                      {r.publico}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-800">
                    {r.conjunto}
                    {r.flags.length > 0 && (
                      <span className="ml-1 text-xs text-gray-500">
                        {r.flags.map((f) => ({ trocar_criativo: "criativo", revisar_lp: "LP", rever_publico: "público" })[f]).join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700">{money(r.orcamentoDia)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{money(r.gasto)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{int(r.leads)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-900">{money(r.cpl)}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{pct(r.ctr, 2)}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{r.connectRate > 0 ? pct(r.connectRate) : "—"}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center">
                      <ScoreRing row={r} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAplicadas((m) => ({ ...m, [r.id]: r.decision }));
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${dec.btn}`}
                    >
                      {aplicadas[r.id] ? "✓ aplicado" : dec.label}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ExecutiveSummary */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-1 text-sm font-medium text-gray-600">Resumo executivo</div>
        <p className="text-base leading-relaxed text-gray-700">{view.resumo}</p>
        <button className="mt-2 text-sm font-medium text-blue-600 hover:underline">Ver relatório completo →</button>
      </div>

      {/* DrilldownPanel */}
      {selecionada && (
        <Drilldown row={selecionada} onClose={() => setSelecionada(null)} />
      )}
    </div>
  );
}

// ── Painel de detalhe (placeholder com mock) ─────────────────────────────────
function Drilldown({ row, onClose }: { row: DecisionRow; onClose: () => void }) {
  const dec = DECISAO[row.decision];
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <div
        className="h-full w-full max-w-5xl overflow-y-auto border-l border-gray-200 bg-white p-10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base text-gray-500">{row.campanha}</div>
            <h2 className="mt-1 text-4xl font-semibold text-gray-900">{row.conjunto}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className={`rounded px-2.5 py-1 text-base font-medium ${LP_BADGE[row.lp] ?? ""}`}>{row.lp}</span>
              <span className={`rounded px-2.5 py-1 text-base font-medium ${PUBLICO_BADGE[row.publico]}`}>{row.publico}</span>
              <span className={`rounded px-2.5 py-1 text-base font-semibold ${dec.chip}`}>{dec.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-gray-100">
            <X size={28} />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { l: "CPL", v: money(row.cpl) },
            { l: "Score", v: String(row.score) },
            { l: "Gasto", v: money(row.gasto) },
            { l: "Leads", v: int(row.leads) },
            { l: "CTR", v: pct(row.ctr, 2) },
            { l: "Connect", v: row.connectRate > 0 ? pct(row.connectRate) : "—" },
          ].map((m) => (
            <div key={m.l} className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <div className="text-sm text-gray-500">{m.l}</div>
              <div className="mt-1 text-3xl font-semibold text-gray-800">{m.v}</div>
            </div>
          ))}
        </div>

        {row.flags.length > 0 && (
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5 text-base font-medium text-amber-800">
            Sinais: {row.flags.map((f) => ({ trocar_criativo: "trocar criativo", revisar_lp: "revisar LP", rever_publico: "rever público" })[f]).join(" · ")}
          </div>
        )}

        {/* Seções placeholder (mock) */}
        {["Criativos & anúncios", "Histórico 3D / 7D", "Eventos", "UTMs"].map((s) => (
          <div key={s} className="mt-8">
            <div className="mb-2 text-base font-medium text-gray-600">{s}</div>
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-base text-gray-500">
              Dados de {s.toLowerCase()} aparecem aqui quando o adapter real estiver ligado.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
