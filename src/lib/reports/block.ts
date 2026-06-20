import { prisma } from '@/lib/prisma';
import { getAdMetricsByLp, type LpAdMetrics } from '@/lib/integrations/meta';
import { askDeepSeek } from '@/lib/integrations/deepseek';

const ANALYST_PROMPT = `Você é uma IA analista de performance de tráfego pago.

Sua tarefa é gerar um relatório curto a cada bloco de 100 leads captados.
Analise os dados enviados e agrupe o resultado por landing page (LP01 e LP02).

Para cada LP informe: Quantidade de leads, Lead Score total, Lead Score médio, Investimento total, CPL, CTR, Connect Rate, Diagnóstico curto, Recomendação objetiva.

Formato EXATO da resposta:

📊 RELATÓRIO DE LEADS — BLOCO DE 100 LEADS

Total de leads analisados: [número]
Período analisado: [intervalo]
Investimento total: R$ [valor]
CPL geral: R$ [valor]
CTR geral: [percentual]%
Connect Rate geral: [percentual]%
Lead Score total geral: [número]

---

🔵 LP01

Leads: [número]
Lead Score total: [número]
Lead Score médio: [número]
Investimento: R$ [valor]
CPL: R$ [valor]
CTR: [percentual]%
Connect Rate: [percentual]%

Diagnóstico:
[análise curta, direta, de gestor de tráfego: bem, regular ou mal]

Recomendação:
[ação clara: manter, escalar, ajustar criativo, revisar página, pausar, testar headline ou redistribuir orçamento]

---

🟡 LP02

Leads: [número]
Lead Score total: [número]
Lead Score médio: [número]
Investimento: R$ [valor]
CPL: R$ [valor]
CTR: [percentual]%
Connect Rate: [percentual]%

Diagnóstico:
[análise curta]

Recomendação:
[ação clara]

---

🏆 Vencedora do bloco:

LP vencedora: [LP01 ou LP02]

Motivo:
[uma frase considerando CPL, CTR, Connect Rate e Lead Score]

Ação sugerida:
[ação mais importante para o próximo bloco de 100 leads]

Regras:
- Seja direto, sem texto longo, linguagem de gestor de tráfego.
- Use APENAS os números fornecidos nos DADOS. Nunca invente valores. Se um valor vier como "n/d", escreva "n/d".
- Se o CPL estiver baixo mas o Lead Score também baixo, não considere vencedora automaticamente.
- CTR bom mas Connect Rate baixo → possível problema na página/carregamento/promessa/público.
- Connect Rate bom mas CTR baixo → possível problema no criativo/copy do anúncio.
- LP com menos leads mas Lead Score médio maior → destaque isso.
- Sempre compare LP01 vs LP02 e finalize com decisão objetiva.`;

interface LpLeadData {
  leads: number;
  scoreTotal: number;
  scoreCount: number;
}

// Cross questionnaire score → captação LP by email.
async function getLeadDataByLp(): Promise<Record<string, LpLeadData>> {
  const [capt, quest] = await Promise.all([
    prisma.lead.findMany({ where: { schemaType: 'standard' }, select: { email: true, lp: true } }),
    prisma.lead.findMany({ where: { schemaType: 'questionnaire' }, select: { email: true, score: true } }),
  ]);

  const lpByEmail = new Map<string, string>();
  const data: Record<string, LpLeadData> = {};

  for (const c of capt) {
    const lp = c.lp ?? 'Sem LP';
    if (!data[lp]) data[lp] = { leads: 0, scoreTotal: 0, scoreCount: 0 };
    data[lp].leads++;
    if (c.email) lpByEmail.set(c.email.toLowerCase(), lp);
  }

  for (const q of quest) {
    if (!q.email || q.score == null) continue;
    const lp = lpByEmail.get(q.email.toLowerCase());
    if (!lp || !data[lp]) continue;
    data[lp].scoreTotal += q.score;
    data[lp].scoreCount++;
  }

  return data;
}

function fmtLpData(
  lp: string,
  lead: LpLeadData | undefined,
  ad: LpAdMetrics | undefined,
): string {
  const leads = lead?.leads ?? 0;
  const scoreTotal = lead?.scoreTotal ?? 0;
  const scoreAvg = lead?.scoreCount ? Math.round(scoreTotal / lead.scoreCount) : 0;
  const spend = ad?.spend ?? null;
  const cpl = spend != null && leads > 0 ? (spend / leads).toFixed(2) : 'n/d';
  const ctr = ad ? ad.ctr.toFixed(2) : 'n/d';
  const connect =
    ad && ad.linkClicks > 0 ? ((ad.lpViews / ad.linkClicks) * 100).toFixed(2) : 'n/d';

  return [
    `${lp}:`,
    `  leads=${leads}`,
    `  lead_score_total=${scoreTotal}`,
    `  lead_score_medio=${scoreAvg}`,
    `  investimento=${spend != null ? 'R$ ' + spend.toFixed(2) : 'n/d'}`,
    `  cpl=${cpl === 'n/d' ? 'n/d' : 'R$ ' + cpl}`,
    `  ctr=${ctr === 'n/d' ? 'n/d' : ctr + '%'}`,
    `  connect_rate=${connect === 'n/d' ? 'n/d' : connect + '%'}`,
  ].join('\n');
}

export async function buildBlockReport(): Promise<string> {
  const [leadByLp, adByLp] = await Promise.all([getLeadDataByLp(), getAdMetricsByLp().catch(() => ({}))]);

  const totalLeads = Object.values(leadByLp).reduce((s, d) => s + d.leads, 0);
  const totalScore = Object.values(leadByLp).reduce((s, d) => s + d.scoreTotal, 0);
  const totalSpend = Object.values(adByLp).reduce((s, m) => s + m.spend, 0);
  const totalImpr = Object.values(adByLp).reduce((s, m) => s + m.impressions, 0);
  const totalClicks = Object.values(adByLp).reduce((s, m) => s + m.linkClicks, 0);
  const totalLpViews = Object.values(adByLp).reduce((s, m) => s + m.lpViews, 0);
  const hasAd = Object.keys(adByLp).length > 0;

  const dados = [
    `DADOS (use exatamente estes números):`,
    `Total de leads: ${totalLeads}`,
    `Lead Score total geral: ${totalScore}`,
    `Investimento total: ${hasAd ? 'R$ ' + totalSpend.toFixed(2) : 'n/d'}`,
    `CPL geral: ${hasAd && totalLeads > 0 ? 'R$ ' + (totalSpend / totalLeads).toFixed(2) : 'n/d'}`,
    `CTR geral: ${hasAd && totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(2) + '%' : 'n/d'}`,
    `Connect Rate geral: ${hasAd && totalClicks > 0 ? ((totalLpViews / totalClicks) * 100).toFixed(2) + '%' : 'n/d'}`,
    ``,
    fmtLpData('LP01', leadByLp['LP01'], adByLp['LP01']),
    ``,
    fmtLpData('LP02', leadByLp['LP02'], adByLp['LP02']),
  ].join('\n');

  return askDeepSeek(ANALYST_PROMPT, dados);
}
