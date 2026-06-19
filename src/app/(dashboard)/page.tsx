import { getDashboardV2Data, type Period } from "@/lib/dashboard-v2";
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

  const data = await getDashboardV2Data({ period, sourceSlug });

  return (
    <DashboardShell
      data={data}
      period={period}
      sourceSlug={sourceSlug}
    />
  );
}
