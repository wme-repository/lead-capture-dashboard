import { clamp01, computeScore, scoreBand } from './score';
import { DEFAULT_DECISION_CONFIG } from './config';

describe('clamp01', () => {
  it('limita a 0..1 e trata NaN como 0', () => {
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(NaN)).toBe(0);
  });
});

describe('computeScore', () => {
  // Conjunto bom: CPL 4,37 · CTR 1,58% · connect 42% · leadScore 40 → banda 🟢 escalar.
  it('métricas boas → banda verde (escalar)', () => {
    const score = computeScore(
      { cpl: 4.37, ctr: 0.0158, connectRate: 0.42, leadScore: 40 },
      DEFAULT_DECISION_CONFIG,
    );
    expect(score).toBe(88);
    expect(scoreBand(score)).toBe('escalar');
  });

  // Conjunto ruim: CPL 12,33 · CTR 0,72% · connect 19% · leadScore 13 → banda 🔴 pausar.
  // CPL alto pesa só quando a meta é mais agressiva — aqui cplMeta=5 (exemplo do prompt).
  it('métricas ruins → banda vermelha (pausar)', () => {
    const score = computeScore(
      { cpl: 12.33, ctr: 0.0072, connectRate: 0.19, leadScore: 13 },
      { ...DEFAULT_DECISION_CONFIG, cplMeta: 5 },
    );
    expect(score).toBeLessThan(40);
    expect(scoreBand(score)).toBe('pausar');
  });

  it('sem leads (cpl null) zera a sub-nota de CPL', () => {
    const score = computeScore(
      { cpl: null, ctr: 0.02, connectRate: 0.5, leadScore: 100 },
      DEFAULT_DECISION_CONFIG,
    );
    // 0.4·0 + 0.2·1 + 0.2·1 + 0.2·1 = 0.6 → 60
    expect(score).toBe(60);
  });
});

describe('scoreBand', () => {
  it('faixas 80/60/40', () => {
    expect(scoreBand(85)).toBe('escalar');
    expect(scoreBand(70)).toBe('manter');
    expect(scoreBand(50)).toBe('reduzir');
    expect(scoreBand(20)).toBe('pausar');
  });
});
