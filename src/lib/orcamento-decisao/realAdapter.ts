import "server-only";
import { prisma } from "@/lib/prisma";
import { getMetaAdSets } from "@/lib/integrations/meta";
import type { AdSet, AdStatus, Publico } from "./types";
import type { Janela } from "./adapter";

// Mesma normalização da aba Conjuntos: utm_medium carrega {{adset.name}}.
function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/%20/g, " ")
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function datePreset(janela: Janela): string {
  switch (janela) {
    case "hoje":
      return "today";
    case "ontem":
      return "yesterday";
    case "3d":
      return "last_3d";
    case "7d":
      return "last_7d";
    case "14d":
      return "last_14d";
    default:
      return "maximum";
  }
}

// Janela dos NOSSOS leads (espelha o date_preset do Meta).
function janelaLeads(janela: Janela, now: Date): { gte?: Date; lt?: Date } {
  const inicioHoje = new Date(now);
  inicioHoje.setHours(0, 0, 0, 0);
  const dias = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };
  switch (janela) {
    case "hoje":
      return { gte: inicioHoje };
    case "ontem": {
      const ontem = new Date(inicioHoje);
      ontem.setDate(ontem.getDate() - 1);
      return { gte: ontem, lt: inicioHoje };
    }
    case "3d":
      return { gte: dias(3) };
    case "7d":
      return { gte: dias(7) };
    case "14d":
      return { gte: dias(14) };
    default:
      return {}; // custom / maximum → tudo
  }
}

function mapStatus(effectiveStatus: string): AdStatus {
  const u = effectiveStatus.toUpperCase();
  if (u.includes("PAUSED")) return "PAUSED";
  if (u === "ACTIVE") return "ACTIVE";
  return "PENDING";
}

// Média de leadScore por conjunto, a partir do registro de email único
// (emails_captados_trt_julho tem utmMedium + lp + score). Resiliente: se a
// tabela não existir nesse ambiente, devolve mapa vazio (leadScore = 0).
async function leadScoreByKey(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const rows = await prisma.$queryRaw<{ utmMedium: string | null; lp: string | null; media: number | null }[]>`
      SELECT "utmMedium", lp, AVG(score)::float AS media
      FROM emails_captados_trt_julho
      WHERE score IS NOT NULL
      GROUP BY "utmMedium", lp`;
    for (const r of rows) {
      if (r.media == null) continue;
      map.set(`${norm(r.utmMedium)}|${r.lp ?? ""}`, r.media);
    }
  } catch {
    // tabela ausente / erro → leadScore neutro (0)
  }
  return map;
}

// Adapter de produção: combina Meta (gasto, orçamento, status, CTR, Connect)
// com NOSSOS leads (contagem + leadScore + última entrega) por conjunto+LP.
export async function getRealAdSets(janela: Janela): Promise<AdSet[]> {
  const now = new Date();
  const { gte, lt } = janelaLeads(janela, now);
  const receivedAt = gte || lt ? { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } : undefined;

  const [metaAdSets, leadGroups, scoreMap] = await Promise.all([
    getMetaAdSets(datePreset(janela)),
    prisma.lead.groupBy({
      by: ["utmMedium", "lp"],
      where: { schemaType: "standard", NOT: { utmMedium: null }, ...(receivedAt ? { receivedAt } : {}) },
      _count: true,
      _max: { receivedAt: true },
    }),
    leadScoreByKey(),
  ]);

  // chave: norm(utm_medium) + "|" + lp
  const leadsByKey = new Map<string, number>();
  const lastByKey = new Map<string, number>();
  for (const g of leadGroups) {
    const key = `${norm(g.utmMedium)}|${g.lp ?? ""}`;
    leadsByKey.set(key, (leadsByKey.get(key) ?? 0) + g._count);
    const ts = g._max.receivedAt ? new Date(g._max.receivedAt).getTime() : undefined;
    if (ts != null) lastByKey.set(key, Math.max(lastByKey.get(key) ?? 0, ts));
  }

  return metaAdSets.map((m) => {
    const key = `${norm(m.conjunto)}|${m.lp ?? ""}`;
    return {
      id: m.id,
      campanha: m.campanha,
      conjunto: m.conjunto,
      lp: m.lp ?? "Sem LP",
      publico: (m.temperatura ?? "FRIO") as Publico,
      status: mapStatus(m.status),
      orcamentoDia: m.budgetDia,
      gasto: m.gasto,
      leads: leadsByKey.get(key) ?? 0,
      ctr: m.ctr,
      connectRate: m.connectRate,
      leadScore: scoreMap.get(key) ?? 0,
      ultimaEntrega: lastByKey.get(key),
    } satisfies AdSet;
  });
}
