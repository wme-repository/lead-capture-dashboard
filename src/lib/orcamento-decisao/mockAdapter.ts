import type { AdSet } from './types';
import type { Janela, MetaAdsAdapter } from './adapter';

const HOUR_MS = 3_600_000;

// Linha do seed: AdSet sem o carimbo de tempo (resolvido no fetch a partir de
// "horas atrás da última entrega"), para o caso "sem entrega" não envelhecer.
type SeedRow = Omit<AdSet, 'ultimaEntrega'> & { horasSemEntregaAtras: number };

// Seed "hoje" — o AGREGADO bate com os KPIs do design:
//   orçamento ativo R$ 6.185 · gasto R$ 1.842 · leads 312 · CPL R$ 5,90 ·
//   pacing 29,8% · LP01/LP02 ≈ 50/50 · QUENTE 34% / FRIO 66%.
// Cobre todas as decisões: sem_entrega (RETARGETING PIX), pausar (ADVT),
// reduzir (ENG VÍDEOS), manter e escalar (LL 1% / ENG MIX).
const SEED: SeedRow[] = [
  // ── LP01 (orçamento 3.090) ──────────────────────────────────────────────
  { id: 'a1', campanha: '01 [PROJETOTRT2] QUENTE [LP01]', conjunto: 'ADVT', lp: 'LP01', publico: 'QUENTE', status: 'ACTIVE', orcamentoDia: 600, gasto: 185, leads: 8, ctr: 0.006, connectRate: 0.18, leadScore: 25, horasSemEntregaAtras: 0.13 }, // cpl 23,1 → pausar
  { id: 'a2', campanha: '01 [PROJETOTRT2] QUENTE [LP01]', conjunto: 'RETARGETING PIX', lp: 'LP01', publico: 'QUENTE', status: 'ACTIVE', orcamentoDia: 450, gasto: 0, leads: 0, ctr: 0, connectRate: 0, leadScore: 0, horasSemEntregaAtras: 5 }, // ACTIVE, R$ 0 há 5h → sem_entrega
  { id: 'a3', campanha: '01 [PROJETOTRT2] FRIO [LP01]', conjunto: 'INTERESSES CONCURSO', lp: 'LP01', publico: 'FRIO', status: 'ACTIVE', orcamentoDia: 700, gasto: 222, leads: 38, ctr: 0.016, connectRate: 0.30, leadScore: 55, horasSemEntregaAtras: 0.15 }, // cpl 5,84 → manter
  { id: 'a4', campanha: '01 [PROJETOTRT2] FRIO [LP01]', conjunto: 'LL 1% LEAD TRT', lp: 'LP01', publico: 'FRIO', status: 'ACTIVE', orcamentoDia: 700, gasto: 176, leads: 42, ctr: 0.018, connectRate: 0.45, leadScore: 62, horasSemEntregaAtras: 0.1 }, // cpl 4,19 + connect 0,45 → escalar
  { id: 'a5', campanha: '01 [PROJETOTRT2] FRIO [LP01]', conjunto: 'LL 2% COMPRAS', lp: 'LP01', publico: 'FRIO', status: 'ACTIVE', orcamentoDia: 640, gasto: 245, leads: 41, ctr: 0.015, connectRate: 0.38, leadScore: 48, horasSemEntregaAtras: 0.2 }, // cpl 5,98 → manter
  // ── LP02 (orçamento 3.095) ──────────────────────────────────────────────
  { id: 'b1', campanha: '02 [PROJETOTRT2] QUENTE [LP02]', conjunto: 'ENG MIX', lp: 'LP02', publico: 'QUENTE', status: 'ACTIVE', orcamentoDia: 600, gasto: 131, leads: 30, ctr: 0.017, connectRate: 0.42, leadScore: 58, horasSemEntregaAtras: 0.1 }, // cpl 4,37 + connect 0,42 → escalar
  { id: 'b2', campanha: '02 [PROJETOTRT2] QUENTE [LP02]', conjunto: 'ENG VÍDEOS TRT', lp: 'LP02', publico: 'QUENTE', status: 'ACTIVE', orcamentoDia: 460, gasto: 270, leads: 30, ctr: 0.009, connectRate: 0.33, leadScore: 40, horasSemEntregaAtras: 0.12 }, // cpl 9,0 → reduzir
  { id: 'b3', campanha: '02 [PROJETOTRT2] FRIO [LP02]', conjunto: 'ADVANTAGE+ COMPRAS', lp: 'LP02', publico: 'FRIO', status: 'ACTIVE', orcamentoDia: 735, gasto: 268, leads: 45, ctr: 0.014, connectRate: 0.41, leadScore: 52, horasSemEntregaAtras: 0.1 }, // cpl 5,96 → manter
  { id: 'b4', campanha: '02 [PROJETOTRT2] FRIO [LP02]', conjunto: 'INTERESSES JURÍDICO', lp: 'LP02', publico: 'FRIO', status: 'ACTIVE', orcamentoDia: 700, gasto: 201, leads: 35, ctr: 0.016, connectRate: 0.36, leadScore: 47, horasSemEntregaAtras: 0.18 }, // cpl 5,74 → manter
  { id: 'b5', campanha: '02 [PROJETOTRT2] FRIO [LP02]', conjunto: 'LL 1% PURCHASE', lp: 'LP02', publico: 'FRIO', status: 'ACTIVE', orcamentoDia: 600, gasto: 144, leads: 43, ctr: 0.019, connectRate: 0.41, leadScore: 60, horasSemEntregaAtras: 0.1 }, // cpl 3,35 + connect 0,41 → escalar
];

// Fator por janela: o seed representa "hoje"; janelas maiores acumulam mais
// gasto/leads (CPL ~constante; orçamento/dia é diário, não escala).
const FATOR: Record<Janela, number> = {
  hoje: 1,
  ontem: 1.05,
  '3d': 2.8,
  '7d': 6.4,
  '14d': 12.1,
  custom: 1,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

async function fetchAdSets(janela: Janela): Promise<AdSet[]> {
  const f = FATOR[janela] ?? 1;
  const now = Date.now();
  return SEED.map(({ horasSemEntregaAtras, gasto, leads, ...rest }) => ({
    ...rest,
    gasto: round2(gasto * f),
    leads: Math.round(leads * f),
    ultimaEntrega: now - horasSemEntregaAtras * HOUR_MS,
  }));
}

export const mockAdapter: MetaAdsAdapter = { fetchAdSets };
