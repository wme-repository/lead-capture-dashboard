import { prisma } from "@/lib/prisma";
import {
  classifyOrigin,
  classifyPlatform,
  classifyPlacement,
  classifyUtmStatus,
} from "@/lib/atribuicao";
import type { MacroOrigin, Platform, Placement, UtmStatus } from "@/lib/atribuicao";

// ── Types ──────────────────────────────────────────────────────────

export type Period = "today" | "7d" | "30d";

export type GradeDistribution = {
  A: number; B: number; C: number; D: number; none: number;
};

export type SyncStats = {
  total: number; synced: number; pending: number; failed: number; syncPct: number;
};

export type DailyChartPoint = {
  label: string;
  leads: number;
  avgScore: number | null;
  qualifiedCount: number;
  qualRate: number;
};

export type GroupStats = {
  label: string;
  count: number;
  pct: number;
  avgScore: number | null;
  qualifiedPct: number;
  topGrade: string | null;
  topCampaign: string | null;
  topPage: string | null;
  lastLead: string | null;
  grades: Record<string, number>;
  daily: { label: string; count: number }[];
};

export type LpStats = {
  label: string;
  raw: string;
  count: number;
  pct: number;
  avgScore: number | null;
  medianScore: number | null;
  qualifiedPct: number;
  weakPct: number;
  grades: Record<string, number>;
  decisionIndex: number;
  recommendation: "Escalar" | "Manter" | "Otimizar" | "Pausar" | "Dados insuficientes";
  topOrigin: string | null;
  topCampaign: string | null;
  lastLead: string | null;
  daily: { label: string; count: number }[];
};

export type Insight = {
  type: "success" | "warning" | "danger" | "info";
  icon: string;
  text: string;
  metric?: string;
  action?: { label: string; href: string };
};

export type RecentLead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  paginaCaptura: string | null;
  pesquisa: string | null;
  grupo: string | null;
  score: number | null;
  grade: string | null;
  status: string;
  receivedAt: string;
  origin: MacroOrigin;
  platform: Platform;
  placement: Placement;
  utmStatus: UtmStatus;
  sourceName: string;
  syncLogs: { status: string; destination: string; error: string | null; attemptedAt: string }[];
};

export type OriginAnalysis = {
  label: string;
  count: number;
  pct: number;
  avgScore: number | null;
  medianScore: number | null;
  qualifiedPct: number;
  weakPct: number;
  topGrade: string | null;
  topCampaign: string | null;
  topPage: string | null;
  lastLead: string | null;
  grades: Record<string, number>;
  daily: { label: string; count: number }[];
  decisionIndex: number;
  recommendation: "Escalar" | "Manter" | "Otimizar" | "Pausar" | "Corrigir UTM" | "Dados insuficientes";
  status: "high" | "stable" | "attention" | "low" | "insufficient";
  platforms: { label: string; count: number }[];
  topUtmSource: string | null;
  topUtmMedium: string | null;
};

export type UtmQuality = {
  complete: number;
  partial: number;
  none: number;
  completePct: number;
  partialPct: number;
  nonePct: number;
  uniqueCampaigns: number;
  uniqueSources: number;
  uniqueMediums: number;
  uniqueContents: number;
  uniqueTerms: number;
  rows: UtmRow[];
};

export type UtmRow = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  leads: number;
  pct: number;
  avgScore: number | null;
  topGrade: string | null;
  topLp: string | null;
  lastLead: string | null;
  utmStatus: "Completa" | "Parcial" | "Sem UTM";
};

export type UtmDimRow = {
  value: string;
  leads: number;
  pct: number;
  status: "high" | "stable" | "attention" | "low" | "insufficient";
  qualifiedCount: number;
  qualifiedPct: number;
  avgScore: number | null;
  grades: { A: number; B: number; C: number; D: number; none: number };
  gradePcts: { A: number; B: number; C: number; D: number; none: number };
};

export type OriginUtmTables = {
  sources: UtmDimRow[];
  mediums: UtmDimRow[];
  campaigns: UtmDimRow[];
  contents: UtmDimRow[];
  terms: UtmDimRow[];
  totals: {
    leads: number;
    qualifiedCount: number;
    qualifiedPct: number;
    grades: { A: number; B: number; C: number; D: number; none: number };
    gradePcts: { A: number; B: number; C: number; D: number; none: number };
  };
};

export type OriginInsight = {
  type: "success" | "warning" | "danger" | "info";
  icon: string;
  text: string;
  metric?: string;
};

// ── Survey / Pesquisa types ───────────────────────────────────────

export const SURVEY_QUESTION_KEYS = [
  "nivel_concursos",
  "estudou_tribunal",
  "conhece_thallius",
  "motivo_projeto",
  "idade",
  "renda",
  "genero",
  "escolaridade",
  "situacao",
  "tempo_esquadrao",
  "expectativas",
] as const;

export const SURVEY_QUESTION_LABELS: Record<string, string> = {
  nivel_concursos: "Nível no mundo dos concursos",
  estudou_tribunal: "Já estudou para concurso de Tribunal?",
  conhece_thallius: "Conhece o Prof. Thallius Moraes?",
  motivo_projeto: "Principal motivo para participar",
  idade: "Idade",
  renda: "Renda mensal",
  genero: "Gênero",
  escolaridade: "Escolaridade",
  situacao: "Situação atual",
  tempo_esquadrao: "Há quanto tempo conhece o Esquadrão?",
  expectativas: "Expectativas em relação ao projeto",
};

export type SurveyAnswerStats = {
  value: string;
  count: number;
  pct: number;
  avgScore: number | null;
  medianScore: number | null;
  qualifiedPct: number;
  grades: { A: number; B: number; C: number; D: number; none: number };
  gradePcts: { A: number; B: number; C: number; D: number; none: number };
  topGrade: string | null;
};

export type SurveyQuestionStats = {
  key: string;
  label: string;
  answers: SurveyAnswerStats[];
  totalResponses: number;
};

export type SurveyQualityRow = {
  question: string;
  answer: string;
  leads: number;
  pct: number;
  avgScore: number | null;
  medianScore: number | null;
  pctA: number;
  pctB: number;
  qualifiedPct: number;
  topGrade: string | null;
  recommendation: string;
  smallSample: boolean;
};

export type SurveyInsight = {
  type: "success" | "warning" | "danger" | "info";
  icon: string;
  text: string;
  metric?: string;
};

export type SurveyDailyPoint = {
  label: string;
  responses: number;
  avgScore: number | null;
  qualifiedCount: number;
};

export type SurveyLeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  score: number | null;
  grade: string | null;
  receivedAt: string;
  answers: Record<string, string>;
  utmSource: string | null;
  utmCampaign: string | null;
  utmMedium: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  paginaCaptura: string | null;
  origin: string;
  platform: string;
};

export type SurveyData = {
  totalResponses: number;
  responseRate: number;
  qualifiedCount: number;
  avgScore: number | null;
  medianScore: number | null;
  topGrade: string | null;
  grades: GradeDistribution;
  gradePcts: GradeDistribution;
  questions: SurveyQuestionStats[];
  bestAnswers: SurveyQualityRow[];
  worstAnswers: SurveyQualityRow[];
  insights: SurveyInsight[];
  daily: SurveyDailyPoint[];
  scoreDistribution: { label: string; count: number; pct: number }[];
  leads: SurveyLeadRow[];
  filterOptions: {
    utmSources: string[];
    utmCampaigns: string[];
    utmMediums: string[];
    utmContents: string[];
    lps: string[];
    grades: string[];
  };
  bestProfile: { label: string; avgScore: number } | null;
  mostDecisiveQuestion: { label: string; spread: number } | null;
};

export type DashboardV2Data = {
  totalLeads: number;
  totalDelta: number;
  qualifiedLeads: number;
  qualifiedDelta: number;
  avgScore: number | null;
  avgScoreDelta: number;
  qualificationRate: number;
  grades: GradeDistribution;
  gradePcts: GradeDistribution;
  noScoreCount: number;
  sync: SyncStats;
  dailyChart: DailyChartPoint[];
  origins: GroupStats[];
  platforms: GroupStats[];
  placements: GroupStats[];
  lps: LpStats[];
  lpInsights: string[];
  insights: Insight[];
  recentLeads: RecentLead[];
  periodDays: number;
  lastUpdate: string;
  sources: { slug: string; name: string }[];
  filterOptions: {
    campaigns: string[];
    sources: string[];
    platforms: string[];
  };
  originAnalysis: OriginAnalysis[];
  utmQuality: UtmQuality;
  originInsights: OriginInsight[];
  originUtmTables: Record<string, OriginUtmTables>;
  surveyData: SurveyData;
};

// ── Helpers ────────────────────────────────────────────────────────

const BRT_MS = 3 * 60 * 60 * 1000;

function brtDay(d: Date) {
  return new Date(d.getTime() - BRT_MS).toISOString().slice(0, 10);
}

function dayLabel(k: string) {
  const [, m, d] = k.split("-");
  return `${d}/${m}`;
}

function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

function isQualified(grade: string | null, score: number | null): boolean {
  return grade === "A" || grade === "B" || (score != null && score >= 70);
}

function isWeak(grade: string | null, score: number | null): boolean {
  return grade === "D" || (score != null && score < 50);
}

function normalizeLp(raw: string | null): string {
  if (!raw) return "(sem página)";
  const lower = raw.toLowerCase();
  const lpParam = lower.match(/lp=lp(\d+)/);
  if (lpParam) return `LP${lpParam[1].padStart(2, "0")}`;
  const lpMatch = lower.match(/lp(\d+)/);
  if (lpMatch) return `LP${lpMatch[1].padStart(2, "0")}`;
  return raw;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function topOf(map: Map<string, number>): string | null {
  let best: string | null = null;
  let max = 0;
  for (const [k, v] of map) {
    if (v > max) { max = v; best = k; }
  }
  return best;
}

function periodDays(p: Period): number {
  return p === "today" ? 1 : p === "7d" ? 7 : 30;
}

// ── Accumulator types ──────────────────────────────────────────────

type GroupAccum = {
  count: number;
  scoreSum: number;
  scoreCount: number;
  qualified: number;
  grades: Map<string, number>;
  campaigns: Map<string, number>;
  pages: Map<string, number>;
  lastLead: Date | null;
  daily: Map<string, number>;
};

function newGroupAccum(): GroupAccum {
  return {
    count: 0, scoreSum: 0, scoreCount: 0, qualified: 0,
    grades: new Map(), campaigns: new Map(), pages: new Map(),
    lastLead: null, daily: new Map(),
  };
}

function addToGroup(g: GroupAccum, lead: {
  score: number | null; grade: string | null;
  utmCampaign: string | null; paginaCaptura: string | null;
  receivedAt: Date; day: string;
}) {
  g.count++;
  if (lead.score != null) { g.scoreSum += lead.score; g.scoreCount++; }
  if (isQualified(lead.grade, lead.score)) g.qualified++;
  const gr = lead.grade ?? "none";
  g.grades.set(gr, (g.grades.get(gr) ?? 0) + 1);
  if (lead.utmCampaign) g.campaigns.set(lead.utmCampaign, (g.campaigns.get(lead.utmCampaign) ?? 0) + 1);
  if (lead.paginaCaptura) g.pages.set(lead.paginaCaptura, (g.pages.get(lead.paginaCaptura) ?? 0) + 1);
  if (!g.lastLead || lead.receivedAt > g.lastLead) g.lastLead = lead.receivedAt;
  g.daily.set(lead.day, (g.daily.get(lead.day) ?? 0) + 1);
}

function finalizeGroup(label: string, g: GroupAccum, total: number, allDays: string[]): GroupStats {
  return {
    label,
    count: g.count,
    pct: total > 0 ? Math.round((g.count / total) * 100) : 0,
    avgScore: g.scoreCount > 0 ? Math.round(g.scoreSum / g.scoreCount) : null,
    qualifiedPct: g.count > 0 ? Math.round((g.qualified / g.count) * 100) : 0,
    topGrade: topOf(g.grades),
    topCampaign: topOf(g.campaigns),
    topPage: topOf(g.pages),
    lastLead: g.lastLead?.toISOString() ?? null,
    grades: Object.fromEntries(g.grades),
    daily: allDays.map((d) => ({ label: dayLabel(d), count: g.daily.get(d) ?? 0 })),
  };
}

// ── LP accumulator ─────────────────────────────────────────────────

type LpAccum = {
  raw: string;
  count: number;
  scores: number[];
  qualified: number;
  weak: number;
  grades: Map<string, number>;
  origins: Map<string, number>;
  campaigns: Map<string, number>;
  lastLead: Date | null;
  daily: Map<string, number>;
};

function newLpAccum(raw: string): LpAccum {
  return {
    raw, count: 0, scores: [], qualified: 0, weak: 0,
    grades: new Map(), origins: new Map(), campaigns: new Map(),
    lastLead: null, daily: new Map(),
  };
}

// ── Main function ──────────────────────────────────────────────────

export async function getDashboardV2Data(opts: {
  period: Period;
  sourceSlug?: string;
  campaign?: string;
  platform?: string;
}): Promise<DashboardV2Data> {
  const days = periodDays(opts.period);
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 86_400_000);
  const prevStart = new Date(periodStart.getTime() - days * 86_400_000);

  const sourceFilter = opts.sourceSlug
    ? { source: { slug: opts.sourceSlug } }
    : {};

  const [allLeads, syncAgg, sources, recentRaw] = await Promise.all([
    prisma.lead.findMany({
      where: { receivedAt: { gte: prevStart }, ...sourceFilter },
      select: {
        id: true, name: true, email: true, phone: true,
        utmSource: true, utmMedium: true, utmCampaign: true,
        utmContent: true, utmTerm: true,
        paginaCaptura: true, pesquisa: true, grupo: true,
        score: true, grade: true, answers: true, status: true, receivedAt: true,
        source: { select: { name: true, slug: true } },
      },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.syncLog.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.source.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.findMany({
      where: { ...sourceFilter },
      select: {
        id: true, name: true, email: true, phone: true,
        utmSource: true, utmMedium: true, utmCampaign: true,
        utmContent: true, utmTerm: true,
        paginaCaptura: true, pesquisa: true, grupo: true,
        score: true, grade: true, answers: true, status: true, receivedAt: true,
        source: { select: { name: true } },
        syncLogs: {
          select: { status: true, destination: true, error: true, attemptedAt: true },
          orderBy: { attemptedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { receivedAt: "desc" },
      take: 50,
    }),
  ]);

  // Split current vs previous period
  const curLeads: typeof allLeads = [];
  const prevLeads: typeof allLeads = [];
  for (const l of allLeads) {
    if (l.receivedAt >= periodStart) curLeads.push(l);
    else prevLeads.push(l);
  }

  // Apply runtime filters (campaign, platform) on current period
  const filtered = curLeads.filter((l) => {
    if (opts.campaign && l.utmCampaign !== opts.campaign) return false;
    if (opts.platform) {
      const plat = classifyPlatform(l.utmSource, l.utmMedium, l.utmContent);
      if (plat !== opts.platform) return false;
    }
    return true;
  });

  // Generate day keys
  const allDays: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    allDays.push(brtDay(d));
  }

  // Single-pass accumulation
  const grades: GradeDistribution = { A: 0, B: 0, C: 0, D: 0, none: 0 };
  let scoreSum = 0, scoreCount = 0, qualifiedCount = 0;

  const originMap = new Map<string, GroupAccum>();
  const platformMap = new Map<string, GroupAccum>();
  const placementMap = new Map<string, GroupAccum>();
  const lpMap = new Map<string, LpAccum>();
  const dailyMap = new Map<string, { leads: number; scoreSum: number; scoreCount: number; qualified: number }>();
  const campaignSet = new Set<string>();
  const platformSet = new Set<string>();

  for (const day of allDays) {
    dailyMap.set(day, { leads: 0, scoreSum: 0, scoreCount: 0, qualified: 0 });
  }

  for (const l of filtered) {
    const day = brtDay(l.receivedAt);
    const origin = classifyOrigin(l.utmSource, l.utmMedium, l.utmContent);
    const platform = classifyPlatform(l.utmSource, l.utmMedium, l.utmContent);
    const placement = classifyPlacement(l.utmContent, l.utmTerm, l.utmSource, l.utmMedium);
    const qual = isQualified(l.grade, l.score);
    const leadData = { score: l.score, grade: l.grade, utmCampaign: l.utmCampaign, paginaCaptura: l.paginaCaptura, receivedAt: l.receivedAt, day };

    // Grade distribution
    const g = (l.grade as keyof GradeDistribution) ?? "none";
    if (g in grades) grades[g]++;
    else grades.none++;

    // Score
    if (l.score != null) { scoreSum += l.score; scoreCount++; }
    if (qual) qualifiedCount++;

    // Daily
    const dm = dailyMap.get(day);
    if (dm) {
      dm.leads++;
      if (l.score != null) { dm.scoreSum += l.score; dm.scoreCount++; }
      if (qual) dm.qualified++;
    }

    // Origins
    if (!originMap.has(origin)) originMap.set(origin, newGroupAccum());
    addToGroup(originMap.get(origin)!, leadData);

    // Platforms
    if (!platformMap.has(platform)) platformMap.set(platform, newGroupAccum());
    addToGroup(platformMap.get(platform)!, leadData);
    platformSet.add(platform);

    // Placements
    if (!placementMap.has(placement)) placementMap.set(placement, newGroupAccum());
    addToGroup(placementMap.get(placement)!, leadData);

    // LPs
    const lpLabel = normalizeLp(l.paginaCaptura);
    if (!lpMap.has(lpLabel)) lpMap.set(lpLabel, newLpAccum(l.paginaCaptura ?? "(sem página)"));
    const lp = lpMap.get(lpLabel)!;
    lp.count++;
    if (l.score != null) lp.scores.push(l.score);
    if (qual) lp.qualified++;
    if (isWeak(l.grade, l.score)) lp.weak++;
    const gr2 = l.grade ?? "none";
    lp.grades.set(gr2, (lp.grades.get(gr2) ?? 0) + 1);
    lp.origins.set(origin, (lp.origins.get(origin) ?? 0) + 1);
    if (l.utmCampaign) lp.campaigns.set(l.utmCampaign, (lp.campaigns.get(l.utmCampaign) ?? 0) + 1);
    if (!lp.lastLead || l.receivedAt > lp.lastLead) lp.lastLead = l.receivedAt;
    lp.daily.set(day, (lp.daily.get(day) ?? 0) + 1);

    // Filter options
    if (l.utmCampaign) campaignSet.add(l.utmCampaign);
  }

  const total = filtered.length;

  // Previous period KPIs (for delta)
  const prevFiltered = prevLeads.filter((l) => {
    if (opts.campaign && l.utmCampaign !== opts.campaign) return false;
    if (opts.platform) {
      const plat = classifyPlatform(l.utmSource, l.utmMedium, l.utmContent);
      if (plat !== opts.platform) return false;
    }
    return true;
  });
  let prevQualified = 0, prevScoreSum = 0, prevScoreCount = 0;
  for (const l of prevFiltered) {
    if (isQualified(l.grade, l.score)) prevQualified++;
    if (l.score != null) { prevScoreSum += l.score; prevScoreCount++; }
  }

  const avgScoreVal = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null;
  const prevAvgScore = prevScoreCount > 0 ? Math.round(prevScoreSum / prevScoreCount) : null;

  // Grade percentages
  const gradePcts: GradeDistribution = {
    A: total > 0 ? Math.round((grades.A / total) * 100) : 0,
    B: total > 0 ? Math.round((grades.B / total) * 100) : 0,
    C: total > 0 ? Math.round((grades.C / total) * 100) : 0,
    D: total > 0 ? Math.round((grades.D / total) * 100) : 0,
    none: total > 0 ? Math.round((grades.none / total) * 100) : 0,
  };

  // Sync stats
  const syncTotal = syncAgg.reduce((a, s) => a + s._count.id, 0);
  const syncByStatus = Object.fromEntries(syncAgg.map((s) => [s.status, s._count.id]));
  const synced = (syncByStatus["synced"] ?? 0) + (syncByStatus["done"] ?? 0);
  const syncPending = syncByStatus["pending"] ?? 0;
  const syncFailed = syncByStatus["failed"] ?? 0;

  // Daily chart
  const dailyChart: DailyChartPoint[] = allDays.map((d) => {
    const dm = dailyMap.get(d)!;
    return {
      label: dayLabel(d),
      leads: dm.leads,
      avgScore: dm.scoreCount > 0 ? Math.round(dm.scoreSum / dm.scoreCount) : null,
      qualifiedCount: dm.qualified,
      qualRate: dm.leads > 0 ? Math.round((dm.qualified / dm.leads) * 100) : 0,
    };
  });

  // Finalize group stats
  const origins = [...originMap.entries()]
    .map(([k, v]) => finalizeGroup(k, v, total, allDays))
    .sort((a, b) => b.count - a.count);

  const platforms = [...platformMap.entries()]
    .map(([k, v]) => finalizeGroup(k, v, total, allDays))
    .sort((a, b) => b.count - a.count);

  const placements = [...placementMap.entries()]
    .map(([k, v]) => finalizeGroup(k, v, total, allDays))
    .sort((a, b) => b.count - a.count);

  // Finalize LP stats
  const maxLpCount = Math.max(...[...lpMap.values()].map((l) => l.count), 1);
  const allLpScores = filtered.filter((l) => l.score != null).map((l) => l.score!);
  const globalAvgScore = allLpScores.length > 0
    ? allLpScores.reduce((a, b) => a + b, 0) / allLpScores.length
    : 0;
  const maxAvgScore = Math.max(
    ...[...lpMap.values()]
      .filter((l) => l.scores.length > 0)
      .map((l) => l.scores.reduce((a, b) => a + b, 0) / l.scores.length),
    1,
  );

  const lps: LpStats[] = [...lpMap.entries()]
    .map(([label, lp]) => {
      const avg = lp.scores.length > 0
        ? Math.round(lp.scores.reduce((a, b) => a + b, 0) / lp.scores.length)
        : null;
      const qualPct = lp.count > 0 ? Math.round((lp.qualified / lp.count) * 100) : 0;
      const weakPct = lp.count > 0 ? Math.round((lp.weak / lp.count) * 100) : 0;
      const volNorm = (lp.count / maxLpCount) * 100;
      const scoreNorm = avg != null ? (avg / maxAvgScore) * 100 : 0;
      const sampleBonus = lp.count >= 10 ? 100 : lp.count >= 5 ? 60 : lp.count >= 3 ? 30 : 0;
      const decisionIndex = Math.round(volNorm * 0.35 + scoreNorm * 0.35 + qualPct * 0.2 + sampleBonus * 0.1);

      let recommendation: LpStats["recommendation"];
      if (lp.count < 3) recommendation = "Dados insuficientes";
      else if (decisionIndex >= 75) recommendation = "Escalar";
      else if (decisionIndex >= 55) recommendation = "Manter";
      else if (decisionIndex >= 35) recommendation = "Otimizar";
      else recommendation = "Pausar";

      return {
        label,
        raw: lp.raw,
        count: lp.count,
        pct: total > 0 ? Math.round((lp.count / total) * 100) : 0,
        avgScore: avg,
        medianScore: median(lp.scores),
        qualifiedPct: qualPct,
        weakPct,
        grades: Object.fromEntries(lp.grades),
        decisionIndex,
        recommendation,
        topOrigin: topOf(lp.origins),
        topCampaign: topOf(lp.campaigns),
        lastLead: lp.lastLead?.toISOString() ?? null,
        daily: allDays.map((d) => ({ label: dayLabel(d), count: lp.daily.get(d) ?? 0 })),
      };
    })
    .sort((a, b) => b.count - a.count);

  // LP insights
  const lpInsights: string[] = [];
  if (lps.length > 0) {
    const topVolLp = lps[0];
    if (topVolLp.avgScore != null && topVolLp.avgScore < globalAvgScore) {
      lpInsights.push(`${topVolLp.label} tem mais volume mas score abaixo da média (${topVolLp.avgScore} vs ${Math.round(globalAvgScore)})`);
    }
    const bestQual = [...lps].sort((a, b) => b.qualifiedPct - a.qualifiedPct)[0];
    if (bestQual && bestQual.qualifiedPct > 0) {
      lpInsights.push(`${bestQual.label} tem a melhor taxa de qualificação (${bestQual.qualifiedPct}%)`);
    }
  }

  // Insights
  const insights: Insight[] = [];

  if (lps.length > 0) {
    const topVol = lps[0];
    if (topVol.avgScore != null && topVol.avgScore < globalAvgScore) {
      insights.push({
        type: "warning",
        icon: "AlertTriangle",
        text: `${topVol.label} tem mais leads mas score abaixo da média`,
        metric: `${topVol.avgScore} vs ${Math.round(globalAvgScore)} média`,
      });
    }

    const bestQual = [...lps].filter((l) => l.count >= 3).sort((a, b) => b.qualifiedPct - a.qualifiedPct)[0];
    if (bestQual && bestQual.qualifiedPct > 0) {
      insights.push({
        type: "success",
        icon: "TrendingUp",
        text: `${bestQual.label} tem a melhor taxa de qualificação`,
        metric: `${bestQual.qualifiedPct}% qualificados`,
      });
    }
  }

  if (platforms.length > 0) {
    const bestPlat = [...platforms].sort((a, b) => b.qualifiedPct - a.qualifiedPct)[0];
    if (bestPlat && bestPlat.qualifiedPct > 0) {
      insights.push({
        type: "info",
        icon: "BarChart3",
        text: `${bestPlat.label} gera mais leads qualificados`,
        metric: `${bestPlat.qualifiedPct}% qualificados`,
      });
    }
  }

  const noUtmCount = filtered.filter(
    (l) => !l.utmSource && !l.utmMedium && !l.utmCampaign && !l.utmContent,
  ).length;
  if (noUtmCount > 0) {
    const pct = Math.round((noUtmCount / Math.max(total, 1)) * 100);
    insights.push({
      type: "warning",
      icon: "LinkOff",
      text: `${noUtmCount} leads sem UTM (${pct}%)`,
      metric: `${pct}% sem rastreamento`,
    });
  }

  if (syncFailed > 0) {
    insights.push({
      type: "danger",
      icon: "XCircle",
      text: `${syncFailed} sincronizações falharam`,
      metric: `${syncFailed} falhas`,
      action: { label: "Ver detalhes", href: "/sync" },
    });
  }

  if (syncPending > 0) {
    insights.push({
      type: "warning",
      icon: "Clock",
      text: `${syncPending} sincronizações pendentes`,
      metric: `${syncPending} pendentes`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "success",
      icon: "CheckCircle",
      text: "Tudo em ordem! Nenhum problema detectado.",
    });
  }

  // Recent leads
  const recentLeads: RecentLead[] = recentRaw.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    utmSource: l.utmSource,
    utmMedium: l.utmMedium,
    utmCampaign: l.utmCampaign,
    utmContent: l.utmContent,
    utmTerm: l.utmTerm,
    paginaCaptura: l.paginaCaptura,
    pesquisa: l.pesquisa,
    grupo: l.grupo,
    score: l.score,
    grade: l.grade,
    status: l.status,
    receivedAt: l.receivedAt.toISOString(),
    origin: classifyOrigin(l.utmSource, l.utmMedium, l.utmContent),
    platform: classifyPlatform(l.utmSource, l.utmMedium, l.utmContent),
    placement: classifyPlacement(l.utmContent, l.utmTerm, l.utmSource, l.utmMedium),
    utmStatus: classifyUtmStatus(l.utmSource, l.utmMedium, l.utmCampaign, l.utmContent),
    sourceName: l.source.name,
    syncLogs: l.syncLogs.map((s) => ({
      status: s.status,
      destination: s.destination,
      error: s.error,
      attemptedAt: s.attemptedAt.toISOString(),
    })),
  }));

  // ── Origin Analysis with recommendations ─────────────────────────
  const globalAvg = avgScoreVal ?? 0;
  const maxOriginCount = Math.max(...origins.map(o => o.count), 1);

  const originAnalysis: OriginAnalysis[] = origins.map(o => {
    const scores: number[] = [];
    const platCounts = new Map<string, number>();
    const utmSources = new Map<string, number>();
    const utmMediums = new Map<string, number>();
    let weakCount = 0;

    for (const l of filtered) {
      const orig = classifyOrigin(l.utmSource, l.utmMedium, l.utmContent);
      if (orig !== o.label) continue;
      if (l.score != null) scores.push(l.score);
      if (isWeak(l.grade, l.score)) weakCount++;
      const plat = classifyPlatform(l.utmSource, l.utmMedium, l.utmContent);
      platCounts.set(plat, (platCounts.get(plat) ?? 0) + 1);
      if (l.utmSource) utmSources.set(l.utmSource, (utmSources.get(l.utmSource) ?? 0) + 1);
      if (l.utmMedium) utmMediums.set(l.utmMedium, (utmMediums.get(l.utmMedium) ?? 0) + 1);
    }

    const med = median(scores);
    const weakPct = o.count > 0 ? Math.round((weakCount / o.count) * 100) : 0;
    const volNorm = (o.count / maxOriginCount) * 100;
    const scoreNorm = o.avgScore != null ? (o.avgScore / Math.max(globalAvg, 1)) * 50 : 0;
    const sampleBonus = o.count >= 10 ? 100 : o.count >= 5 ? 60 : o.count >= 3 ? 30 : 0;
    const decisionIndex = Math.round(volNorm * 0.35 + scoreNorm * 0.35 + o.qualifiedPct * 0.2 + sampleBonus * 0.1);

    const isNoUtm = o.label === "Sem classificação - sem UTM";
    let recommendation: OriginAnalysis["recommendation"];
    if (isNoUtm && o.count > 0) recommendation = "Corrigir UTM";
    else if (o.count < 3) recommendation = "Dados insuficientes";
    else if (decisionIndex >= 70 && o.qualifiedPct >= 40) recommendation = "Escalar";
    else if (decisionIndex >= 50) recommendation = "Manter";
    else if (o.count >= 5 && o.qualifiedPct < 30) recommendation = "Otimizar";
    else if (decisionIndex < 30) recommendation = "Pausar";
    else recommendation = "Manter";

    let status: OriginAnalysis["status"];
    if (o.count < 3) status = "insufficient";
    else if (o.avgScore != null && o.avgScore > globalAvg && o.qualifiedPct >= 40) status = "high";
    else if (o.avgScore != null && o.avgScore < globalAvg * 0.7 || weakPct > 50) status = "low";
    else if (weakPct > 30 || o.qualifiedPct < 25) status = "attention";
    else status = "stable";

    return {
      label: o.label,
      count: o.count,
      pct: o.pct,
      avgScore: o.avgScore,
      medianScore: med,
      qualifiedPct: o.qualifiedPct,
      weakPct,
      topGrade: o.topGrade,
      topCampaign: o.topCampaign,
      topPage: o.topPage,
      lastLead: o.lastLead,
      grades: o.grades,
      daily: o.daily,
      decisionIndex,
      recommendation,
      status,
      platforms: [...platCounts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topUtmSource: topOf(utmSources),
      topUtmMedium: topOf(utmMediums),
    };
  });

  // ── UTM Quality ─────────────────────────────────────────────────
  const utmCampaignSet = new Set<string>();
  const utmSourceSet = new Set<string>();
  const utmMediumSet = new Set<string>();
  const utmContentSet = new Set<string>();
  const utmTermSet = new Set<string>();
  let utmComplete = 0, utmPartial = 0, utmNone = 0;

  type UtmKey = string;
  const utmRowMap = new Map<UtmKey, {
    utmSource: string; utmMedium: string; utmCampaign: string;
    utmContent: string; utmTerm: string;
    count: number; scoreSum: number; scoreCount: number;
    grades: Map<string, number>; lps: Map<string, number>;
    lastLead: Date | null;
  }>();

  for (const l of filtered) {
    const src = l.utmSource ?? "";
    const med2 = l.utmMedium ?? "";
    const camp = l.utmCampaign ?? "";
    const cont = l.utmContent ?? "";
    const term = l.utmTerm ?? "";

    if (src) utmSourceSet.add(src);
    if (med2) utmMediumSet.add(med2);
    if (camp) utmCampaignSet.add(camp);
    if (cont) utmContentSet.add(cont);
    if (term) utmTermSet.add(term);

    const hasSource = !!src;
    const hasMedium = !!med2;
    const hasCampaign = !!camp;

    if (hasSource && hasMedium && hasCampaign) utmComplete++;
    else if (hasSource || hasMedium || hasCampaign) utmPartial++;
    else utmNone++;

    const key = `${src}|||${med2}|||${camp}|||${cont}|||${term}`;
    if (!utmRowMap.has(key)) {
      utmRowMap.set(key, {
        utmSource: src || "(vazio)", utmMedium: med2 || "(vazio)",
        utmCampaign: camp || "(vazio)", utmContent: cont || "(vazio)",
        utmTerm: term || "(vazio)",
        count: 0, scoreSum: 0, scoreCount: 0,
        grades: new Map(), lps: new Map(), lastLead: null,
      });
    }
    const row = utmRowMap.get(key)!;
    row.count++;
    if (l.score != null) { row.scoreSum += l.score; row.scoreCount++; }
    const rg = l.grade ?? "none";
    row.grades.set(rg, (row.grades.get(rg) ?? 0) + 1);
    const rlp = normalizeLp(l.paginaCaptura);
    row.lps.set(rlp, (row.lps.get(rlp) ?? 0) + 1);
    if (!row.lastLead || l.receivedAt > row.lastLead) row.lastLead = l.receivedAt;
  }

  const utmRows: UtmRow[] = [...utmRowMap.values()]
    .map(r => {
      const hasS = r.utmSource !== "(vazio)";
      const hasM = r.utmMedium !== "(vazio)";
      const hasC = r.utmCampaign !== "(vazio)";
      let utmStatus: UtmRow["utmStatus"];
      if (hasS && hasM && hasC) utmStatus = "Completa";
      else if (hasS || hasM || hasC) utmStatus = "Parcial";
      else utmStatus = "Sem UTM";
      return {
        utmSource: r.utmSource,
        utmMedium: r.utmMedium,
        utmCampaign: r.utmCampaign,
        utmContent: r.utmContent,
        utmTerm: r.utmTerm,
        leads: r.count,
        pct: total > 0 ? Math.round((r.count / total) * 100) : 0,
        avgScore: r.scoreCount > 0 ? Math.round(r.scoreSum / r.scoreCount) : null,
        topGrade: topOf(r.grades),
        topLp: topOf(r.lps),
        lastLead: r.lastLead?.toISOString() ?? null,
        utmStatus,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  const utmQuality: UtmQuality = {
    complete: utmComplete,
    partial: utmPartial,
    none: utmNone,
    completePct: total > 0 ? Math.round((utmComplete / total) * 100) : 0,
    partialPct: total > 0 ? Math.round((utmPartial / total) * 100) : 0,
    nonePct: total > 0 ? Math.round((utmNone / total) * 100) : 0,
    uniqueCampaigns: utmCampaignSet.size,
    uniqueSources: utmSourceSet.size,
    uniqueMediums: utmMediumSet.size,
    uniqueContents: utmContentSet.size,
    uniqueTerms: utmTermSet.size,
    rows: utmRows.slice(0, 50),
  };

  // ── Origin Insights ─────────────────────────────────────────────
  const originInsights: OriginInsight[] = [];

  if (originAnalysis.length > 0) {
    const top = originAnalysis[0];
    if (top.count > 0) {
      originInsights.push({
        type: "info", icon: "BarChart3",
        text: `${top.label} concentra ${top.pct}% dos leads no período.`,
        metric: `${top.count} leads`,
      });
    }

    const bestQualOrigin = [...originAnalysis]
      .filter(o => o.count >= 3 && o.avgScore != null)
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0];
    if (bestQualOrigin && bestQualOrigin.avgScore != null) {
      originInsights.push({
        type: "success", icon: "TrendingUp",
        text: `${bestQualOrigin.label} tem o melhor leadscore médio entre as origens.`,
        metric: `Score ${bestQualOrigin.avgScore}`,
      });
    }

    const noUtmOrigin = originAnalysis.find(o => o.label === "Sem classificação - sem UTM");
    if (noUtmOrigin && noUtmOrigin.count > 0) {
      originInsights.push({
        type: "warning", icon: "AlertTriangle",
        text: `${noUtmOrigin.count} leads sem UTM (${noUtmOrigin.pct}%) — parte pode estar sem rastreamento.`,
        metric: `${noUtmOrigin.pct}% sem classificação`,
      });
    }

    if (utmPartial > 0) {
      originInsights.push({
        type: "warning", icon: "AlertTriangle",
        text: `${utmPartial} leads com UTM parcial — campos incompletos.`,
        metric: `${Math.round((utmPartial / Math.max(total, 1)) * 100)}% parcial`,
      });
    }

    const toScale = originAnalysis.filter(o => o.recommendation === "Escalar");
    if (toScale.length > 0) {
      originInsights.push({
        type: "success", icon: "CheckCircle",
        text: `${toScale.map(o => o.label).join(", ")} recomendada(s) para escalar.`,
      });
    }

    const toPause = originAnalysis.filter(o => o.recommendation === "Pausar");
    if (toPause.length > 0) {
      originInsights.push({
        type: "danger", icon: "XCircle",
        text: `${toPause.map(o => o.label).join(", ")} recomendada(s) para pausar.`,
      });
    }

    const bestPlacement = [...placements]
      .filter(p => p.count >= 2 && p.avgScore != null)
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0];
    if (bestPlacement) {
      originInsights.push({
        type: "info", icon: "BarChart3",
        text: `${bestPlacement.label} tem maior leadscore médio entre os posicionamentos.`,
        metric: `Score ${bestPlacement.avgScore}`,
      });
    }
  }

  if (originInsights.length === 0) {
    originInsights.push({
      type: "info", icon: "Info",
      text: "Dados insuficientes para gerar insights de origem.",
    });
  }

  // ── Origin UTM Tables (per-origin, per-dimension) ───────────────
  type DimAccum = { scoreSum: number; scoreCount: number; qualified: number; grades: GradeDistribution; count: number };
  function newDimAccum(): DimAccum {
    return { scoreSum: 0, scoreCount: 0, qualified: 0, grades: { A: 0, B: 0, C: 0, D: 0, none: 0 }, count: 0 };
  }
  function addToDim(d: DimAccum, score: number | null, grade: string | null) {
    d.count++;
    if (score != null) { d.scoreSum += score; d.scoreCount++; }
    if (isQualified(grade, score)) d.qualified++;
    const g = (grade as keyof GradeDistribution) ?? "none";
    if (g in d.grades) d.grades[g]++; else d.grades.none++;
  }
  function finalizeDimRow(value: string, d: DimAccum, totalCount: number, globalAvgScore2: number): UtmDimRow {
    const avg = d.scoreCount > 0 ? Math.round(d.scoreSum / d.scoreCount) : null;
    const qualPct = d.count > 0 ? Math.round((d.qualified / d.count) * 100) : 0;
    const weakCount = d.grades.D;
    const weakPct2 = d.count > 0 ? Math.round((weakCount / d.count) * 100) : 0;
    let status: UtmDimRow["status"];
    if (d.count < 3) status = "insufficient";
    else if (avg != null && avg > globalAvgScore2 && qualPct >= 40) status = "high";
    else if (avg != null && avg < globalAvgScore2 * 0.7 || weakPct2 > 50) status = "low";
    else if (weakPct2 > 30 || qualPct < 25) status = "attention";
    else status = "stable";
    return {
      value,
      leads: d.count,
      pct: totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0,
      status,
      qualifiedCount: d.qualified,
      qualifiedPct: qualPct,
      avgScore: avg,
      grades: { ...d.grades },
      gradePcts: {
        A: d.count > 0 ? Math.round((d.grades.A / d.count) * 100) : 0,
        B: d.count > 0 ? Math.round((d.grades.B / d.count) * 100) : 0,
        C: d.count > 0 ? Math.round((d.grades.C / d.count) * 100) : 0,
        D: d.count > 0 ? Math.round((d.grades.D / d.count) * 100) : 0,
        none: d.count > 0 ? Math.round((d.grades.none / d.count) * 100) : 0,
      },
    };
  }

  const perOriginDims = new Map<string, {
    sources: Map<string, DimAccum>;
    mediums: Map<string, DimAccum>;
    campaigns: Map<string, DimAccum>;
    contents: Map<string, DimAccum>;
    terms: Map<string, DimAccum>;
    totals: DimAccum;
  }>();

  // Also build an "all" entry
  const ALL_KEY = "__all__";

  for (const l of filtered) {
    const origin = classifyOrigin(l.utmSource, l.utmMedium, l.utmContent);
    for (const key of [origin, ALL_KEY]) {
      if (!perOriginDims.has(key)) {
        perOriginDims.set(key, {
          sources: new Map(), mediums: new Map(), campaigns: new Map(),
          contents: new Map(), terms: new Map(), totals: newDimAccum(),
        });
      }
      const od = perOriginDims.get(key)!;
      addToDim(od.totals, l.score, l.grade);

      const src = l.utmSource || "(vazio)";
      if (!od.sources.has(src)) od.sources.set(src, newDimAccum());
      addToDim(od.sources.get(src)!, l.score, l.grade);

      const med3 = l.utmMedium || "(vazio)";
      if (!od.mediums.has(med3)) od.mediums.set(med3, newDimAccum());
      addToDim(od.mediums.get(med3)!, l.score, l.grade);

      const camp = l.utmCampaign || "(vazio)";
      if (!od.campaigns.has(camp)) od.campaigns.set(camp, newDimAccum());
      addToDim(od.campaigns.get(camp)!, l.score, l.grade);

      const cont = l.utmContent || "(vazio)";
      if (!od.contents.has(cont)) od.contents.set(cont, newDimAccum());
      addToDim(od.contents.get(cont)!, l.score, l.grade);

      const trm = l.utmTerm || "(vazio)";
      if (!od.terms.has(trm)) od.terms.set(trm, newDimAccum());
      addToDim(od.terms.get(trm)!, l.score, l.grade);
    }
  }

  const originUtmTables: Record<string, OriginUtmTables> = {};
  for (const [originKey, od] of perOriginDims) {
    const t = od.totals;
    const tCount = t.count;
    const finDim = (m: Map<string, DimAccum>) =>
      [...m.entries()]
        .map(([v, d]) => finalizeDimRow(v, d, tCount, globalAvg))
        .sort((a, b) => b.leads - a.leads);

    originUtmTables[originKey] = {
      sources: finDim(od.sources),
      mediums: finDim(od.mediums),
      campaigns: finDim(od.campaigns),
      contents: finDim(od.contents),
      terms: finDim(od.terms),
      totals: {
        leads: tCount,
        qualifiedCount: t.qualified,
        qualifiedPct: tCount > 0 ? Math.round((t.qualified / tCount) * 100) : 0,
        grades: { ...t.grades },
        gradePcts: {
          A: tCount > 0 ? Math.round((t.grades.A / tCount) * 100) : 0,
          B: tCount > 0 ? Math.round((t.grades.B / tCount) * 100) : 0,
          C: tCount > 0 ? Math.round((t.grades.C / tCount) * 100) : 0,
          D: tCount > 0 ? Math.round((t.grades.D / tCount) * 100) : 0,
          none: tCount > 0 ? Math.round((t.grades.none / tCount) * 100) : 0,
        },
      },
    };
  }

  // ── Survey Data ──────────────────────────────────────────────────
  const surveyLeads = filtered.filter(l => l.answers && typeof l.answers === "object" && Object.keys(l.answers as object).length > 0);
  const surveyTotal = surveyLeads.length;
  const surveyScores = surveyLeads.filter(l => l.score != null).map(l => l.score!);
  const surveyAvgScore = surveyScores.length > 0 ? Math.round(surveyScores.reduce((a, b) => a + b, 0) / surveyScores.length) : null;
  const surveyMedianScore = median(surveyScores);
  const surveyQualified = surveyLeads.filter(l => isQualified(l.grade, l.score)).length;
  const surveyGrades: GradeDistribution = { A: 0, B: 0, C: 0, D: 0, none: 0 };
  for (const l of surveyLeads) {
    const sg = (l.grade as keyof GradeDistribution) ?? "none";
    if (sg in surveyGrades) surveyGrades[sg]++; else surveyGrades.none++;
  }
  const surveyGradePcts: GradeDistribution = {
    A: surveyTotal > 0 ? Math.round((surveyGrades.A / surveyTotal) * 100) : 0,
    B: surveyTotal > 0 ? Math.round((surveyGrades.B / surveyTotal) * 100) : 0,
    C: surveyTotal > 0 ? Math.round((surveyGrades.C / surveyTotal) * 100) : 0,
    D: surveyTotal > 0 ? Math.round((surveyGrades.D / surveyTotal) * 100) : 0,
    none: surveyTotal > 0 ? Math.round((surveyGrades.none / surveyTotal) * 100) : 0,
  };
  const surveyTopGrade = (() => {
    let best: string | null = null; let max = 0;
    for (const [k, v] of Object.entries(surveyGrades)) { if (k !== "none" && v > max) { max = v; best = k; } }
    return best;
  })();

  // Per-question stats
  type AnswerAccum = { count: number; scores: number[]; qualified: number; grades: GradeDistribution };
  const questionStats: SurveyQuestionStats[] = [];
  const allAnswerRows: SurveyQualityRow[] = [];

  for (const qKey of SURVEY_QUESTION_KEYS) {
    const answerMap = new Map<string, AnswerAccum>();
    let totalResp = 0;
    for (const l of surveyLeads) {
      const ans = (l.answers as Record<string, unknown>)?.[qKey];
      if (ans == null || String(ans).trim() === "") continue;
      const val = String(ans).trim();
      totalResp++;
      if (!answerMap.has(val)) answerMap.set(val, { count: 0, scores: [], qualified: 0, grades: { A: 0, B: 0, C: 0, D: 0, none: 0 } });
      const a = answerMap.get(val)!;
      a.count++;
      if (l.score != null) a.scores.push(l.score);
      if (isQualified(l.grade, l.score)) a.qualified++;
      const ag = (l.grade as keyof GradeDistribution) ?? "none";
      if (ag in a.grades) a.grades[ag]++; else a.grades.none++;
    }

    const answers: SurveyAnswerStats[] = [...answerMap.entries()]
      .map(([val, a]) => {
        const avg = a.scores.length > 0 ? Math.round(a.scores.reduce((s, v2) => s + v2, 0) / a.scores.length) : null;
        const med4 = median(a.scores);
        const qualPct = a.count > 0 ? Math.round((a.qualified / a.count) * 100) : 0;
        let tg: string | null = null; let mx = 0;
        for (const [k, v2] of Object.entries(a.grades)) { if (k !== "none" && v2 > mx) { mx = v2; tg = k; } }
        return {
          value: val,
          count: a.count,
          pct: totalResp > 0 ? Math.round((a.count / totalResp) * 100) : 0,
          avgScore: avg,
          medianScore: med4,
          qualifiedPct: qualPct,
          grades: { ...a.grades },
          gradePcts: {
            A: a.count > 0 ? Math.round((a.grades.A / a.count) * 100) : 0,
            B: a.count > 0 ? Math.round((a.grades.B / a.count) * 100) : 0,
            C: a.count > 0 ? Math.round((a.grades.C / a.count) * 100) : 0,
            D: a.count > 0 ? Math.round((a.grades.D / a.count) * 100) : 0,
            none: a.count > 0 ? Math.round((a.grades.none / a.count) * 100) : 0,
          },
          topGrade: tg,
        };
      })
      .sort((a, b) => b.count - a.count);

    questionStats.push({
      key: qKey,
      label: SURVEY_QUESTION_LABELS[qKey] ?? qKey,
      answers,
      totalResponses: totalResp,
    });

    // Build quality rows for each answer
    for (const a of answers) {
      const smallSample = a.count < 5;
      let recommendation = "Dados insuficientes";
      if (!smallSample) {
        if (a.avgScore != null && a.avgScore >= 80 && a.qualifiedPct >= 50) recommendation = "Usar na copy";
        else if (a.avgScore != null && a.avgScore >= 70 && a.qualifiedPct >= 35) recommendation = "Segmentar";
        else if (a.avgScore != null && a.avgScore >= 60) recommendation = "Nutrir";
        else if (a.avgScore != null && a.avgScore < 50) recommendation = "Evitar priorizar";
        else recommendation = "Revisar promessa";
      }
      allAnswerRows.push({
        question: SURVEY_QUESTION_LABELS[qKey] ?? qKey,
        answer: a.value,
        leads: a.count,
        pct: a.pct,
        avgScore: a.avgScore,
        medianScore: a.medianScore,
        pctA: a.gradePcts.A,
        pctB: a.gradePcts.B,
        qualifiedPct: a.qualifiedPct,
        topGrade: a.topGrade,
        recommendation,
        smallSample,
      });
    }
  }

  // Best/worst answers (sorted, min 3 leads)
  const validRows = allAnswerRows.filter(r => r.leads >= 3 && r.avgScore != null);
  const bestAnswers = [...validRows].sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0)).slice(0, 15);
  const worstAnswers = [...validRows].sort((a, b) => (a.avgScore ?? 0) - (b.avgScore ?? 0)).slice(0, 10);

  // Score distribution histogram
  const scoreBuckets = [
    { label: "0 a 29", min: 0, max: 29 },
    { label: "30 a 49", min: 30, max: 49 },
    { label: "50 a 69", min: 50, max: 69 },
    { label: "70 a 84", min: 70, max: 84 },
    { label: "85 a 100", min: 85, max: 100 },
  ];
  const scoreDistribution = scoreBuckets.map(b => {
    const count = surveyScores.filter(s => s >= b.min && s <= b.max).length;
    return { label: b.label, count, pct: surveyScores.length > 0 ? Math.round((count / surveyScores.length) * 100) : 0 };
  });

  // Daily survey stats
  const surveyDailyMap = new Map<string, { responses: number; scoreSum: number; scoreCount: number; qualified: number }>();
  for (const day of allDays) surveyDailyMap.set(day, { responses: 0, scoreSum: 0, scoreCount: 0, qualified: 0 });
  for (const l of surveyLeads) {
    const day = brtDay(l.receivedAt);
    const sd = surveyDailyMap.get(day);
    if (sd) {
      sd.responses++;
      if (l.score != null) { sd.scoreSum += l.score; sd.scoreCount++; }
      if (isQualified(l.grade, l.score)) sd.qualified++;
    }
  }
  const surveyDaily: SurveyDailyPoint[] = allDays.map(d => {
    const sd = surveyDailyMap.get(d)!;
    return {
      label: dayLabel(d),
      responses: sd.responses,
      avgScore: sd.scoreCount > 0 ? Math.round(sd.scoreSum / sd.scoreCount) : null,
      qualifiedCount: sd.qualified,
    };
  });

  // Best profile (answer with highest avg score, min 5 leads)
  const bestProfile = validRows.filter(r => r.leads >= 5).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0] ?? null;

  // Most decisive question (highest score spread between best and worst answer)
  const mostDecisiveQuestion = (() => {
    let best: { label: string; spread: number } | null = null;
    for (const q of questionStats) {
      const scored = q.answers.filter(a => a.avgScore != null && a.count >= 3);
      if (scored.length < 2) continue;
      const scores2 = scored.map(a => a.avgScore!);
      const spread = Math.max(...scores2) - Math.min(...scores2);
      if (!best || spread > best.spread) best = { label: q.label, spread: Math.round(spread) };
    }
    return best;
  })();

  // Survey insights
  const surveyInsights: SurveyInsight[] = [];
  if (surveyTotal > 0) {
    // Best age group
    const idadeQ = questionStats.find(q => q.key === "idade");
    if (idadeQ) {
      const bestAge = idadeQ.answers.filter(a => a.count >= 5 && a.avgScore != null).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0];
      if (bestAge) surveyInsights.push({ type: "success", icon: "TrendingUp", text: `${bestAge.value} tem o maior leadscore médio.`, metric: `Leadscore médio: ${bestAge.avgScore} | ${bestAge.pct}% do total` });
    }
    // Best tempo_esquadrao
    const tempoQ = questionStats.find(q => q.key === "tempo_esquadrao");
    if (tempoQ) {
      const bestTempo = tempoQ.answers.filter(a => a.count >= 5 && a.avgScore != null).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0];
      if (bestTempo) surveyInsights.push({ type: "success", icon: "TrendingUp", text: `Leads que conhecem o Esquadrão "${bestTempo.value}" são os mais qualificados.`, metric: `Leadscore médio: ${bestTempo.avgScore} | ${bestTempo.pct}% do total` });
    }
    // Best renda
    const rendaQ = questionStats.find(q => q.key === "renda");
    if (rendaQ) {
      const bestRenda = rendaQ.answers.filter(a => a.count >= 5 && a.avgScore != null).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0];
      if (bestRenda) surveyInsights.push({ type: "info", icon: "BarChart3", text: `${bestRenda.value} concentra ${bestRenda.qualifiedPct}% dos leads qualificados.`, metric: `Leads qualificados: ${bestRenda.grades.A + bestRenda.grades.B} | ${bestRenda.pct}% do total` });
    }
    // Majority grade
    if (surveyGradePcts.C >= 40) surveyInsights.push({ type: "warning", icon: "AlertTriangle", text: `A maioria dos leads (${surveyGradePcts.C}%) está na faixa C.`, metric: "Oportunidade de nutrição antes da oferta." });
    else if (surveyGradePcts.D >= 30) surveyInsights.push({ type: "danger", icon: "XCircle", text: `${surveyGradePcts.D}% dos leads estão na faixa D (fracos).`, metric: "Revisar segmentação e fonte de tráfego." });
    // estudou_tribunal
    const tribunalQ = questionStats.find(q => q.key === "estudou_tribunal");
    if (tribunalQ) {
      const nuncaEstudou = tribunalQ.answers.find(a => a.value.toLowerCase().includes("não") || a.value.toLowerCase().includes("nunca"));
      if (nuncaEstudou && nuncaEstudou.count >= 5) surveyInsights.push({ type: "warning", icon: "AlertTriangle", text: `Leads que nunca estudaram para tribunal têm leadscore mais baixo.`, metric: `Leadscore médio: ${nuncaEstudou.avgScore} | ${nuncaEstudou.pct}% do total` });
    }
    // situacao best
    const situacaoQ = questionStats.find(q => q.key === "situacao");
    if (situacaoQ) {
      const bestSit = situacaoQ.answers.filter(a => a.count >= 5 && a.avgScore != null).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0];
      if (bestSit) surveyInsights.push({ type: "info", icon: "BarChart3", text: `O público "${bestSit.value}" concentra a maior intenção de compra.`, metric: `Leadscore médio: ${bestSit.avgScore} | ${bestSit.qualifiedPct}% qualificados` });
    }
  }
  if (surveyInsights.length === 0 && surveyTotal > 0) {
    surveyInsights.push({ type: "info", icon: "Info", text: "Dados insuficientes para gerar insights detalhados da pesquisa." });
  }

  // Survey leads for table
  const surveyLeadRows: SurveyLeadRow[] = surveyLeads.slice(0, 100).map(l => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    score: l.score,
    grade: l.grade,
    receivedAt: l.receivedAt.toISOString(),
    answers: (() => {
      const raw = (l.answers as Record<string, unknown>) ?? {};
      const mapped: Record<string, string> = {};
      for (const k of SURVEY_QUESTION_KEYS) { mapped[k] = raw[k] != null ? String(raw[k]) : ""; }
      return mapped;
    })(),
    utmSource: l.utmSource,
    utmCampaign: l.utmCampaign,
    utmMedium: l.utmMedium,
    utmContent: l.utmContent,
    utmTerm: l.utmTerm,
    paginaCaptura: l.paginaCaptura,
    origin: classifyOrigin(l.utmSource, l.utmMedium, l.utmContent),
    platform: classifyPlatform(l.utmSource, l.utmMedium, l.utmContent),
  }));

  // Survey filter options
  const surveyUtmSources = new Set<string>();
  const surveyUtmCampaigns = new Set<string>();
  const surveyUtmMediums = new Set<string>();
  const surveyUtmContents = new Set<string>();
  const surveyLps = new Set<string>();
  const surveyGradeSet = new Set<string>();
  for (const l of surveyLeads) {
    if (l.utmSource) surveyUtmSources.add(l.utmSource);
    if (l.utmCampaign) surveyUtmCampaigns.add(l.utmCampaign);
    if (l.utmMedium) surveyUtmMediums.add(l.utmMedium);
    if (l.utmContent) surveyUtmContents.add(l.utmContent);
    if (l.paginaCaptura) surveyLps.add(normalizeLp(l.paginaCaptura));
    if (l.grade) surveyGradeSet.add(l.grade);
  }

  const surveyData: SurveyData = {
    totalResponses: surveyTotal,
    responseRate: total > 0 ? Math.round((surveyTotal / total) * 100) : 0,
    qualifiedCount: surveyQualified,
    avgScore: surveyAvgScore,
    medianScore: surveyMedianScore,
    topGrade: surveyTopGrade,
    grades: surveyGrades,
    gradePcts: surveyGradePcts,
    questions: questionStats,
    bestAnswers,
    worstAnswers,
    insights: surveyInsights,
    daily: surveyDaily,
    scoreDistribution,
    leads: surveyLeadRows,
    filterOptions: {
      utmSources: [...surveyUtmSources].sort(),
      utmCampaigns: [...surveyUtmCampaigns].sort(),
      utmMediums: [...surveyUtmMediums].sort(),
      utmContents: [...surveyUtmContents].sort(),
      lps: [...surveyLps].sort(),
      grades: [...surveyGradeSet].sort(),
    },
    bestProfile: bestProfile ? { label: `${bestProfile.answer}`, avgScore: bestProfile.avgScore ?? 0 } : null,
    mostDecisiveQuestion,
  };

  return {
    totalLeads: total,
    totalDelta: pctChange(total, prevFiltered.length),
    qualifiedLeads: qualifiedCount,
    qualifiedDelta: pctChange(qualifiedCount, prevQualified),
    avgScore: avgScoreVal,
    avgScoreDelta: pctChange(avgScoreVal ?? 0, prevAvgScore ?? 0),
    qualificationRate: total > 0 ? Math.round((qualifiedCount / total) * 100) : 0,
    grades,
    gradePcts,
    noScoreCount: grades.none,
    sync: {
      total: syncTotal,
      synced,
      pending: syncPending,
      failed: syncFailed,
      syncPct: syncTotal > 0 ? Math.round((synced / syncTotal) * 100) : 0,
    },
    dailyChart,
    origins,
    platforms,
    placements,
    lps,
    lpInsights,
    insights,
    recentLeads,
    periodDays: days,
    lastUpdate: now.toISOString(),
    sources,
    filterOptions: {
      campaigns: [...campaignSet].sort(),
      sources: sources.map((s) => s.slug),
      platforms: [...platformSet].sort(),
    },
    originAnalysis,
    utmQuality,
    originInsights,
    originUtmTables,
    surveyData,
  };
}
