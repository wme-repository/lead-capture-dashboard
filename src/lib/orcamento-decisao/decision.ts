import type { AdSet, Decision, DecisionConfig, DecisionFlag } from './types';
import { computeCpl } from './metrics';

const HOUR_MS = 3_600_000;

export interface DecisionResult {
  decision: Decision;
  flags: DecisionFlag[];
}

// Núcleo da aba. Pura: recebe `now` (não chama Date.now() dentro).
// Avalia na ORDEM — a primeira condição que casar define a decisão.
export function classifyDecision(
  adSet: AdSet,
  config: DecisionConfig,
  now: number,
): DecisionResult {
  const { cplMeta, horasSemEntrega, ctrBenchmark, connectBenchmark, leadScoreBaixo } = config;
  const cpl = computeCpl(adSet.gasto, adSet.leads);

  const decision = decide();

  function decide(): Decision {
    // 1. ACTIVE gastando R$ 0 há mais de N horas → não está entregando (o caso a blindar).
    if (
      adSet.status === 'ACTIVE' &&
      adSet.gasto === 0 &&
      now - (adSet.ultimaEntrega ?? 0) > horasSemEntrega * HOUR_MS
    ) {
      return 'sem_entrega';
    }
    // 2. Já gastou ≥2× o CPL meta e nenhum lead → pausar.
    if (adSet.gasto >= 2 * cplMeta && adSet.leads === 0) return 'pausar';
    // 3. Já gastou ≥1× o CPL meta e nenhum lead → observar.
    if (adSet.gasto >= cplMeta && adSet.leads === 0) return 'observar';
    // 4. CPL > 2× meta → pausar.
    if (cpl != null && cpl > 2.0 * cplMeta) return 'pausar';
    // 5. CPL > 1,3× meta → reduzir.
    if (cpl != null && cpl > 1.3 * cplMeta) return 'reduzir';
    // 6. CPL ≤ 0,8× meta e connect bom → escalar.
    if (cpl != null && cpl <= 0.8 * cplMeta && adSet.connectRate >= connectBenchmark) {
      return 'escalar';
    }
    // 7. CPL ≤ meta → manter.
    if (cpl != null && cpl <= 1.0 * cplMeta) return 'manter';
    // 8. fallback.
    return 'observar';
  }

  // Flags são independentes da decisão (podem coexistir).
  const flags: DecisionFlag[] = [];
  if (adSet.ctr < ctrBenchmark && cpl != null && cpl > cplMeta) flags.push('trocar_criativo');
  if (adSet.connectRate < connectBenchmark && adSet.ctr >= ctrBenchmark) flags.push('revisar_lp');
  if (adSet.leadScore < leadScoreBaixo && cpl != null && cpl <= cplMeta) flags.push('rever_publico');

  return { decision, flags };
}
