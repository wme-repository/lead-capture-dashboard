import { prisma } from '@/lib/prisma';
import { getMetaConjuntos, type CampanhaBreakdown } from '@/lib/integrations/meta';

// utm_medium carrega {{adset.name}} (nome do conjunto). Normaliza p/ casar com o
// nome do conjunto vindo do Meta (espaços/encoding/caixa podem diferir).
function norm(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/%20/g, ' ')
    .replace(/\+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Combina o gasto/orçamento do Meta (por conjunto) com a contagem de leads NOSSA
// (por utm_medium + LP) e calcula o CPL = gasto ÷ leads nossos.
export async function getConjuntosData(): Promise<CampanhaBreakdown[]> {
  const [campanhas, leadGroups] = await Promise.all([
    getMetaConjuntos(),
    prisma.lead.groupBy({
      by: ['utmMedium', 'lp'],
      where: { schemaType: 'standard', NOT: { utmMedium: null } },
      _count: true,
    }),
  ]);

  // chave: norm(utm_medium) + "|" + lp  → leads
  const leadsByConjuntoLp = new Map<string, number>();
  for (const g of leadGroups) {
    const key = `${norm(g.utmMedium)}|${g.lp ?? ''}`;
    leadsByConjuntoLp.set(key, (leadsByConjuntoLp.get(key) ?? 0) + g._count);
  }

  for (const c of campanhas) {
    let totalLeads = 0;
    for (const j of c.conjuntos) {
      const leads = leadsByConjuntoLp.get(`${norm(j.conjunto)}|${c.lp ?? ''}`) ?? 0;
      j.leads = leads;
      j.cpl = leads > 0 ? j.gasto / leads : null;
      totalLeads += leads;
    }
    c.leads = totalLeads;
    c.cpl = totalLeads > 0 ? c.gasto / totalLeads : null;
  }

  return campanhas;
}
