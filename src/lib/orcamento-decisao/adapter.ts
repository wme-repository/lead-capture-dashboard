import type { AdSet } from './types';

// Janelas de tempo da aba (Controls). 'custom' = intervalo escolhido pelo usuário.
export type Janela = 'hoje' | 'ontem' | '3d' | '7d' | '14d' | 'custom';

// Contrato da fonte de dados. A integração real com a Meta API entra atrás desta
// interface (adapter real) sem tocar no domínio nem na UI.
export interface MetaAdsAdapter {
  fetchAdSets(janela: Janela): Promise<AdSet[]>;
}
