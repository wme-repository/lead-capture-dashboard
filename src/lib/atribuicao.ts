import { prisma } from "@/lib/prisma";

const BRT_MS = 3 * 60 * 60 * 1000;
function brtDay(d: Date) {
  return new Date(d.getTime() - BRT_MS).toISOString().slice(0, 10);
}
function dayLabel(k: string) {
  const [, m, d] = k.split("-");
  return `${d}/${m}`;
}

/* ================================================================
   Classification helpers
   ================================================================ */
function lc(v: string | null | undefined): string {
  return (v ?? "").toLowerCase().trim();
}

function has(v: string, ...needles: string[]) {
  const l = lc(v);
  return needles.some((n) => l.includes(n));
}

export type MacroOrigin =
  | "Meta Ads"
  | "Orgânico"
  | "Sem classificação - sem UTM"
  | "Google"
  | "WhatsApp"
  | "Referral"
  | "Não identificado";

export function classifyOrigin(
  utmSource: string | null,
  utmMedium: string | null,
  utmContent: string | null
): MacroOrigin {
  const src = lc(utmSource);
  const med = lc(utmMedium);

  if (
    has(src, "meta", "facebook", "instagram", "fb", "ig") ||
    has(med, "paid_social", "cpc", "ads", "pago", "paidsocial")
  )
    return "Meta Ads";

  if (has(src, "google") || has(med, "cpc", "ppc", "search")) return "Google";
  if (has(src, "whatsapp", "wa") || has(med, "whatsapp")) return "WhatsApp";

  if (
    has(med, "organic", "orgânico", "organico", "social") ||
    (has(src, "instagram", "facebook") && !has(med, "cpc", "paid", "ads", "pago"))
  )
    return "Orgânico";

  if (has(med, "referral") || (src && !med)) return "Referral";

  if (!src && !med) return "Sem classificação - sem UTM";

  return "Não identificado";
}

export type Platform =
  | "Instagram"
  | "Facebook"
  | "Google"
  | "WhatsApp"
  | "Sem classificação - sem UTM"
  | "Orgânico"
  | "Referral"
  | "Não identificado";

export function classifyPlatform(
  utmSource: string | null,
  utmMedium: string | null,
  utmContent: string | null
): Platform {
  const src = lc(utmSource);
  const cnt = lc(utmContent);

  if (has(src, "instagram", "ig", "insta") || has(cnt, "instagram", "ig", "insta"))
    return "Instagram";
  if (has(src, "facebook", "fb") || has(cnt, "facebook", "fb")) return "Facebook";
  if (has(src, "google")) return "Google";
  if (has(src, "whatsapp", "wa")) return "WhatsApp";

  const origin = classifyOrigin(utmSource, utmMedium, utmContent);
  if (origin === "Meta Ads") return "Facebook";
  if (origin === "Orgânico") return "Orgânico";
  if (origin === "Sem classificação - sem UTM") return "Sem classificação - sem UTM";
  if (origin === "Referral") return "Referral";

  return "Não identificado";
}

export type Placement = string;

const PLACEMENT_MAP: [string[], string][] = [
  [["instagram_stories", "ig_stories", "stories_instagram", "insta_stories"], "Instagram Stories"],
  [["instagram_feed", "ig_feed", "feed_instagram", "insta_feed"], "Instagram Feed"],
  [["instagram_reels", "ig_reels", "reels_instagram", "insta_reels"], "Instagram Reels"],
  [["instagram_explore", "ig_explore"], "Instagram Explore"],
  [["facebook_feed", "fb_feed", "feed_facebook"], "Facebook Feed"],
  [["facebook_stories", "fb_stories", "stories_facebook"], "Facebook Stories"],
  [["facebook_reels", "fb_reels", "reels_facebook"], "Facebook Reels"],
  [["facebook_marketplace", "fb_marketplace"], "Facebook Marketplace"],
  [["audience_network", "an_"], "Audience Network"],
  [["pesquisa_google", "google_search", "search"], "Pesquisa Google"],
  [["bio", "link_bio", "instagram_bio", "linkbio"], "Link da bio"],
  [["whatsapp", "wa_"], "WhatsApp"],
];

export function classifyPlacement(
  utmContent: string | null,
  utmTerm: string | null,
  utmSource: string | null,
  utmMedium: string | null
): Placement {
  const fields = [lc(utmContent), lc(utmTerm)];
  for (const val of fields) {
    if (!val) continue;
    for (const [keys, label] of PLACEMENT_MAP) {
      if (keys.some((k) => val.includes(k))) return label;
    }
    if (val.includes("stories")) {
      const plat = classifyPlatform(utmSource, utmMedium, utmContent);
      if (plat === "Instagram") return "Instagram Stories";
      if (plat === "Facebook") return "Facebook Stories";
    }
    if (val.includes("feed")) {
      const plat = classifyPlatform(utmSource, utmMedium, utmContent);
      if (plat === "Instagram") return "Instagram Feed";
      if (plat === "Facebook") return "Facebook Feed";
    }
    if (val.includes("reels")) {
      const plat = classifyPlatform(utmSource, utmMedium, utmContent);
      if (plat === "Instagram") return "Instagram Reels";
      if (plat === "Facebook") return "Facebook Reels";
    }
  }

  if (!utmContent && !utmTerm) {
    const origin = classifyOrigin(utmSource, utmMedium, utmContent);
    if (origin === "Sem classificação - sem UTM") return "Sem classificação - sem UTM";
  }

  return "Não identificado";
}

export type UtmStatus =
  | "Completa"
  | "Parcial"
  | "Sem campanha"
  | "Sem source"
  | "Sem medium"
  | "Sem content"
  | "Sem UTM";

export function classifyUtmStatus(
  src: string | null,
  med: string | null,
  camp: string | null,
  cnt: string | null
): UtmStatus {
  const hasAny = !!src || !!med || !!camp || !!cnt;
  if (!hasAny) return "Sem UTM";
  if (src && med && camp) return "Completa";
  if (!src) return "Sem source";
  if (!med) return "Sem medium";
  if (!camp) return "Sem campanha";
  if (!cnt) return "Sem content";
  return "Parcial";
}

/* ================================================================
   Types
   ================================================================ */
export type AttrLead = {
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
  receivedAt: string;
  origin: MacroOrigin;
  platform: Platform;
  placement: Placement;
  utmStatus: UtmStatus;
};

export type GroupStats = {
  label: string;
  count: number;
  pct: number;
  avgScore: number | null;
  topGrade: string | null;
  topCampaign: string | null;
  topPage: string | null;
  lastLead: string | null;
  grades: Record<string, number>;
};

export type DailyPoint = { label: string; series: Record<string, number> };

export type AttrSummary = {
  total: number;
  withUtm: number;
  withoutUtm: number;
  topOrigin: string | null;
  topPlatform: string | null;
  topPlacement: string | null;
  avgScore: number | null;
  bestQualityOrigin: string | null;
};

export type LpStats = {
  label: string;
  raw: string;
  count: number;
  pct: number;
  avgScore: number | null;
  medianScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  grades: Record<string, number>;
  qualifiedPct: number;
  weakPct: number;
  decisionIndex: number;
  recommendation: "Escalar" | "Manter" | "Otimizar" | "Pausar";
  topOrigin: string | null;
  topCampaign: string | null;
  lastLead: string | null;
  daily: { day: string; count: number }[];
  recentLeads: AttrLead[];
};

export type AttrData = {
  leads: AttrLead[];
  summary: AttrSummary;
  origins: GroupStats[];
  platforms: GroupStats[];
  placements: GroupStats[];
  utmCombos: UtmCombo[];
  dailyByOrigin: DailyPoint[];
  utmKpis: {
    complete: number;
    partial: number;
    noUtm: number;
    campaigns: number;
    sources: number;
    mediums: number;
    contents: number;
  };
  insights: string[];
  utmAlerts: string[];
  filterOptions: {
    campaigns: string[];
    sources: string[];
    platforms: string[];
  };
  lps: LpStats[];
  lpInsights: string[];
};

export type UtmCombo = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  count: number;
  pct: number;
  avgScore: number | null;
  topGrade: string | null;
  topPage: string | null;
  lastLead: string | null;
  status: UtmStatus;
};

/* ================================================================
   Main query
   ================================================================ */
export async function getAtribuicaoData(opts: {
  period: "7d" | "30d" | "90d";
  campaign?: string;
  source?: string;
  platform?: string;
}): Promise<AttrData> {
  const days = opts.period === "7d" ? 7 : opts.period === "30d" ? 30 : 90;
  const since = new Date(Date.now() - days * 864e5);

  const where: Record<string, unknown> = { receivedAt: { gte: since } };
  if (opts.campaign) where.utmCampaign = opts.campaign;
  if (opts.source) where.utmSource = opts.source;

  const rows = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
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

  const leads: AttrLead[] = rows.map((r) => ({
    ...r,
    receivedAt: r.receivedAt.toISOString(),
    origin: classifyOrigin(r.utmSource, r.utmMedium, r.utmContent),
    platform: classifyPlatform(r.utmSource, r.utmMedium, r.utmContent),
    placement: classifyPlacement(r.utmContent, r.utmTerm, r.utmSource, r.utmMedium),
    utmStatus: classifyUtmStatus(r.utmSource, r.utmMedium, r.utmCampaign, r.utmContent),
  }));

  // Filter by platform if requested (post-classification)
  const filtered = opts.platform
    ? leads.filter((l) => l.platform === opts.platform)
    : leads;

  const total = filtered.length;

  // Helper: build GroupStats from a key
  type Accum = { count: number; scores: number[]; grades: Map<string, number>; camps: Map<string, number>; pages: Map<string, number>; last: string | null };

  function buildGroups(key: "origin" | "platform" | "placement"): GroupStats[] {
    const map = new Map<string, Accum>();
    for (const l of filtered) {
      const label = l[key];
      const e: Accum = map.get(label) ?? { count: 0, scores: [], grades: new Map(), camps: new Map(), pages: new Map(), last: null };
      e.count++;
      if (l.score != null) e.scores.push(l.score);
      if (l.grade) e.grades.set(l.grade, (e.grades.get(l.grade) ?? 0) + 1);
      if (l.utmCampaign) e.camps.set(l.utmCampaign, (e.camps.get(l.utmCampaign) ?? 0) + 1);
      if (l.paginaCaptura) e.pages.set(l.paginaCaptura, (e.pages.get(l.paginaCaptura) ?? 0) + 1);
      if (!e.last || l.receivedAt > e.last) e.last = l.receivedAt;
      map.set(label, e);
    }
    return [...map.entries()]
      .map(([label, e]) => ({
        label,
        count: e.count,
        pct: total > 0 ? Math.round((e.count / total) * 100) : 0,
        avgScore: e.scores.length > 0 ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : null,
        topGrade: topKey(e.grades),
        topCampaign: topKey(e.camps),
        topPage: topKey(e.pages),
        lastLead: e.last,
        grades: Object.fromEntries(e.grades),
      }))
      .sort((a, b) => b.count - a.count);
  }

  const origins = buildGroups("origin");
  const platforms = buildGroups("platform");
  const placements = buildGroups("placement");

  // UTM combos
  type UtmAccum = { src: string; med: string; camp: string; cnt: string; term: string; count: number; scores: number[]; grades: Map<string, number>; pages: Map<string, number>; last: string | null; status: UtmStatus };
  const utmMap = new Map<string, UtmAccum>();
  for (const l of filtered) {
    const key = `${l.utmSource ?? ""}|${l.utmMedium ?? ""}|${l.utmCampaign ?? ""}|${l.utmContent ?? ""}|${l.utmTerm ?? ""}`;
    const e: UtmAccum = utmMap.get(key) ?? {
      src: l.utmSource ?? "",
      med: l.utmMedium ?? "",
      camp: l.utmCampaign ?? "",
      cnt: l.utmContent ?? "",
      term: l.utmTerm ?? "",
      count: 0,
      scores: [],
      grades: new Map(),
      pages: new Map(),
      last: null,
      status: l.utmStatus,
    };
    e.count++;
    if (l.score != null) e.scores.push(l.score);
    if (l.grade) e.grades.set(l.grade, (e.grades.get(l.grade) ?? 0) + 1);
    if (l.paginaCaptura) e.pages.set(l.paginaCaptura, (e.pages.get(l.paginaCaptura) ?? 0) + 1);
    if (!e.last || l.receivedAt > e.last) e.last = l.receivedAt;
    utmMap.set(key, e);
  }
  const utmCombos: UtmCombo[] = [...utmMap.values()]
    .map((e) => ({
      utmSource: e.src,
      utmMedium: e.med,
      utmCampaign: e.camp,
      utmContent: e.cnt,
      utmTerm: e.term,
      count: e.count,
      pct: total > 0 ? Math.round((e.count / total) * 100) : 0,
      avgScore: e.scores.length > 0 ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : null,
      topGrade: topKey(e.grades),
      topPage: topKey(e.pages),
      lastLead: e.last,
      status: e.status,
    }))
    .sort((a, b) => b.count - a.count);

  // Daily by origin
  const dailyMap = new Map<string, Record<string, number>>();
  for (const l of filtered) {
    const dk = brtDay(new Date(l.receivedAt));
    const entry = dailyMap.get(dk) ?? {};
    entry[l.origin] = (entry[l.origin] ?? 0) + 1;
    dailyMap.set(dk, entry);
  }
  const now = new Date();
  const dailyKeys: string[] = [];
  for (let i = Math.min(days, 30) - 1; i >= 0; i--)
    dailyKeys.push(brtDay(new Date(now.getTime() - i * 864e5)));
  const dailyByOrigin: DailyPoint[] = dailyKeys.map((k) => ({
    label: dayLabel(k),
    series: dailyMap.get(k) ?? {},
  }));

  // Summary
  const withUtm = filtered.filter((l) => l.utmStatus !== "Sem UTM").length;
  const allScores = filtered.filter((l) => l.score != null).map((l) => l.score!);
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;

  let bestQualityOrigin: string | null = null;
  let bestAvg = -1;
  for (const o of origins) {
    if (o.avgScore != null && o.avgScore > bestAvg && o.count >= 2) {
      bestAvg = o.avgScore;
      bestQualityOrigin = o.label;
    }
  }

  const summary: AttrSummary = {
    total,
    withUtm,
    withoutUtm: total - withUtm,
    topOrigin: origins[0]?.label ?? null,
    topPlatform: platforms[0]?.label ?? null,
    topPlacement: placements.filter((p) => p.label !== "Não identificado")[0]?.label ?? placements[0]?.label ?? null,
    avgScore,
    bestQualityOrigin,
  };

  // UTM KPIs
  const utmStatuses = filtered.map((l) => l.utmStatus);
  const utmKpis = {
    complete: utmStatuses.filter((s) => s === "Completa").length,
    partial: utmStatuses.filter((s) => s !== "Completa" && s !== "Sem UTM").length,
    noUtm: utmStatuses.filter((s) => s === "Sem UTM").length,
    campaigns: new Set(filtered.map((l) => l.utmCampaign).filter(Boolean)).size,
    sources: new Set(filtered.map((l) => l.utmSource).filter(Boolean)).size,
    mediums: new Set(filtered.map((l) => l.utmMedium).filter(Boolean)).size,
    contents: new Set(filtered.map((l) => l.utmContent).filter(Boolean)).size,
  };

  // Insights
  const insights: string[] = [];
  if (origins[0]) insights.push(`${origins[0].label} representa ${origins[0].pct}% dos leads no período.`);
  if (origins[1]) insights.push(`${origins[1].label} gerou ${origins[1].pct}% dos leads.`);
  if (summary.withoutUtm > 0) insights.push(`${summary.withoutUtm} lead${summary.withoutUtm > 1 ? "s" : ""} chegou sem UTM identificada.`);
  if (bestQualityOrigin) insights.push(`A melhor qualidade média veio de ${bestQualityOrigin}.`);
  const nocamp = filtered.filter((l) => l.utmSource && !l.utmCampaign).length;
  if (nocamp > 0) insights.push(`Há ${nocamp} lead${nocamp > 1 ? "s" : ""} com utm_source mas sem utm_campaign.`);

  // UTM Alerts
  const utmAlerts: string[] = [];
  const noCamp = filtered.filter((l) => l.utmSource && !l.utmCampaign).length;
  if (noCamp > 0) utmAlerts.push(`${noCamp} lead${noCamp > 1 ? "s" : ""} chegou sem utm_campaign.`);
  const noSrc = filtered.filter((l) => l.utmMedium && !l.utmSource).length;
  if (noSrc > 0) utmAlerts.push(`${noSrc} lead${noSrc > 1 ? "s" : ""} chegou sem utm_source.`);
  const noMed = filtered.filter((l) => l.utmSource && !l.utmMedium).length;
  if (noMed > 0) utmAlerts.push(`${noMed} lead${noMed > 1 ? "s" : ""} chegou sem utm_medium.`);
  const directCount = filtered.filter((l) => l.origin === "Sem classificação - sem UTM").length;
  if (directCount > 0) utmAlerts.push(`${directCount} lead${directCount > 1 ? "s" : ""} classificado${directCount > 1 ? "s" : ""} como Direto por ausência de UTM.`);

  // Filter options
  const filterOptions = {
    campaigns: [...new Set(filtered.map((l) => l.utmCampaign).filter(Boolean) as string[])].sort(),
    sources: [...new Set(filtered.map((l) => l.utmSource).filter(Boolean) as string[])].sort(),
    platforms: [...new Set(filtered.map((l) => l.platform))].sort(),
  };

  // LP (Landing Page) stats
  type LpAccum = {
    raw: string;
    leads: AttrLead[];
    scores: number[];
    grades: Map<string, number>;
    origins: Map<string, number>;
    camps: Map<string, number>;
    last: string | null;
    daily: Map<string, number>;
  };
  const lpMap = new Map<string, LpAccum>();
  let lpIdx = 0;
  const lpLabelMap = new Map<string, string>();
  for (const l of filtered) {
    const raw = (l.paginaCaptura ?? "").trim() || "(sem página)";
    if (!lpLabelMap.has(raw)) {
      lpIdx++;
      lpLabelMap.set(raw, raw === "(sem página)" ? raw : `LP${String(lpIdx).padStart(2, "0")}`);
    }
    const e: LpAccum = lpMap.get(raw) ?? { raw, leads: [], scores: [], grades: new Map(), origins: new Map(), camps: new Map(), last: null, daily: new Map() };
    e.leads.push(l);
    if (l.score != null) e.scores.push(l.score);
    if (l.grade) e.grades.set(l.grade, (e.grades.get(l.grade) ?? 0) + 1);
    e.origins.set(l.origin, (e.origins.get(l.origin) ?? 0) + 1);
    if (l.utmCampaign) e.camps.set(l.utmCampaign, (e.camps.get(l.utmCampaign) ?? 0) + 1);
    if (!e.last || l.receivedAt > e.last) e.last = l.receivedAt;
    const dk = brtDay(new Date(l.receivedAt));
    e.daily.set(dk, (e.daily.get(dk) ?? 0) + 1);
    lpMap.set(raw, e);
  }

  const maxLpCount = Math.max(1, ...[...lpMap.values()].map((e) => e.leads.length));

  function median(arr: number[]): number | null {
    if (arr.length === 0) return null;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  }

  const lps: LpStats[] = [...lpMap.entries()]
    .map(([raw, e]) => {
      const count = e.leads.length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const avgS = e.scores.length > 0 ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : null;
      const qualA = (e.grades.get("A") ?? 0) + (e.grades.get("B") ?? 0);
      const qualifiedPct = count > 0 ? Math.round((qualA / count) * 100) : 0;
      const weakPct = count > 0 ? Math.round(((e.grades.get("D") ?? 0) / count) * 100) : 0;

      const volNorm = (count / maxLpCount) * 100;
      const scoreNorm = avgS != null ? avgS : 0;
      const di = Math.round(volNorm * 0.35 + scoreNorm * 0.35 + qualifiedPct * 0.2 + Math.min(100, count >= 3 ? 60 : count * 20) * 0.1);
      const rec: LpStats["recommendation"] = di >= 80 ? "Escalar" : di >= 60 ? "Manter" : di >= 40 ? "Otimizar" : "Pausar";

      const dailyArr = dailyKeys.map((k) => ({ day: dayLabel(k), count: e.daily.get(k) ?? 0 }));

      return {
        label: lpLabelMap.get(raw) ?? raw,
        raw,
        count,
        pct,
        avgScore: avgS,
        medianScore: median(e.scores),
        minScore: e.scores.length > 0 ? Math.min(...e.scores) : null,
        maxScore: e.scores.length > 0 ? Math.max(...e.scores) : null,
        grades: Object.fromEntries(e.grades),
        qualifiedPct,
        weakPct,
        decisionIndex: di,
        recommendation: rec,
        topOrigin: topKey(e.origins),
        topCampaign: topKey(e.camps),
        lastLead: e.last,
        daily: dailyArr,
        recentLeads: e.leads.slice(0, 10),
      };
    })
    .sort((a, b) => b.decisionIndex - a.decisionIndex);

  // LP insights
  const lpInsights: string[] = [];
  if (lps.length > 0) {
    const best = lps[0];
    lpInsights.push(`${best.label} (${best.raw}) lidera com índice de decisão ${best.decisionIndex}/100.`);
    const escalar = lps.filter((l) => l.recommendation === "Escalar");
    if (escalar.length > 0) lpInsights.push(`${escalar.length} LP${escalar.length > 1 ? "s" : ""} recomendada${escalar.length > 1 ? "s" : ""} para escalar.`);
    const pausar = lps.filter((l) => l.recommendation === "Pausar");
    if (pausar.length > 0) lpInsights.push(`${pausar.length} LP${pausar.length > 1 ? "s" : ""} recomendada${pausar.length > 1 ? "s" : ""} para pausar.`);
    const semPag = lps.find((l) => l.raw === "(sem página)");
    if (semPag && semPag.count > 0) lpInsights.push(`${semPag.count} lead${semPag.count > 1 ? "s" : ""} sem página de captura identificada.`);
  }

  return {
    leads: filtered,
    summary,
    origins,
    platforms,
    placements,
    utmCombos,
    dailyByOrigin,
    utmKpis,
    insights,
    utmAlerts,
    filterOptions,
    lps,
    lpInsights,
  };
}

function topKey(m: Map<string, number>): string | null {
  let best: string | null = null;
  let max = 0;
  for (const [k, v] of m) {
    if (v > max) { max = v; best = k; }
  }
  return best;
}
