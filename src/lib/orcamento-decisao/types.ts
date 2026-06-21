// Domínio puro da aba "Orçamento & Decisão" — sem React, 100% testável.
// Toda métrica termina numa AÇÃO: a coluna "Decisão" vale mais que o status "ACTIVE".

export type Publico = 'QUENTE' | 'FRIO';
export type AdStatus = 'ACTIVE' | 'PAUSED' | 'PENDING';

export type Decision =
  | 'sem_entrega'
  | 'pausar'
  | 'reduzir'
  | 'observar'
  | 'manter'
  | 'escalar';

export type DecisionFlag = 'trocar_criativo' | 'revisar_lp' | 'rever_publico';

export interface AdSet {
  id: string;
  campanha: string;
  conjunto: string;
  lp: string; // ex.: 'LP01'
  publico: Publico;
  status: AdStatus;
  orcamentoDia: number; // R$
  gasto: number; // R$ na janela selecionada
  leads: number;
  ctr: number; // fração (0.0158 = 1,58%)
  connectRate: number; // fração (0.42 = 42%)
  leadScore: number; // 0–100
  ultimaEntrega?: number; // epoch ms; usado p/ "sem entrega"
}

export interface DecisionConfig {
  cplMeta: number; // R$ alvo de CPL
  horasSemEntrega: number; // janela p/ marcar ACTIVE sem gasto como "sem entrega"
  ctrBenchmark: number; // fração (0.015 = 1,5%)
  connectBenchmark: number; // fração (0.40 = 40%)
  leadScoreBaixo: number; // 0–100; abaixo disto leadScore conta como "baixo" (flag rever_publico)
  pesos: { cpl: number; ctr: number; connect: number; leadScore: number }; // soma 1
}
