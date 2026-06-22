import type { AdSet, Decision, DecisionConfig, DecisionFlag, Publico } from './types';
import { classifyDecision } from './decision';
import { computeBudgetBuckets, type BudgetBuckets } from './budget';
import { computeCpl, computePacing, pacingStatus, type PacingStatus } from './metrics';
import { computeScore, scoreBand, type ScoreBand } from './score';

export interface DecisionRow extends AdSet {
  decision: Decision;
  flags: DecisionFlag[];
  cpl: number | null;
  score: number;
  scoreBand: ScoreBand;
  urgencia: number; // menor = mais urgente
}

export interface Kpis {
  orcAtivo: number;
  gasto: number;
  pacing: number; // gasto / orçamento ativo
  pacingStatus: PacingStatus;
  leads: number;
  cpl: number | null;
  budgetEmRisco: number;
  budgetEmRiscoPct: number; // sobre o orçamento ativo
}

export interface DistItem {
  chave: string;
  orcamentoDia: number;
  pct: number; // sobre o total
  gasto: number;
  leads: number;
}

export type Prioridade = 'alta' | 'media' | 'baixa';
export interface Alert {
  id: string;
  prioridade: Prioridade;
  texto: string;
}
export interface RecommendedAction {
  id: string;
  prioridade: Prioridade;
  texto: string;
}

export interface OrcamentoView {
  kpis: Kpis;
  buckets: BudgetBuckets;
  rows: DecisionRow[];
  distLp: DistItem[];
  distPublico: DistItem[];
  alerts: Alert[];
  actions: RecommendedAction[];
  resumo: string;
}

// Ordem de urgência (prompt): sem_entrega → gastando sem lead → CPL ruim
// (pausar → reduzir) → escalar → manter → aguardando (observar). Nunca por campanha.
function urgencia(r: { decision: Decision; leads: number; gasto: number }): number {
  if (r.decision === 'sem_entrega') return 0;
  if (r.leads === 0 && r.gasto > 0) return 1; // gastando sem lead
  if (r.decision === 'pausar') return 2;
  if (r.decision === 'reduzir') return 3;
  if (r.decision === 'escalar') return 4;
  if (r.decision === 'manter') return 5;
  return 6; // observar / aguardando dados
}

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function distribuir(rows: DecisionRow[], chaveDe: (r: DecisionRow) => string): DistItem[] {
  const total = rows.reduce((a, r) => a + r.orcamentoDia, 0);
  const map = new Map<string, DistItem>();
  for (const r of rows) {
    const k = chaveDe(r);
    const e = map.get(k) ?? { chave: k, orcamentoDia: 0, pct: 0, gasto: 0, leads: 0 };
    e.orcamentoDia += r.orcamentoDia;
    e.gasto += r.gasto;
    e.leads += r.leads;
    map.set(k, e);
  }
  const out = [...map.values()];
  for (const e of out) e.pct = total > 0 ? e.orcamentoDia / total : 0;
  return out.sort((a, b) => b.orcamentoDia - a.orcamentoDia);
}

function montarAlertas(rows: DecisionRow[], distPublico: DistItem[]): Alert[] {
  const alerts: Alert[] = [];

  const semEntrega = rows.filter((r) => r.decision === 'sem_entrega');
  if (semEntrega.length > 0) {
    // Prioridade máxima: ativo sem entrega.
    alerts.push({
      id: 'sem-entrega',
      prioridade: 'alta',
      texto: `${semEntrega.length} conjunto(s) ativo(s) sem entrega (gastando R$ 0)`,
    });
  }

  const semLead = rows.filter((r) => r.leads === 0 && r.gasto > 0);
  if (semLead.length > 0) {
    alerts.push({
      id: 'sem-lead',
      prioridade: 'alta',
      texto: `${semLead.length} conjunto(s) gastando sem lead`,
    });
  }

  const escalar = rows.filter((r) => r.decision === 'escalar');
  if (escalar.length > 0) {
    alerts.push({
      id: 'escalar',
      prioridade: 'media',
      texto: `${escalar.length} conjunto(s) pronto(s) para escalar`,
    });
  }

  const concentrado = distPublico.find((d) => d.pct >= 0.6);
  if (concentrado) {
    alerts.push({
      id: 'concentracao',
      prioridade: 'baixa',
      texto: `${concentrado.chave} concentra ${Math.round(concentrado.pct * 100)}% do orçamento`,
    });
  }

  return alerts.slice(0, 4);
}

const PESO_PRIORIDADE: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

function montarAcoes(rows: DecisionRow[]): RecommendedAction[] {
  const acoes: RecommendedAction[] = [];

  for (const r of rows.filter((x) => x.decision === 'sem_entrega')) {
    acoes.push({ id: `entrega-${r.id}`, prioridade: 'alta', texto: `Verificar entrega de "${r.conjunto}" (ativo, R$ 0)` });
  }
  for (const r of rows.filter((x) => x.decision === 'pausar')) {
    acoes.push({
      id: `pausar-${r.id}`,
      prioridade: 'alta',
      texto: `Pausar "${r.conjunto}"${r.cpl != null ? ` (CPL R$ ${brl(r.cpl)})` : ' (sem lead)'}`,
    });
  }
  for (const r of rows.filter((x) => x.decision === 'reduzir')) {
    acoes.push({ id: `reduzir-${r.id}`, prioridade: 'media', texto: `Reduzir orçamento de "${r.conjunto}"${r.cpl != null ? ` (CPL R$ ${brl(r.cpl)})` : ''}` });
  }
  for (const r of rows.filter((x) => x.decision === 'escalar')) {
    acoes.push({ id: `escalar-${r.id}`, prioridade: 'media', texto: `Escalar "${r.conjunto}" (CPL R$ ${brl(r.cpl ?? 0)}, connect ${Math.round(r.connectRate * 100)}%)` });
  }

  return acoes.sort((a, b) => PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade]).slice(0, 5);
}

function montarResumo(kpis: Kpis, buckets: BudgetBuckets, rows: DecisionRow[]): string {
  const semEntrega = rows.filter((r) => r.decision === 'sem_entrega').length;
  const escalar = rows.filter((r) => r.decision === 'escalar').length;
  const pausar = rows.filter((r) => r.decision === 'pausar').length;
  const cpl = kpis.cpl != null ? `R$ ${brl(kpis.cpl)}` : '—';
  const riscoPct = Math.round(kpis.budgetEmRiscoPct * 100);

  const partes = [
    `Orçamento ativo de R$ ${brl(kpis.orcAtivo)}/dia com ${kpis.leads} leads e CPL ${cpl}.`,
    `${riscoPct}% do orçamento está em risco (R$ ${brl(buckets.emRisco)}/dia).`,
  ];
  if (semEntrega > 0) partes.push(`${semEntrega} conjunto(s) ativo(s) sem entrega — ação imediata.`);
  if (pausar > 0) partes.push(`${pausar} para pausar.`);
  if (escalar > 0) partes.push(`${escalar} com folga para escalar (R$ ${brl(buckets.escalavel)}/dia).`);
  return partes.join(' ');
}

// Monta todo o view-model da aba a partir dos conjuntos. Puro: recebe `now` e a
// fração do dia decorrida (p/ o status de pacing) — não chama Date.now() dentro.
export function buildView(
  adSets: AdSet[],
  config: DecisionConfig,
  now: number,
  fracaoDiaDecorrida: number,
): OrcamentoView {
  const rows: DecisionRow[] = adSets.map((a) => {
    const { decision, flags } = classifyDecision(a, config, now);
    const cpl = computeCpl(a.gasto, a.leads);
    const score = computeScore({ cpl, ctr: a.ctr, connectRate: a.connectRate, leadScore: a.leadScore }, config);
    return { ...a, decision, flags, cpl, score, scoreBand: scoreBand(score), urgencia: urgencia({ decision, leads: a.leads, gasto: a.gasto }) };
  });

  rows.sort((a, b) => a.urgencia - b.urgencia || b.gasto - a.gasto);

  const orcAtivo = adSets.filter((a) => a.status === 'ACTIVE').reduce((s, a) => s + a.orcamentoDia, 0);
  const gasto = adSets.reduce((s, a) => s + a.gasto, 0);
  const leads = adSets.reduce((s, a) => s + a.leads, 0);
  const buckets = computeBudgetBuckets(adSets, config, now);
  const pacing = computePacing(gasto, orcAtivo);

  const kpis: Kpis = {
    orcAtivo,
    gasto,
    pacing,
    pacingStatus: pacingStatus(pacing, fracaoDiaDecorrida),
    leads,
    cpl: computeCpl(gasto, leads),
    budgetEmRisco: buckets.emRisco,
    budgetEmRiscoPct: orcAtivo > 0 ? buckets.emRisco / orcAtivo : 0,
  };

  const distLp = distribuir(rows, (r) => r.lp);
  const distPublico = distribuir(rows, (r) => r.publico as Publico);

  return {
    kpis,
    buckets,
    rows,
    distLp,
    distPublico,
    alerts: montarAlertas(rows, distPublico),
    actions: montarAcoes(rows),
    resumo: montarResumo(kpis, buckets, rows),
  };
}
