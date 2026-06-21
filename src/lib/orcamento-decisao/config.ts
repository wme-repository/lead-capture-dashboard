import type { DecisionConfig } from './types';

// Fonte única de metas/limiares — nada de número mágico espalhado pela UI.
// cplMeta=6,00: realista p/ o lançamento (CPL real ~5,90; teto 250k/30k ≈ 8,33).
export const DEFAULT_DECISION_CONFIG: DecisionConfig = {
  cplMeta: 6.0,
  horasSemEntrega: 3,
  ctrBenchmark: 0.015,
  connectBenchmark: 0.4,
  leadScoreBaixo: 50,
  pesos: { cpl: 0.4, ctr: 0.2, connect: 0.2, leadScore: 0.2 },
};
