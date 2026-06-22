import { classifyDecision } from './decision';
import { DEFAULT_DECISION_CONFIG } from './config';
import type { AdSet } from './types';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

// Base saudável; cada teste sobrescreve só o que importa.
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
    leads: 6, // cpl 5
    ctr: 0.016,
    connectRate: 0.42,
    leadScore: 60,
    ultimaEntrega: NOW - 5 * 60_000, // 5 min atrás
    ...over,
  };
}

describe('classifyDecision — ordem das regras', () => {
  it('1) ACTIVE, gasto 0, última entrega há 5h → sem_entrega', () => {
    const r = classifyDecision(
      ad({ status: 'ACTIVE', gasto: 0, leads: 0, ultimaEntrega: NOW - 5 * HOUR }),
      DEFAULT_DECISION_CONFIG,
      NOW,
    );
    expect(r.decision).toBe('sem_entrega');
  });

  it('2) gastou ≥2× meta sem lead → pausar', () => {
    const r = classifyDecision(
      ad({ status: 'PAUSED', gasto: 12, leads: 0 }), // 2×6
      DEFAULT_DECISION_CONFIG,
      NOW,
    );
    expect(r.decision).toBe('pausar');
  });

  it('3) gastou ≥1× meta sem lead → observar', () => {
    const r = classifyDecision(
      ad({ status: 'PAUSED', gasto: 6, leads: 0 }),
      DEFAULT_DECISION_CONFIG,
      NOW,
    );
    expect(r.decision).toBe('observar');
  });

  it('4) CPL 12,33 (meta 5) → pausar', () => {
    const r = classifyDecision(
      ad({ status: 'PAUSED', gasto: 12.33, leads: 1 }),
      { ...DEFAULT_DECISION_CONFIG, cplMeta: 5 },
      NOW,
    );
    expect(r.decision).toBe('pausar');
  });

  it('5) CPL 1,3×–2× meta → reduzir', () => {
    const r = classifyDecision(
      ad({ status: 'PAUSED', gasto: 90, leads: 10 }), // cpl 9, meta 6 → 1,5×
      DEFAULT_DECISION_CONFIG,
      NOW,
    );
    expect(r.decision).toBe('reduzir');
  });

  it('6) CPL 4,37 ≤ 0,8× meta + connect 0,42 → escalar', () => {
    const r = classifyDecision(
      ad({ gasto: 43.7, leads: 10, connectRate: 0.42 }), // cpl 4,37, meta 6
      DEFAULT_DECISION_CONFIG,
      NOW,
    );
    expect(r.decision).toBe('escalar');
  });

  it('6b) CPL baixo mas connect fraco → não escala (manter)', () => {
    const r = classifyDecision(
      ad({ gasto: 30, leads: 10, connectRate: 0.3 }), // cpl 3, connect < bench
      DEFAULT_DECISION_CONFIG,
      NOW,
    );
    expect(r.decision).toBe('manter');
  });

  it('7) CPL ≤ meta → manter', () => {
    const r = classifyDecision(
      ad({ gasto: 30, leads: 6, connectRate: 0.3 }), // cpl 5 ≤ 6
      DEFAULT_DECISION_CONFIG,
      NOW,
    );
    expect(r.decision).toBe('manter');
  });
});

describe('classifyDecision — flags independentes', () => {
  it('CTR baixo + CPL alto → trocar_criativo', () => {
    const r = classifyDecision(
      ad({ gasto: 100, leads: 10, ctr: 0.005 }), // cpl 10 > 6, ctr < 1,5%
      DEFAULT_DECISION_CONFIG,
      NOW,
    );
    expect(r.flags).toContain('trocar_criativo');
  });

  it('connect baixo + CTR bom → revisar_lp', () => {
    const r = classifyDecision(
      ad({ ctr: 0.02, connectRate: 0.2 }),
      DEFAULT_DECISION_CONFIG,
      NOW,
    );
    expect(r.flags).toContain('revisar_lp');
  });

  it('leadScore baixo + CPL bom → rever_publico', () => {
    const r = classifyDecision(
      ad({ gasto: 30, leads: 6, leadScore: 20 }), // cpl 5 ≤ 6, score < 50
      DEFAULT_DECISION_CONFIG,
      NOW,
    );
    expect(r.flags).toContain('rever_publico');
  });
});
