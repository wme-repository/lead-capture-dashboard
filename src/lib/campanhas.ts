import { prisma } from "@/lib/prisma";

export type CampaignRow = {
  name: string;
  count: number;
  scoreAvg: number | null;
  gradeDistribution: Record<string, number>;
  bestGrade: string | null;
  qualifiedPct: number | null;
  topSource: string | null;
  topMedium: string | null;
  topPage: string | null;
  lastLead: string;
  firstLead: string;
  topContent: string | null;
  topTerm: string | null;
  topGroup: string | null;
  topPesquisa: string | null;
};

export type CampaignSummary = {
  totalCampaigns: number;
  totalLeads: number;
  qualifiedCount: number;
  qualifiedPct: number;
  avgScore: number | null;
  topVolumeCampaign: string | null;
  topQualityCampaign: string | null;
};

export type CampaignLead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  score: number | null;
  grade: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  paginaCaptura: string | null;
  receivedAt: string;
};

export type SourceBreakdown = { label: string; count: number };
export type PageBreakdown = { label: string; count: number };

export type CampaignsData = {
  campaigns: CampaignRow[];
  summary: CampaignSummary;
  sourceBreakdown: SourceBreakdown[];
  pageBreakdown: PageBreakdown[];
  dailyChart: { label: string; value: number }[];
};

function topValue(map: Map<string, number>): string | null {
  let best: string | null = null;
  let max = 0;
  for (const [k, v] of map) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}

const GRADE_ORDER: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
function brtDayKey(d: Date): string {
  return new Date(d.getTime() - BRT_OFFSET_MS).toISOString().slice(0, 10);
}
function dayLabel(key: string): string {
  const [, m, day] = key.split("-");
  return `${day}/${m}`;
}

export async function getCampaignsData(opts: {
  period: "7d" | "30d" | "90d";
  source?: string;
  medium?: string;
  page?: string;
}): Promise<CampaignsData> {
  const now = new Date();
  const days = opts.period === "7d" ? 7 : opts.period === "30d" ? 30 : 90;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = { receivedAt: { gte: since } };
  if (opts.source) where.utmSource = opts.source;
  if (opts.medium) where.utmMedium = opts.medium;
  if (opts.page) where.paginaCaptura = opts.page;

  const rows = await prisma.lead.findMany({
    where,
    select: {
      utmCampaign: true,
      utmSource: true,
      utmMedium: true,
      utmContent: true,
      utmTerm: true,
      paginaCaptura: true,
      pesquisa: true,
      grupo: true,
      score: true,
      grade: true,
      receivedAt: true,
    },
    orderBy: { receivedAt: "desc" },
    take: 10000,
  });

  // Build campaign map
  type Accum = {
    count: number;
    scores: number[];
    grades: Map<string, number>;
    sources: Map<string, number>;
    mediums: Map<string, number>;
    pages: Map<string, number>;
    contents: Map<string, number>;
    terms: Map<string, number>;
    groups: Map<string, number>;
    pesquisas: Map<string, number>;
    last: Date;
    first: Date;
  };

  const campMap = new Map<string, Accum>();
  const sourceMap = new Map<string, number>();
  const pageMap = new Map<string, number>();
  const dailyMap = new Map<string, number>();

  function inc(m: Map<string, number>, k: string | null) {
    if (!k) return;
    m.set(k, (m.get(k) ?? 0) + 1);
  }

  for (const r of rows) {
    const key = r.utmCampaign || "(sem campanha)";
    const e: Accum = campMap.get(key) ?? {
      count: 0,
      scores: [],
      grades: new Map(),
      sources: new Map(),
      mediums: new Map(),
      pages: new Map(),
      contents: new Map(),
      terms: new Map(),
      groups: new Map(),
      pesquisas: new Map(),
      last: r.receivedAt,
      first: r.receivedAt,
    };

    e.count += 1;
    if (r.score != null) e.scores.push(r.score);
    if (r.grade) inc(e.grades, r.grade);
    inc(e.sources, r.utmSource);
    inc(e.mediums, r.utmMedium);
    inc(e.pages, r.paginaCaptura);
    inc(e.contents, r.utmContent);
    inc(e.terms, r.utmTerm);
    inc(e.groups, r.grupo);
    inc(e.pesquisas, r.pesquisa);
    if (r.receivedAt > e.last) e.last = r.receivedAt;
    if (r.receivedAt < e.first) e.first = r.receivedAt;
    campMap.set(key, e);

    inc(sourceMap, r.utmSource || "direto");
    inc(pageMap, r.paginaCaptura || "(sem página)");

    const dk = brtDayKey(r.receivedAt);
    dailyMap.set(dk, (dailyMap.get(dk) ?? 0) + 1);
  }

  const campaigns: CampaignRow[] = [...campMap.entries()]
    .map(([name, e]) => {
      const scoreAvg =
        e.scores.length > 0
          ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length)
          : null;

      const gradeDistribution: Record<string, number> = {};
      for (const [g, c] of e.grades) gradeDistribution[g] = c;

      let bestGrade: string | null = null;
      let bestOrder = 0;
      for (const [g] of e.grades) {
        if ((GRADE_ORDER[g] ?? 0) > bestOrder) {
          bestOrder = GRADE_ORDER[g] ?? 0;
          bestGrade = g;
        }
      }

      const qualifiedCount = (e.grades.get("A") ?? 0) + (e.grades.get("B") ?? 0);
      const gradedTotal = [...e.grades.values()].reduce((a, b) => a + b, 0);

      return {
        name,
        count: e.count,
        scoreAvg,
        gradeDistribution,
        bestGrade,
        qualifiedPct: gradedTotal > 0 ? Math.round((qualifiedCount / gradedTotal) * 100) : null,
        topSource: topValue(e.sources),
        topMedium: topValue(e.mediums),
        topPage: topValue(e.pages),
        topContent: topValue(e.contents),
        topTerm: topValue(e.terms),
        topGroup: topValue(e.groups),
        topPesquisa: topValue(e.pesquisas),
        lastLead: e.last.toISOString(),
        firstLead: e.first.toISOString(),
      };
    })
    .sort((a, b) => b.count - a.count);

  // Summary
  const totalLeads = rows.length;
  const allScores = rows.filter((r) => r.score != null).map((r) => r.score!);
  const avgScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null;
  const qualifiedCount = rows.filter(
    (r) => r.grade === "A" || r.grade === "B"
  ).length;
  const gradedCount = rows.filter((r) => r.grade != null).length;

  let topQualityCampaign: string | null = null;
  let bestAvg = -1;
  for (const c of campaigns) {
    if (c.scoreAvg != null && c.scoreAvg > bestAvg && c.count >= 2) {
      bestAvg = c.scoreAvg;
      topQualityCampaign = c.name;
    }
  }

  const summary: CampaignSummary = {
    totalCampaigns: campaigns.length,
    totalLeads,
    qualifiedCount,
    qualifiedPct: gradedCount > 0 ? Math.round((qualifiedCount / gradedCount) * 100) : 0,
    avgScore,
    topVolumeCampaign: campaigns.length > 0 ? campaigns[0].name : null,
    topQualityCampaign,
  };

  const sourceBreakdown = [...sourceMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const pageBreakdown = [...pageMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Daily chart
  const dailyKeys: string[] = [];
  for (let i = Math.min(days, 30) - 1; i >= 0; i--)
    dailyKeys.push(brtDayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  const dailyChart = dailyKeys.map((k) => ({
    label: dayLabel(k),
    value: dailyMap.get(k) ?? 0,
  }));

  return { campaigns, summary, sourceBreakdown, pageBreakdown, dailyChart };
}

export async function getCampaignLeads(
  campaignName: string,
  limit = 20
): Promise<CampaignLead[]> {
  const where =
    campaignName === "(sem campanha)"
      ? { OR: [{ utmCampaign: null }, { utmCampaign: "" }] }
      : { utmCampaign: campaignName };

  const leads = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      score: true,
      grade: true,
      utmSource: true,
      utmMedium: true,
      paginaCaptura: true,
      receivedAt: true,
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
  });

  return leads.map((l) => ({
    ...l,
    receivedAt: l.receivedAt.toISOString(),
  }));
}

export async function getFilterOptions() {
  const [sources, mediums, pages] = await Promise.all([
    prisma.lead.findMany({
      where: { utmSource: { not: null } },
      select: { utmSource: true },
      distinct: ["utmSource"],
    }),
    prisma.lead.findMany({
      where: { utmMedium: { not: null } },
      select: { utmMedium: true },
      distinct: ["utmMedium"],
    }),
    prisma.lead.findMany({
      where: { paginaCaptura: { not: null } },
      select: { paginaCaptura: true },
      distinct: ["paginaCaptura"],
    }),
  ]);

  return {
    sources: sources.map((s) => s.utmSource!).sort(),
    mediums: mediums.map((m) => m.utmMedium!).sort(),
    pages: pages.map((p) => p.paginaCaptura!).sort(),
  };
}
