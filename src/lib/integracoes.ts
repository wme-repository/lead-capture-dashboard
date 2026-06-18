import { prisma } from "@/lib/prisma";

export type IntegrationStats = {
  destination: string;
  label: string;
  type: string;
  done: number;
  pending: number;
  failed: number;
  total: number;
  lastAttempt: string | null;
  sourcesConnected: number;
  health: "active" | "pending" | "error" | "paused";
  syncPct: number;
};

export type IntegrationSummary = {
  totalIntegrations: number;
  active: number;
  totalPending: number;
  totalFailed: number;
  syncPct: number;
};

export type IntegrationLogEntry = {
  id: string;
  destination: string;
  status: string;
  error: string | null;
  attemptCount: number;
  attemptedAt: string;
  nextRetryAt: string | null;
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    source: { name: string; slug: string } | null;
  };
};

const DEST_META: Record<string, { label: string; type: string }> = {
  sheets: { label: "Google Sheets", type: "Planilha" },
  "google-sheets": { label: "Google Sheets", type: "Planilha" },
  datacrazy: { label: "DataCrazy CRM", type: "CRM" },
};

export async function getIntegrationData() {
  const [groups, lastAttempts, sourceDests, logs] = await Promise.all([
    prisma.syncLog.groupBy({
      by: ["destination", "status"],
      _count: { _all: true },
    }),
    prisma.syncLog.findMany({
      select: { destination: true, attemptedAt: true },
      orderBy: { attemptedAt: "desc" },
      distinct: ["destination"],
    }),
    prisma.source.findMany({
      select: { sheetsId: true, dataCrazyUrl: true },
    }),
    prisma.syncLog.findMany({
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            source: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { attemptedAt: "desc" },
      take: 200,
    }),
  ]);

  const sourceCountByDest: Record<string, number> = {
    sheets: sourceDests.filter((s) => s.sheetsId).length,
    datacrazy: sourceDests.filter((s) => s.dataCrazyUrl).length,
  };

  const byDest = new Map<string, { done: number; pending: number; failed: number; total: number }>();
  for (const g of groups) {
    const e = byDest.get(g.destination) ?? { done: 0, pending: 0, failed: 0, total: 0 };
    if (g.status === "done" || g.status === "synced") e.done += g._count._all;
    else if (g.status === "failed") e.failed += g._count._all;
    else e.pending += g._count._all;
    e.total += g._count._all;
    byDest.set(g.destination, e);
  }

  const lastMap = new Map(lastAttempts.map((la) => [la.destination, la.attemptedAt.toISOString()]));

  const integrations: IntegrationStats[] = [...byDest.entries()].map(([dest, c]) => {
    const meta = DEST_META[dest] ?? { label: dest, type: "Outro" };
    const health: IntegrationStats["health"] =
      c.failed > 0 ? "error" : c.pending > 0 ? "pending" : "active";
    return {
      destination: dest,
      label: meta.label,
      type: meta.type,
      ...c,
      lastAttempt: lastMap.get(dest) ?? null,
      sourcesConnected: sourceCountByDest[dest] ?? 0,
      health,
      syncPct: c.total > 0 ? Math.round((c.done / c.total) * 100) : 100,
    };
  });

  const totalDone = integrations.reduce((a, i) => a + i.done, 0);
  const totalAll = integrations.reduce((a, i) => a + i.total, 0);

  const summary: IntegrationSummary = {
    totalIntegrations: integrations.length,
    active: integrations.filter((i) => i.health === "active").length,
    totalPending: integrations.reduce((a, i) => a + i.pending, 0),
    totalFailed: integrations.reduce((a, i) => a + i.failed, 0),
    syncPct: totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 100,
  };

  const serializedLogs: IntegrationLogEntry[] = logs.map((l) => ({
    id: l.id,
    destination: l.destination,
    status: l.status,
    error: l.error,
    attemptCount: l.attemptCount,
    attemptedAt: l.attemptedAt.toISOString(),
    nextRetryAt: l.nextRetryAt?.toISOString() ?? null,
    lead: {
      id: l.lead.id,
      name: l.lead.name,
      email: l.lead.email,
      phone: l.lead.phone,
      source: l.lead.source,
    },
  }));

  return { integrations, summary, logs: serializedLogs };
}
