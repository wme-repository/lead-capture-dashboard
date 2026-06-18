import { prisma } from "@/lib/prisma";

export type Period = "today" | "7d" | "30d";

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function brtDayStart(d: Date): Date {
  const b = new Date(d.getTime() - BRT_OFFSET_MS);
  return new Date(
    Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) + BRT_OFFSET_MS
  );
}

function brtDayKey(d: Date): string {
  return new Date(d.getTime() - BRT_OFFSET_MS).toISOString().slice(0, 10);
}

export function dayLabel(key: string): string {
  const [, m, day] = key.split("-");
  return `${day}/${m}`;
}

function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export type Metric = {
  value: number;
  delta: number;
  series: number[];
};

export type SyncStats = {
  total: number;
  synced: number;
  pending: number;
  failed: number;
  syncPct: number;
};

export type DashboardData = {
  total: Metric;
  today: Metric;
  lastHour: Metric;
  scoreAB: Metric & { hasGraded: boolean };
  sync: SyncStats;
  chart: { label: string; value: number }[];
  origin: { label: string; count: number; pct: number }[];
  periodDays: number;
  topOrigin: string | null;
};

export async function getDashboardData(
  sourceSlug: string | undefined,
  period: Period
): Promise<DashboardData> {
  const periodDays = period === "today" ? 1 : period === "7d" ? 7 : 30;
  const where = sourceSlug ? { source: { slug: sourceSlug } } : {};

  const now = new Date();
  const spanDays = Math.max(periodDays * 2, 14) + 1;
  const spanStart = new Date(now.getTime() - spanDays * DAY_MS);

  const [totalAllTime, rows, syncGroups] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where: { ...where, receivedAt: { gte: spanStart } },
      select: { receivedAt: true, grade: true, utmSource: true },
    }),
    prisma.syncLog.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const syncMap: Record<string, number> = {};
  for (const g of syncGroups) syncMap[g.status] = g._count._all;
  const syncTotal = Object.values(syncMap).reduce((a, b) => a + b, 0);
  const syncDone = (syncMap['done'] ?? 0) + (syncMap['synced'] ?? 0);
  const syncFailed = syncMap['failed'] ?? 0;
  const syncPending = syncTotal - syncDone - syncFailed;
  const sync: SyncStats = {
    total: syncTotal,
    synced: syncDone,
    pending: syncPending,
    failed: syncFailed,
    syncPct: syncTotal > 0 ? Math.round((syncDone / syncTotal) * 100) : 100,
  };

  const between = (a: Date, b: Date) =>
    rows.filter((r) => r.receivedAt >= a && r.receivedAt < b).length;

  // Period window + previous equal window
  const startToday = brtDayStart(now);
  const periodStart =
    period === "today"
      ? startToday
      : brtDayStart(new Date(now.getTime() - (periodDays - 1) * DAY_MS));
  const periodLen = now.getTime() - periodStart.getTime();
  const prevStart = new Date(periodStart.getTime() - periodLen);

  // --- Total (growth of inflow: current period vs previous) ---
  const newCur = between(periodStart, now);
  const newPrev = between(prevStart, periodStart);

  // --- Today vs yesterday same elapsed window ---
  const todayCount = between(startToday, now);
  const elapsedToday = now.getTime() - startToday.getTime();
  const yStart = new Date(startToday.getTime() - DAY_MS);
  const todayPrev = between(yStart, new Date(yStart.getTime() + elapsedToday));

  // --- Last hour vs previous hour ---
  const hourAgo = new Date(now.getTime() - 3600_000);
  const twoHAgo = new Date(now.getTime() - 2 * 3600_000);
  const lastHourCount = between(hourAgo, now);
  const prevHourCount = between(twoHAgo, hourAgo);

  // --- Daily series (14) for total + score sparklines ---
  const dailyKeys: string[] = [];
  for (let i = 13; i >= 0; i--) dailyKeys.push(brtDayKey(new Date(now.getTime() - i * DAY_MS)));
  const dailyCount = new Map<string, number>();
  const dailyAB = new Map<string, { ab: number; graded: number }>();
  for (const r of rows) {
    const k = brtDayKey(r.receivedAt);
    dailyCount.set(k, (dailyCount.get(k) ?? 0) + 1);
    if (r.grade) {
      const e = dailyAB.get(k) ?? { ab: 0, graded: 0 };
      e.graded += 1;
      if (r.grade === "A" || r.grade === "B") e.ab += 1;
      dailyAB.set(k, e);
    }
  }
  const totalSeries = dailyKeys.map((k) => dailyCount.get(k) ?? 0);
  const scoreSeries = dailyKeys.map((k) => {
    const e = dailyAB.get(k);
    return e && e.graded > 0 ? Math.round((e.ab / e.graded) * 100) : 0;
  });

  // --- Today hourly sparkline (last 24h) ---
  const todaySeries: number[] = [];
  for (let i = 23; i >= 0; i--) {
    const a = new Date(now.getTime() - (i + 1) * 3600_000);
    const b = new Date(now.getTime() - i * 3600_000);
    todaySeries.push(between(a, b));
  }

  // --- Last hour sparkline (12 x 5min) ---
  const hourSeries: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const a = new Date(now.getTime() - (i + 1) * 5 * 60_000);
    const b = new Date(now.getTime() - i * 5 * 60_000);
    hourSeries.push(between(a, b));
  }

  // --- Score A/B over period ---
  let abCur = 0,
    gradedCur = 0,
    abPrev = 0,
    gradedPrev = 0;
  for (const r of rows) {
    if (!r.grade) continue;
    const inCur = r.receivedAt >= periodStart && r.receivedAt < now;
    const inPrev = r.receivedAt >= prevStart && r.receivedAt < periodStart;
    if (inCur) {
      gradedCur += 1;
      if (r.grade === "A" || r.grade === "B") abCur += 1;
    } else if (inPrev) {
      gradedPrev += 1;
      if (r.grade === "A" || r.grade === "B") abPrev += 1;
    }
  }
  const abPctCur = gradedCur > 0 ? Math.round((abCur / gradedCur) * 100) : 0;
  const abPctPrev = gradedPrev > 0 ? Math.round((abPrev / gradedPrev) * 100) : 0;

  // --- Main chart: hourly (today) or daily (7/30) ---
  let chart: { label: string; value: number }[];
  if (period === "today") {
    chart = [];
    for (let i = 23; i >= 0; i--) {
      const a = new Date(now.getTime() - (i + 1) * 3600_000);
      const b = new Date(now.getTime() - i * 3600_000);
      const hh = new Date(b.getTime() - BRT_OFFSET_MS).getUTCHours();
      chart.push({ label: `${String(hh).padStart(2, "0")}h`, value: between(a, b) });
    }
  } else {
    const keys: string[] = [];
    for (let i = periodDays - 1; i >= 0; i--) keys.push(brtDayKey(new Date(now.getTime() - i * DAY_MS)));
    chart = keys.map((k) => ({ label: dayLabel(k), value: dailyCount.get(k) ?? 0 }));
  }

  // --- Origin breakdown over period ---
  const originMap = new Map<string, number>();
  for (const r of rows) {
    if (r.receivedAt < periodStart) continue;
    const k = r.utmSource || "direto";
    originMap.set(k, (originMap.get(k) ?? 0) + 1);
  }
  const originTotal = [...originMap.values()].reduce((a, b) => a + b, 0);
  const origin = [...originMap.entries()]
    .map(([label, count]) => ({ label, count, pct: originTotal > 0 ? Math.round((count / originTotal) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topOrigin = origin.length > 0 ? origin[0].label : null;

  return {
    total: { value: totalAllTime, delta: pctChange(newCur, newPrev), series: totalSeries },
    today: { value: todayCount, delta: pctChange(todayCount, todayPrev), series: todaySeries },
    lastHour: {
      value: lastHourCount,
      delta: pctChange(lastHourCount, prevHourCount),
      series: hourSeries,
    },
    scoreAB: {
      value: abPctCur,
      delta: pctChange(abPctCur, abPctPrev),
      series: scoreSeries,
      hasGraded: gradedCur > 0,
    },
    sync,
    chart,
    origin,
    periodDays,
    topOrigin,
  };
}
