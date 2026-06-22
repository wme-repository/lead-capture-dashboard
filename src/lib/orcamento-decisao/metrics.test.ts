import { computeCpl, computePacing, pacingStatus, projectLeads } from './metrics';

describe('computeCpl', () => {
  it('CPL = gasto / leads', () => {
    expect(computeCpl(1842, 312)).toBeCloseTo(5.9, 2); // ≈ 5,90
  });
  it('leads 0 → null (sem divisão por zero)', () => {
    expect(computeCpl(100, 0)).toBeNull();
  });
});

describe('computePacing', () => {
  it('pacing = gasto / orçamento', () => {
    expect(computePacing(1842, 6185)).toBeCloseTo(0.298, 3); // ≈ 29,8%
  });
  it('orçamento 0 → 0', () => {
    expect(computePacing(100, 0)).toBe(0);
  });
});

describe('pacingStatus', () => {
  it('30% gasto com 75% do dia decorrido → abaixo', () => {
    expect(pacingStatus(0.3, 0.75)).toBe('abaixo');
  });
  it('pacing ~ fração do dia → ok', () => {
    expect(pacingStatus(0.5, 0.5)).toBe('ok');
  });
  it('gasto muito acima do esperado → acima', () => {
    expect(pacingStatus(0.9, 0.5)).toBe('acima');
  });
});

describe('projectLeads', () => {
  it('orçamento / cpl', () => {
    expect(projectLeads(6000, 5)).toBe(1200);
  });
  it('cpl null → null', () => {
    expect(projectLeads(6000, null)).toBeNull();
  });
  it('cpl 0 → null', () => {
    expect(projectLeads(6000, 0)).toBeNull();
  });
});
