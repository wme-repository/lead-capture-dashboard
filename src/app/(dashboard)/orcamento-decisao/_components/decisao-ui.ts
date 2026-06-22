import type { Decision } from "@/lib/orcamento-decisao/types";
import type { ScoreBand } from "@/lib/orcamento-decisao/score";
import type { Prioridade } from "@/lib/orcamento-decisao/view";

// Formatação pt-BR. CPL/valor nulo = "—" (sem dados), nunca 0 disfarçado.
export function money(v: number | null | undefined): string {
  return v == null
    ? "—"
    : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function int(v: number): string {
  return v.toLocaleString("pt-BR");
}
export function pct(v: number, casas = 0): string {
  return `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

// COR POR DECISÃO (não por status). verde=escalar · azul=saudável · amarelo=observar
// · laranja=reduzir · vermelho=pausar/sem entrega · cinza=sem dados.
export const DECISAO: Record<
  Decision,
  { label: string; btn: string; chip: string; dot: string }
> = {
  sem_entrega: {
    label: "Sem entrega",
    btn: "bg-red-600 hover:bg-red-700 text-white",
    chip: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  pausar: {
    label: "Pausar",
    btn: "bg-red-600 hover:bg-red-700 text-white",
    chip: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  reduzir: {
    label: "Reduzir",
    btn: "bg-orange-500 hover:bg-orange-600 text-white",
    chip: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  observar: {
    label: "Observar",
    btn: "bg-amber-400 hover:bg-amber-500 text-amber-950",
    chip: "bg-amber-100 text-amber-800",
    dot: "bg-amber-400",
  },
  manter: {
    label: "Manter",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
    chip: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  escalar: {
    label: "Escalar",
    btn: "bg-green-600 hover:bg-green-700 text-white",
    chip: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
};

// Cor do anel de score por faixa.
export const BAND_STROKE: Record<ScoreBand, string> = {
  escalar: "#16a34a",
  manter: "#2563eb",
  reduzir: "#f97316",
  pausar: "#dc2626",
};

// Coluna "Prioridade" derivada da urgência (0 = mais urgente).
export function prioridadeTier(urgencia: number): { label: string; cls: string } {
  switch (urgencia) {
    case 0:
      return { label: "Crítico", cls: "bg-red-100 text-red-700" };
    case 1:
      return { label: "Crítico", cls: "bg-red-100 text-red-700" };
    case 2:
      return { label: "Alta", cls: "bg-red-50 text-red-600" };
    case 3:
      return { label: "Média", cls: "bg-orange-50 text-orange-600" };
    case 4:
      return { label: "Oportun.", cls: "bg-green-50 text-green-700" };
    case 5:
      return { label: "OK", cls: "bg-blue-50 text-blue-600" };
    default:
      return { label: "Aguardando", cls: "bg-gray-100 text-gray-500" };
  }
}

export const PRIORIDADE_BADGE: Record<Prioridade, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-amber-100 text-amber-800",
  baixa: "bg-gray-100 text-gray-600",
};

export const LP_BADGE: Record<string, string> = {
  LP01: "bg-blue-50 text-blue-700",
  LP02: "bg-amber-50 text-amber-700",
};
export const PUBLICO_BADGE: Record<string, string> = {
  QUENTE: "bg-orange-50 text-orange-700",
  FRIO: "bg-sky-50 text-sky-700",
};
