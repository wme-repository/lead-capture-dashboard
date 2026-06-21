// Métricas puras. Sem divisão por zero: CPL/projeção sem leads → null.

export function computeCpl(gasto: number, leads: number): number | null {
  return leads > 0 ? gasto / leads : null;
}

export function computePacing(gasto: number, orcamentoDia: number): number {
  return orcamentoDia > 0 ? gasto / orcamentoDia : 0;
}

export type PacingStatus = 'abaixo' | 'ok' | 'acima';

// Compara o pacing (gasto/orçamento) com a fração do dia já decorrida.
// Ex.: 30% gasto às 18h (75% do dia) → muito abaixo do ideal.
export function pacingStatus(pacing: number, fracaoDiaDecorrida: number): PacingStatus {
  if (fracaoDiaDecorrida <= 0) return pacing > 0 ? 'acima' : 'ok';
  const ratio = pacing / fracaoDiaDecorrida;
  if (ratio < 0.8) return 'abaixo';
  if (ratio > 1.2) return 'acima';
  return 'ok';
}

export function projectLeads(orcamentoDia: number, cpl: number | null): number | null {
  return cpl != null && cpl > 0 ? orcamentoDia / cpl : null;
}
