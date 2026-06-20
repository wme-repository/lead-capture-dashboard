import { prisma } from '@/lib/prisma';
import { askDeepSeek } from '@/lib/integrations/deepseek';

// Brazil (São Paulo) is UTC-3, no DST since 2019.
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
const SLOTS = [8, 12, 16, 20]; // scheduled report hours (SP)

function nowSp(): Date {
  return new Date(Date.now() - SP_OFFSET_MS);
}

function spInstant(y: number, m: number, d: number, h = 0): Date {
  // SP wall-clock (y,m,d,h) expressed as a real UTC instant
  return new Date(Date.UTC(y, m, d, h) + SP_OFFSET_MS);
}

function dayStart(daysAgo = 0): { start: Date; end: Date } {
  const n = nowSp();
  const start = spInstant(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() - daysAgo, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// Window since the previous scheduled slot (8/12/16/20).
function currentWindow(): { start: Date; startHour: number; endHour: number } {
  const n = nowSp();
  const h = n.getUTCHours();
  // current slot = largest slot <= h (fallback to first)
  const cur = [...SLOTS].reverse().find((s) => s <= h) ?? SLOTS[0];
  const idx = SLOTS.indexOf(cur);
  const prev = idx > 0 ? SLOTS[idx - 1] : SLOTS[SLOTS.length - 1];
  const overnight = idx === 0; // 8h report → window starts yesterday 20h
  const start = spInstant(
    n.getUTCFullYear(),
    n.getUTCMonth(),
    n.getUTCDate() - (overnight ? 1 : 0),
    prev,
  );
  return { start, startHour: prev, endHour: cur };
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export interface ScheduledSnapshot {
  data: string;
  hora: string;
  blocoLabel: string;
  capt: { total: number; janela: number; hoje: number; ontem: number };
  lp: { nome: string; count: number; pct: number }[];
  semLpPct: number;
  quest: { respostas: number; respPct: number; qualificados: number; qualPct: number; scoreMedio: number };
  faixas: { A: number; B: number; C: number; D: number };
}

export async function getScheduledSnapshot(): Promise<ScheduledSnapshot> {
  const n = nowSp();
  const today = dayStart(0);
  const yesterday = dayStart(1);
  const win = currentWindow();

  const [captTotal, captJanela, captToday, captYesterday, lpGroups, questTotal, qualified, gradeGroups, scoreAgg] =
    await Promise.all([
      prisma.lead.count({ where: { schemaType: 'standard' } }),
      prisma.lead.count({ where: { schemaType: 'standard', receivedAt: { gte: win.start } } }),
      prisma.lead.count({ where: { schemaType: 'standard', receivedAt: { gte: today.start, lt: today.end } } }),
      prisma.lead.count({ where: { schemaType: 'standard', receivedAt: { gte: yesterday.start, lt: yesterday.end } } }),
      prisma.lead.groupBy({ by: ['lp'], where: { schemaType: 'standard' }, _count: true }),
      prisma.lead.count({ where: { schemaType: 'questionnaire' } }),
      prisma.lead.count({ where: { schemaType: 'questionnaire', grade: { in: ['A', 'B'] } } }),
      prisma.lead.groupBy({ by: ['grade'], where: { schemaType: 'questionnaire' }, _count: true }),
      prisma.lead.aggregate({ where: { schemaType: 'questionnaire' }, _avg: { score: true } }),
    ]);

  const lp = lpGroups
    .map((g) => ({ nome: g.lp ?? 'Sem LP', count: g._count, pct: pct(g._count, captTotal) }))
    .sort((a, b) => b.count - a.count);
  const semLp = lp.find((x) => x.nome === 'Sem LP');

  const faixas = { A: 0, B: 0, C: 0, D: 0 };
  for (const g of gradeGroups) {
    if (g.grade && g.grade in faixas) faixas[g.grade as keyof typeof faixas] = g._count;
  }

  return {
    data: n.toLocaleDateString('pt-BR'),
    hora: `${String(n.getUTCHours()).padStart(2, '0')}:${String(n.getUTCMinutes()).padStart(2, '0')}`,
    blocoLabel: `${String(win.startHour).padStart(2, '0')}h→${String(win.endHour).padStart(2, '0')}h`,
    capt: { total: captTotal, janela: captJanela, hoje: captToday, ontem: captYesterday },
    lp,
    semLpPct: semLp?.pct ?? 0,
    quest: {
      respostas: questTotal,
      respPct: pct(questTotal, captTotal),
      qualificados: qualified,
      qualPct: pct(qualified, questTotal),
      scoreMedio: Math.round(scoreAgg._avg.score ?? 0),
    },
    faixas,
  };
}

// Plain-text data snapshot for the Q&A assistant context.
export async function getQaContext(): Promise<string> {
  const s = await getScheduledSnapshot();
  return [
    `DADOS ATUAIS DA CAPTAÇÃO (Projeto TRT) — ${s.data} ${s.hora}`,
    ``,
    `Captação (LEAD/UTM):`,
    `- Total de leads: ${s.capt.total}`,
    `- Hoje: ${s.capt.hoje} | Ontem: ${s.capt.ontem} | Nesta janela: ${s.capt.janela}`,
    `- Distribuição por LP: ${s.lp.map((x) => `${x.nome}=${x.count} (${x.pct}%)`).join(', ')}`,
    ``,
    `Questionário:`,
    `- Respostas: ${s.quest.respostas} (taxa de resposta ${s.quest.respPct}%)`,
    `- Qualificados A+B: ${s.quest.qualificados} (${s.quest.qualPct}% dos respondentes)`,
    `- Score médio: ${s.quest.scoreMedio}`,
    `- Faixas: A=${s.faixas.A}, B=${s.faixas.B}, C=${s.faixas.C}, D=${s.faixas.D}`,
  ].join('\n');
}

const LP_EMOJI: Record<string, string> = { LP01: '🔵', LP02: '🟡', 'Sem LP': '⚪' };

async function buildResumo(s: ScheduledSnapshot): Promise<string> {
  const dados = [
    `Capt total: ${s.capt.total}, hoje: ${s.capt.hoje}, ontem: ${s.capt.ontem}, nesta janela: ${s.capt.janela}`,
    `LP: ${s.lp.map((x) => `${x.nome}=${x.count}(${x.pct}%)`).join(', ')}`,
    `Questionário: ${s.quest.respostas} respostas (${s.quest.respPct}%), qualificados A+B: ${s.quest.qualificados} (${s.quest.qualPct}%), score médio ${s.quest.scoreMedio}`,
    `Faixas: A=${s.faixas.A} B=${s.faixas.B} C=${s.faixas.C} D=${s.faixas.D}`,
  ].join('\n');
  const system =
    'Você é analista de captação de tráfego. Escreva um RESUMO curto (2 a 4 linhas) sobre os dados. ' +
    'Use no máximo: 1 linha de leitura geral, 1 linha começando com "⚠️ Atenção:" se houver problema (ex: muitos sem LP, qualidade baixa), e 1 linha começando com "✅ Ação:" com a próxima ação prática. ' +
    'Tom de gestor, direto, sem inventar números além dos fornecidos.';
  try {
    return await askDeepSeek(system, dados);
  } catch {
    return '✅ Ação: acompanhar a evolução até 100 leads para validar o score por página.';
  }
}

export async function formatScheduledReport(s: ScheduledSnapshot): Promise<string> {
  const sep = '━━━━━━━━━━━━━━';
  const lpLines = s.lp
    .map((x) => `${LP_EMOJI[x.nome] ?? '⚫'} ${x.nome}: ${x.count} (${x.pct}%)`)
    .join('\n');
  const semLpWarn =
    s.semLpPct >= 30 ? `\n⚠️ ${s.semLpPct}% sem LP identificada — revisar UTM / parâmetro da página.` : '';
  const q = s.quest;
  const tot = q.respostas || 1;
  const resumo = await buildResumo(s);

  return [
    `📊 Relatório de Captação — Projeto TRT`,
    `🕒 ${s.data} · ${s.hora} · (bloco das ${s.blocoLabel})`,
    sep,
    `🎯 Captação de Leads · Fonte: LEAD/UTM`,
    `👥 Total: ${s.capt.total} · 🆕 Nesta janela: +${s.capt.janela} · 📅 Hoje: ${s.capt.hoje} · Ontem: ${s.capt.ontem}`,
    sep,
    `🌐 Distribuição por LP`,
    lpLines + semLpWarn,
    sep,
    `📝 Questionário`,
    `✅ Respostas: ${q.respostas} de ${s.capt.total} (${q.respPct}% de resposta)`,
    `🏆 Qualificados A+B: ${q.qualificados} (${q.qualPct}% dos respondentes)`,
    `⭐ Score médio: ${q.scoreMedio}`,
    sep,
    `🔥 Faixas de qualidade`,
    `🟢 A: ${s.faixas.A} (${pct(s.faixas.A, tot)}%) · 🔵 B: ${s.faixas.B} (${pct(s.faixas.B, tot)}%) · 🟡 C: ${s.faixas.C} (${pct(s.faixas.C, tot)}%) · 🔴 D: ${s.faixas.D} (${pct(s.faixas.D, tot)}%)`,
    sep,
    `📌 Resumo`,
    resumo,
  ].join('\n');
}
