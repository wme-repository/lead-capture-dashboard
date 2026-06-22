import { mockAdapter } from './mockAdapter';
import { classifyDecision } from './decision';
import { computeCpl, computePacing } from './metrics';
import { DEFAULT_DECISION_CONFIG } from './config';

describe('mockAdapter — janela "hoje" bate com os KPIs do design', () => {
  it('agregados: orçamento 6.185 · gasto 1.842 · leads 312 · CPL 5,90 · pacing 29,8%', async () => {
    const sets = await mockAdapter.fetchAdSets('hoje');

    const orcAtivo = sets
      .filter((s) => s.status === 'ACTIVE')
      .reduce((acc, s) => acc + s.orcamentoDia, 0);
    const gasto = sets.reduce((acc, s) => acc + s.gasto, 0);
    const leads = sets.reduce((acc, s) => acc + s.leads, 0);

    expect(orcAtivo).toBe(6185);
    expect(gasto).toBeCloseTo(1842, 2);
    expect(leads).toBe(312);
    expect(computeCpl(gasto, leads)).toBeCloseTo(5.9, 2);
    expect(computePacing(gasto, orcAtivo)).toBeCloseTo(0.298, 3);
  });

  it('distribuição: LP01/LP02 ≈ 50/50 · QUENTE ≈ 34% / FRIO ≈ 66%', async () => {
    const sets = await mockAdapter.fetchAdSets('hoje');
    const total = sets.reduce((a, s) => a + s.orcamentoDia, 0);
    const lp01 = sets.filter((s) => s.lp === 'LP01').reduce((a, s) => a + s.orcamentoDia, 0);
    const quente = sets.filter((s) => s.publico === 'QUENTE').reduce((a, s) => a + s.orcamentoDia, 0);

    expect(lp01 / total).toBeCloseTo(0.5, 2);
    expect(quente / total).toBeCloseTo(0.34, 2);
  });

  it('cobre sem_entrega, pausar e escalar', async () => {
    const sets = await mockAdapter.fetchAdSets('hoje');
    const now = Date.now();
    const decisions = new Set(
      sets.map((s) => classifyDecision(s, DEFAULT_DECISION_CONFIG, now).decision),
    );
    expect(decisions).toContain('sem_entrega');
    expect(decisions).toContain('pausar');
    expect(decisions).toContain('escalar');
  });

  it('janela maior acumula mais gasto (Controls recalcula)', async () => {
    const hoje = await mockAdapter.fetchAdSets('hoje');
    const sete = await mockAdapter.fetchAdSets('7d');
    const gHoje = hoje.reduce((a, s) => a + s.gasto, 0);
    const g7 = sete.reduce((a, s) => a + s.gasto, 0);
    expect(g7).toBeGreaterThan(gHoje);
  });
});
