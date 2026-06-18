import { prisma } from '@/lib/prisma';

export type SourceWithStats = Awaited<ReturnType<typeof getSourcesWithStats>>[number];
export type SyncLogEntry = Awaited<ReturnType<typeof getSyncLogs>>[number];

export async function getSourcesWithStats() {
  const sources = await prisma.source.findMany({ orderBy: { name: 'asc' } });

  const [leadCounts, lastLeads, syncStats] = await Promise.all([
    prisma.lead.groupBy({ by: ['sourceId'], _count: { _all: true } }),
    prisma.lead.findMany({
      select: { sourceId: true, receivedAt: true },
      orderBy: { receivedAt: 'desc' },
      distinct: ['sourceId'],
    }),
    prisma.syncLog.groupBy({
      by: ['destination', 'status'],
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(leadCounts.map((c) => [c.sourceId, c._count._all]));
  const lastMap = new Map(lastLeads.map((l) => [l.sourceId, l.receivedAt]));

  const destStats = new Map<string, { done: number; failed: number; pending: number }>();
  for (const g of syncStats) {
    const e = destStats.get(g.destination) ?? { done: 0, failed: 0, pending: 0 };
    if (g.status === 'done') e.done += g._count._all;
    else if (g.status === 'failed') e.failed += g._count._all;
    else e.pending += g._count._all;
    destStats.set(g.destination, e);
  }

  return sources.map((s) => ({
    ...s,
    leadCount: countMap.get(s.id) ?? 0,
    lastLeadAt: lastMap.get(s.id)?.toISOString() ?? null,
    destinations: [
      ...(s.sheetsId ? ['sheets'] : []),
      ...(s.dataCrazyUrl ? ['datacrazy'] : []),
    ] as string[],
  }));
}

export async function getSyncLogs(opts: {
  onlyFailed?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { onlyFailed = false, limit = 100, offset = 0 } = opts;

  return prisma.syncLog.findMany({
    where: onlyFailed ? { status: 'failed' } : undefined,
    include: {
      lead: {
        select: {
          name: true,
          email: true,
          phone: true,
          sourceId: true,
          source: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { attemptedAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function getDestinationStats() {
  const groups = await prisma.syncLog.groupBy({
    by: ['destination', 'status'],
    _count: { _all: true },
  });

  const lastAttempts = await prisma.syncLog.findMany({
    select: { destination: true, attemptedAt: true },
    orderBy: { attemptedAt: 'desc' },
    distinct: ['destination'],
  });

  const byDest = new Map<
    string,
    { done: number; failed: number; pending: number; total: number; lastAttempt: string | null }
  >();

  for (const g of groups) {
    const e = byDest.get(g.destination) ?? { done: 0, failed: 0, pending: 0, total: 0, lastAttempt: null };
    if (g.status === 'done') e.done += g._count._all;
    else if (g.status === 'failed') e.failed += g._count._all;
    else e.pending += g._count._all;
    e.total += g._count._all;
    byDest.set(g.destination, e);
  }

  for (const la of lastAttempts) {
    const e = byDest.get(la.destination);
    if (e) e.lastAttempt = la.attemptedAt.toISOString();
  }

  return Object.fromEntries(byDest);
}
