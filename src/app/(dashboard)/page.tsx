import { prisma } from "@/lib/prisma";
import { getDashboardData, type Period } from "@/lib/dashboard";
import DashboardShell from "./_components/dashboard-shell";

export const dynamic = "force-dynamic";

const PERIODS: Period[] = ["today", "7d", "30d"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; period?: string }>;
}) {
  const sp = await searchParams;
  const sourceSlug = sp.source;
  const period: Period = PERIODS.includes(sp.period as Period)
    ? (sp.period as Period)
    : "7d";

  const [sources, data, recent] = await Promise.all([
    prisma.source.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    getDashboardData(sourceSlug, period),
    prisma.lead.findMany({
      where: sourceSlug ? { source: { slug: sourceSlug } } : {},
      orderBy: { receivedAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        utmSource: true,
        utmCampaign: true,
        grade: true,
        score: true,
        status: true,
        receivedAt: true,
        source: { select: { name: true } },
        syncLogs: { select: { status: true } },
      },
    }),
  ]);

  const serialized = recent.map((l) => ({
    ...l,
    receivedAt: l.receivedAt.toISOString(),
  }));

  return (
    <DashboardShell
      data={data}
      sources={sources}
      recent={serialized}
      period={period}
      sourceSlug={sourceSlug}
    />
  );
}
