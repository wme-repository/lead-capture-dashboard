import { prisma } from '@/lib/prisma';

// Brazil (São Paulo) is UTC-3, no DST since 2019.
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

function spDayBounds(daysAgo = 0): { start: Date; end: Date; label: string } {
  const nowSp = new Date(Date.now() - SP_OFFSET_MS);
  const y = nowSp.getUTCFullYear();
  const m = nowSp.getUTCMonth();
  const d = nowSp.getUTCDate() - daysAgo;
  // Midnight SP expressed as a UTC instant
  const start = new Date(Date.UTC(y, m, d) + SP_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const label = new Date(Date.UTC(y, m, d)).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
  return { start, end, label };
}

export interface CaptacaoSnapshot {
  geradoEm: string;
  capturas: {
    total: number;
    hoje: number;
    ontem: number;
    porLp: Record<string, number>;
  };
  questionario: {
    total: number;
    hoje: number;
    qualificados: number; // grade A or B
    scoreMedio: number;
    porFaixa: Record<string, number>;
  };
}

export async function getCaptacaoSnapshot(): Promise<CaptacaoSnapshot> {
  const today = spDayBounds(0);
  const yesterday = spDayBounds(1);

  const [
    captTotal,
    captToday,
    captYesterday,
    lpGroups,
    questTotal,
    questToday,
    qualified,
    gradeGroups,
    scoreAgg,
  ] = await Promise.all([
    prisma.lead.count({ where: { schemaType: 'standard' } }),
    prisma.lead.count({ where: { schemaType: 'standard', receivedAt: { gte: today.start, lt: today.end } } }),
    prisma.lead.count({ where: { schemaType: 'standard', receivedAt: { gte: yesterday.start, lt: yesterday.end } } }),
    prisma.lead.groupBy({ by: ['lp'], where: { schemaType: 'standard' }, _count: true }),
    prisma.lead.count({ where: { schemaType: 'questionnaire' } }),
    prisma.lead.count({ where: { schemaType: 'questionnaire', receivedAt: { gte: today.start, lt: today.end } } }),
    prisma.lead.count({ where: { schemaType: 'questionnaire', grade: { in: ['A', 'B'] } } }),
    prisma.lead.groupBy({ by: ['grade'], where: { schemaType: 'questionnaire' }, _count: true }),
    prisma.lead.aggregate({ where: { schemaType: 'questionnaire' }, _avg: { score: true } }),
  ]);

  const porLp: Record<string, number> = {};
  for (const g of lpGroups) porLp[g.lp ?? 'Sem LP'] = g._count;

  const porFaixa: Record<string, number> = {};
  for (const g of gradeGroups) porFaixa[g.grade ?? 'Sem faixa'] = g._count;

  return {
    geradoEm: new Date(Date.now() - SP_OFFSET_MS).toLocaleString('pt-BR'),
    capturas: { total: captTotal, hoje: captToday, ontem: captYesterday, porLp },
    questionario: {
      total: questTotal,
      hoje: questToday,
      qualificados: qualified,
      scoreMedio: Math.round(scoreAgg._avg.score ?? 0),
      porFaixa,
    },
  };
}

export function formatDailyReport(s: CaptacaoSnapshot): string {
  const lpLines = Object.entries(s.capturas.porLp)
    .map(([lp, n]) => `   • ${lp}: ${n}`)
    .join('\n') || '   • (sem dados)';
  const faixaLines = Object.entries(s.questionario.porFaixa)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([f, n]) => `   • Faixa ${f}: ${n}`)
    .join('\n') || '   • (sem dados)';

  const delta = s.capturas.hoje - s.capturas.ontem;
  const trend = delta > 0 ? `📈 +${delta}` : delta < 0 ? `📉 ${delta}` : '➡️ igual';

  return [
    `📊 *Relatório de Captação — Projeto TRT*`,
    `_${s.geradoEm}_`,
    ``,
    `*Captação (LEAD/UTM)*`,
    `   • Total: ${s.capturas.total}`,
    `   • Hoje: ${s.capturas.hoje} (ontem: ${s.capturas.ontem}) ${trend}`,
    `   *Por LP:*`,
    lpLines,
    ``,
    `*Questionário*`,
    `   • Total respostas: ${s.questionario.total}`,
    `   • Hoje: ${s.questionario.hoje}`,
    `   • Qualificados (A+B): ${s.questionario.qualificados}`,
    `   • Score médio: ${s.questionario.scoreMedio}`,
    `   *Por faixa:*`,
    faixaLines,
  ].join('\n');
}
