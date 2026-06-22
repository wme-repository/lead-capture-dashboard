import type { DecisionConfig } from './types';

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export interface ScoreInput {
  cpl: number | null; // R$ (null = sem leads); CPL menor pontua mais
  ctr: number; // fração
  connectRate: number; // fração
  leadScore: number; // 0–100
}

// Score 0–100, maior = melhor. Default: 0.4·cpl + 0.2·ctr + 0.2·connect + 0.2·leadScore.
export function computeScore(input: ScoreInput, config: DecisionConfig): number {
  const { cplMeta, ctrBenchmark, connectBenchmark, pesos } = config;
  const cplSub = input.cpl != null && input.cpl > 0 ? clamp01(cplMeta / input.cpl) : 0;
  const ctrSub = clamp01(input.ctr / ctrBenchmark);
  const connectSub = clamp01(input.connectRate / connectBenchmark);
  const leadSub = clamp01(input.leadScore / 100);
  const raw =
    pesos.cpl * cplSub +
    pesos.ctr * ctrSub +
    pesos.connect * connectSub +
    pesos.leadScore * leadSub;
  return Math.round(100 * raw);
}

export type ScoreBand = 'escalar' | 'manter' | 'reduzir' | 'pausar';

// Faixa do score → estado (sinal secundário p/ o anel colorido da UI).
export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return 'escalar';
  if (score >= 60) return 'manter';
  if (score >= 40) return 'reduzir';
  return 'pausar';
}
