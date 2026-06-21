import { prisma } from '@/lib/prisma';
import { getAdMetricsByLp, getCampaignList, type LpAdMetrics, type MetaCampaign } from '@/lib/integrations/meta';

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
  dataCurta: string;
  horaCurta: string;
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
    dataCurta: `${String(n.getUTCDate()).padStart(2, '0')}/${String(n.getUTCMonth() + 1).padStart(2, '0')}`,
    horaCurta: `${n.getUTCHours()}h`,
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
  const [s, sources, ad, campaigns, ultimosLeads] = await Promise.all([
    getScheduledSnapshot(),
    prisma.source.findMany({ select: { slug: true, sheetsId: true } }),
    getAdMetricsByLp().catch((): Record<string, LpAdMetrics> => ({})),
    getCampaignList().catch((): MetaCampaign[] => []),
    prisma.lead.findMany({
      where: { schemaType: 'standard' },
      orderBy: { receivedAt: 'desc' },
      take: 5,
      select: { name: true, email: true, lp: true, receivedAt: true },
    }),
  ]);

  // Cruza o score/faixa (questionário) com os últimos leads de captação por email
  const emails = ultimosLeads.map((l) => (l.email ?? '').toLowerCase()).filter(Boolean);
  const quizzes = emails.length
    ? await prisma.lead.findMany({
        where: { schemaType: 'questionnaire', email: { in: emails, mode: 'insensitive' } },
        select: { email: true, score: true, grade: true },
      })
    : [];
  const scoreByEmail = new Map(quizzes.map((q) => [(q.email ?? '').toLowerCase(), q]));

  const hora = (d: Date) =>
    new Date(d).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    });
  const ultimosLinhas = ultimosLeads.length
    ? ultimosLeads.map((l, i) => {
        const q = scoreByEmail.get((l.email ?? '').toLowerCase());
        const scorePart = q
          ? ` · score ${q.score ?? '?'} (faixa ${q.grade ?? '?'})`
          : ' · questionário ainda não respondido';
        return `- ${i === 0 ? '(MAIS RECENTE) ' : ''}${l.name ?? '(sem nome)'} · ${l.lp ?? 'Sem LP'} · ${l.email ?? ''} · ${hora(l.receivedAt)}${scorePart}`;
      })
    : ['- (nenhum lead capturado ainda)'];

  const sheetUrl = (slug: string) => {
    const id = sources.find((x) => x.slug === slug)?.sheetsId;
    return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : '(não configurada)';
  };

  const hasAd = Object.keys(ad).length > 0;
  const totalSpend = Object.values(ad).reduce((acc, m) => acc + m.spend, 0);
  const budgetTotal = Number(process.env.REPORT_BUDGET_TOTAL ?? 0) || null;
  const leadsByLp = (lp: string) => s.lp.find((x) => x.nome === lp)?.count ?? 0;

  const adLines = hasAd
    ? Object.entries(ad).map(([lp, m]) => {
        const leads = leadsByLp(lp);
        const cpl = leads > 0 ? `R$ ${(m.spend / leads).toFixed(2)}` : 'n/d';
        const connect = m.linkClicks > 0 ? `${((m.lpViews / m.linkClicks) * 100).toFixed(1)}%` : 'n/d';
        return `- ${lp}: investido ${money(m.spend)}, CPL ${cpl}, CTR ${m.ctr.toFixed(2)}%, Connect Rate ${connect}`;
      })
    : ['- Campanhas ainda não geraram dados de gasto (n/d).'];

  const orcamento = budgetTotal
    ? `Orçamento total R$ ${budgetTotal.toLocaleString('pt-BR')} · Gasto ${
        hasAd ? money(totalSpend) + ` (${((totalSpend / budgetTotal) * 100).toFixed(1)}%)` : 'n/d'
      } · Falta ${hasAd ? money(budgetTotal - totalSpend) : 'n/d'}`
    : 'Orçamento não configurado.';

  return [
    `DADOS ATUAIS DA CAPTAÇÃO (Projeto TRT) — ${s.data} ${s.hora}`,
    ``,
    `CONTEXTO DO LANÇAMENTO:`,
    `- Projeto TRT: captação para o lançamento (aulas ao vivo de 6 a 9 de julho de 2026).`,
    `- 2 landing pages (URLs exatas): LP01 = https://trt.oesquadraodeelite.com.br | LP02 = https://lp.oesquadraodeelite.com.br/projetotrt`,
    `- Fluxo do lead: preenche a LP (nome/email/telefone) e depois responde o questionário (11 perguntas) que gera o LeadScore e a faixa (A, B, C ou D). Qualificados = faixa A+B.`,
    `- Campanhas Meta rodam de 21/06 a 06/07/2026. Orçamento: R$ 6.000/dia, teto total de R$ 250.000. Meta de captação: 30.000 leads (atual: ${s.capt.total}, ${pct(s.capt.total, Number(process.env.LEADS_GOAL ?? 30000))}% da meta).`,
    `- Destinos de cada lead: Google Sheets, CRM DataCrazy (dispara WhatsApp) e banco Supabase.`,
    ``,
    `Captação (LEAD/UTM):`,
    `- Total de leads: ${s.capt.total}`,
    `- Hoje: ${s.capt.hoje} | Ontem: ${s.capt.ontem} | Nesta janela: ${s.capt.janela}`,
    `- Distribuição por LP: ${s.lp.map((x) => `${x.nome}=${x.count} (${x.pct}%)`).join(', ')}`,
    ``,
    `Últimos leads de captação (do mais recente para o mais antigo):`,
    ...ultimosLinhas,
    ``,
    `Questionário:`,
    `- Respostas: ${s.quest.respostas} (taxa de resposta ${s.quest.respPct}%)`,
    `- Qualificados A+B: ${s.quest.qualificados} (${s.quest.qualPct}% dos respondentes)`,
    `- Score médio: ${s.quest.scoreMedio}`,
    `- Faixas: A=${s.faixas.A}, B=${s.faixas.B}, C=${s.faixas.C}, D=${s.faixas.D}`,
    ``,
    `Métricas de anúncio (Meta Ads):`,
    ...adLines,
    `- ${orcamento}`,
    ``,
    `Campanhas Meta ([PROJETOTRT2]) — ${campaigns.length} no total${
      campaigns.length
        ? ` (${campaigns.filter((c) => c.lp === 'LP01').length} LP01 + ${campaigns.filter((c) => c.lp === 'LP02').length} LP02)`
        : ''
    }:`,
    ...(campaigns.length
      ? campaigns.map((c) => `- [${c.status}] ${c.name}`)
      : ['- (nenhuma campanha encontrada ainda)']),
    `IMPORTANTE: status "ACTIVE" no Meta NÃO significa que já estão entregando. As campanhas estão PROGRAMADAS para começar a rodar a partir das 00:00 de 21/06/2026. Enquanto não houver gasto/impressões (investido = n/d), elas ainda não começaram de fato — não diga que estão entregando só pelo status.`,
    ``,
    `RECURSOS / FERRAMENTAS DISPONÍVEIS (quando pedirem para "listar planilhas, CRM e workflows"):`,
    `- Planilhas Google Sheets: Captação → ${sheetUrl('lead')} | Questionário/Leadscore → ${sheetUrl('quest')}`,
    `- CRM: DataCrazy (api.datacrazy.io) — pipeline "CAPTAÇÃO - PROJETO TRT 07/2026" (estágios: Inscrito, bloquear, Alunos Compraram) e automação "Captação - Projeto TRT : 06/2026 v.3". Cada lead de captação entra no estágio Inscrito e dispara o fluxo de WhatsApp (boas-vindas + link do grupo).`,
    `- Banco de dados: Supabase (PostgreSQL) — tabelas Lead, SyncLog, Source + registro de dedup emails_captados_trt_julho.`,
    `- Dashboard principal: leads.esqtools.com (este sistema, que recebe os webhooks e gera os relatórios).`,
    `- Workflows no n8n (backup/standby, hoje inativos): 1) Captação LP01, 2) Captação LP02, 3) Questionário. Detalhes na seção SISTEMA DE BACKUP abaixo.`,
    ``,
    `SISTEMA DE BACKUP (standby no n8n):`,
    `- Existem 3 workflows de backup no n8n (n8n-hz.esqtools.com), hoje INATIVOS. Servem para acionar manualmente caso o app principal (a dashboard) caia.`,
    `- São: Captação LP01, Captação LP02 e Questionário. Webhooks: /webhook/standby-captacao-lp01, /webhook/standby-captacao-lp02, /webhook/standby-questionario.`,
    `- O standby grava em TODOS os destinos, igual ao app: Google Sheets, CRM DataCrazy e a tabela Lead do Supabase (status 'synced'). Assim, quando o app voltar, a dashboard já mostra os leads capturados durante o apagão.`,
    `- Tem deduplicação por email (só captação), compartilhada com o app via a tabela emails_captados_trt_julho no Supabase — app e standby não duplicam leads entre si.`,
    `- A escrita nas planilhas é atômica (append direto na API do Google), à prova de concorrência.`,
    `- Para acionar em emergência: ativar os 3 workflows no n8n e apontar as LPs/quiz para as URLs de webhook acima.`,
  ].join('\n');
}

const LP_EMOJI: Record<string, string> = { LP01: '🔵', LP02: '🟡', 'Sem LP': '⚪' };

function money(v: number | null): string {
  return v == null
    ? 'n/d'
    : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function buildScheduledReport(): Promise<string> {
  const [s, ad] = await Promise.all([
    getScheduledSnapshot(),
    getAdMetricsByLp().catch((): Record<string, LpAdMetrics> => ({})),
  ]);

  const sep = '━━━━━━━━━━━━━━';
  const hasAd = Object.keys(ad).length > 0;
  const totalSpend = Object.values(ad).reduce((acc, m) => acc + m.spend, 0);
  const cplGeral = hasAd && s.capt.total > 0 ? totalSpend / s.capt.total : null;

  // Real LPs (exclude "Sem LP"), with CPL, sorted: winner first
  const realLps = s.lp.filter((x) => x.nome !== 'Sem LP');
  const lpWithCpl = realLps.map((x) => {
    const spend = ad[x.nome]?.spend ?? null;
    const cpl = spend != null && x.count > 0 ? spend / x.count : null;
    return { ...x, cpl };
  });
  // Winner: lowest CPL if we have spend, else most leads
  let winner: string | null = null;
  if (hasAd) {
    const withCpl = lpWithCpl.filter((x) => x.cpl != null);
    if (withCpl.length) winner = withCpl.sort((a, b) => (a.cpl! - b.cpl!))[0].nome;
  } else if (lpWithCpl.length) {
    winner = [...lpWithCpl].sort((a, b) => b.count - a.count)[0].nome;
  }
  lpWithCpl.sort((a, b) => b.count - a.count);

  const lpLines = lpWithCpl
    .map((x) => {
      const trophy = x.nome === winner ? ' 🏆' : '';
      return `${LP_EMOJI[x.nome] ?? '⚫'} ${x.nome}: ${x.count} · ${money(x.cpl)}${trophy}`;
    })
    .join('\n');

  const semLp = s.lp.find((x) => x.nome === 'Sem LP');
  const semLpLine = semLp ? `⚪ Sem LP: ${semLp.count} (sem rastreio)` : '';
  const semLpWarn =
    s.semLpPct >= 30
      ? `⚠️ ${s.semLpPct}% sem LP — corrigir UTM antes de comparar páginas`
      : '';

  const q = s.quest;
  const custoAB = hasAd && q.qualificados > 0 ? totalSpend / q.qualificados : null;

  // Budget + goal tracking
  const leadsGoal = Number(process.env.LEADS_GOAL ?? 30000) || 30000;
  const budgetTotal = Number(process.env.REPORT_BUDGET_TOTAL ?? 0) || null;
  const pctGasto = budgetTotal && hasAd ? (totalSpend / budgetTotal) * 100 : null;
  const falta = budgetTotal && hasAd ? budgetTotal - totalSpend : null;
  const pctFalta = pctGasto != null ? Math.max(0, 100 - pctGasto) : null;
  const lpSpendLine = realLps
    .map((x) => `${LP_EMOJI[x.nome] ?? '⚫'} ${x.nome}: ${money(ad[x.nome]?.spend ?? null)}`)
    .join(' · ');
  const orcamentoLinha = budgetTotal
    ? `Total: ${money(budgetTotal)}\nGasto: ${money(hasAd ? totalSpend : null)}${
        pctGasto != null ? ` (${pctGasto.toFixed(1)}%)` : ''
      } · Falta: ${money(falta)}${pctFalta != null ? ` (${pctFalta.toFixed(1)}%)` : ''}`
    : `Gasto: ${money(hasAd ? totalSpend : null)}`;

  // Rule-based action
  let acao: string;
  if (s.semLpPct >= 30) {
    acao = 'validar tracking de LP e seguir até 100 leads.';
  } else if (s.capt.total < 100) {
    acao = 'seguir até 100 leads para comparar score × custo por página.';
  } else {
    acao = 'comparar CPL A+B por LP e realocar verba para a vencedora.';
  }

  return [
    `📊 Captação — Projeto TRT`,
    ``,
    `🕒 ${s.dataCurta} · ${s.horaCurta} · bloco ${s.blocoLabel}`,
    ``,
    sep,
    ``,
    `🎯 Leads · LEAD/UTM`,
    ``,
    `👥 Total: ${s.capt.total} · 🆕 no bloco: +${s.capt.janela}`,
    ``,
    `🎯 Meta: ${s.capt.total} / ${leadsGoal.toLocaleString('pt-BR')} (${pct(s.capt.total, leadsGoal)}%)`,
    ``,
    `💰 CPL geral: ${money(cplGeral)}`,
    ``,
    sep,
    ``,
    `💸 Orçamento`,
    ``,
    orcamentoLinha,
    ...(lpSpendLine ? ['', lpSpendLine] : []),
    ``,
    sep,
    ``,
    `🌐 Por LP (lead · CPL)`,
    ``,
    lpLines,
    semLpLine,
    ...(semLpWarn ? ['', semLpWarn] : []),
    ``,
    sep,
    ``,
    `🔥 Faixas de qualidade`,
    ``,
    `🟢 A: ${s.faixas.A} · 🔵 B: ${s.faixas.B} · 🟡 C: ${s.faixas.C} · 🔴 D: ${s.faixas.D}`,
    ``,
    `🏆 A+B: ${q.qualificados} · 💵 custo A+B: ${money(custoAB)}`,
    ``,
    sep,
    ``,
    `✅ Ação: ${acao}`,
  ].join('\n');
}
