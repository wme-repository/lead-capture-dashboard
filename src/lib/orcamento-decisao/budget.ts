import type { AdSet, Decision, DecisionConfig } from './types';
import { classifyDecision } from './decision';

export interface BudgetBuckets {
  ativo: number; // Σ orçamento/dia com status ACTIVE
  emRisco: number; // Σ orçamento/dia em decisões de risco
  saudavel: number; // Σ orçamento/dia em decisões saudáveis
  escalavel: number; // Σ orçamento/dia pronto p/ escalar
}

const EM_RISCO: ReadonlySet<Decision> = new Set([
  'sem_entrega',
  'pausar',
  'reduzir',
  'observar',
]);
const SAUDAVEL: ReadonlySet<Decision> = new Set(['manter', 'escalar']);

export function computeBudgetBuckets(
  adSets: AdSet[],
  config: DecisionConfig,
  now: number,
): BudgetBuckets {
  const b: BudgetBuckets = { ativo: 0, emRisco: 0, saudavel: 0, escalavel: 0 };
  for (const a of adSets) {
    if (a.status === 'ACTIVE') b.ativo += a.orcamentoDia;
    const { decision } = classifyDecision(a, config, now);
    if (EM_RISCO.has(decision)) b.emRisco += a.orcamentoDia;
    if (SAUDAVEL.has(decision)) b.saudavel += a.orcamentoDia;
    if (decision === 'escalar') b.escalavel += a.orcamentoDia;
  }
  return b;
}
