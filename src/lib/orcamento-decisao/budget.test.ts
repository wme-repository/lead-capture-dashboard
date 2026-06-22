import { computeBudgetBuckets } from './budget';
import { DEFAULT_DECISION_CONFIG } from './config';
import type { AdSet } from './types';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

function ad(over: Partial<AdSet>): AdSet {
  return {
    id: 'x',
    campanha: 'c',
    conjunto: 'j',
    lp: 'LP01',
    publico: 'FRIO',
    status: 'ACTIVE',
    orcamentoDia: 100,
    gasto: 30,
    leads: 6,
    ctr: 0.016,
    connectRate: 0.42,
    leadScore: 60,
    ultimaEntrega: NOW - 5 * 60_000,
    ...over,
  };
}

describe('computeBudgetBuckets', () => {
  const sets: AdSet[] = [
    ad({ orcamentoDia: 100, gasto: 43.7, leads: 10, connectRate: 0.42 }), // escalar
    ad({ orcamentoDia: 80, gasto: 30, leads: 6, connectRate: 0.3 }), // manter
    ad({ orcamentoDia: 60, gasto: 90, leads: 10 }), // reduzir → risco
    ad({ orcamentoDia: 40, status: 'ACTIVE', gasto: 0, leads: 0, ultimaEntrega: NOW - 5 * HOUR }), // sem_entrega → risco
    ad({ orcamentoDia: 50, status: 'PAUSED', gasto: 12.33, leads: 1, connectRate: 0.42 }), // cpl 12,33 > 2×6 → pausar/risco
  ];

  const b = computeBudgetBuckets(sets, DEFAULT_DECISION_CONFIG, NOW); // cplMeta 6

  it('ativo = soma dos ACTIVE', () => {
    // 100 + 80 + 60 + 40 (o de 50 está PAUSED)
    expect(b.ativo).toBe(280);
  });
  it('emRisco = reduzir + sem_entrega + pausar', () => {
    expect(b.emRisco).toBe(60 + 40 + 50);
  });
  it('saudavel = escalar + manter', () => {
    expect(b.saudavel).toBe(100 + 80);
  });
  it('escalavel = só escalar', () => {
    expect(b.escalavel).toBe(100);
  });
});
