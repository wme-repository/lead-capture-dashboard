import { buildView } from './view';
import { mockAdapter } from './mockAdapter';
import { DEFAULT_DECISION_CONFIG } from './config';

describe('buildView (sem React)', () => {
  it('monta KPIs, ordena por urgência e gera alerta de "sem entrega" no topo', async () => {
    const sets = await mockAdapter.fetchAdSets('hoje');
    const now = Date.now();
    const view = buildView(sets, DEFAULT_DECISION_CONFIG, now, 0.75);

    // KPIs do design
    expect(view.kpis.orcAtivo).toBe(6185);
    expect(view.kpis.cpl).toBeCloseTo(5.9, 2);
    expect(view.kpis.pacingStatus).toBe('abaixo'); // 29,8% gasto com 75% do dia

    // Primeira linha é a mais urgente (sem_entrega)
    expect(view.rows[0].decision).toBe('sem_entrega');

    // Alerta de prioridade máxima existe e é "sem entrega"
    expect(view.alerts[0].id).toBe('sem-entrega');
    expect(view.alerts[0].prioridade).toBe('alta');

    // Budget em risco > 0 e ações recomendadas geradas
    expect(view.kpis.budgetEmRisco).toBeGreaterThan(0);
    expect(view.actions.length).toBeGreaterThan(0);
    expect(view.actions.length).toBeLessThanOrEqual(5);
  });

  it('distribuições somam 100%', async () => {
    const sets = await mockAdapter.fetchAdSets('hoje');
    const view = buildView(sets, DEFAULT_DECISION_CONFIG, Date.now(), 0.5);
    const somaLp = view.distLp.reduce((a, d) => a + d.pct, 0);
    const somaPub = view.distPublico.reduce((a, d) => a + d.pct, 0);
    expect(somaLp).toBeCloseTo(1, 5);
    expect(somaPub).toBeCloseTo(1, 5);
  });
});
