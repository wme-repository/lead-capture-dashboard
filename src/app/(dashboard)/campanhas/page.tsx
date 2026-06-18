import { getCampaignsData, getFilterOptions } from "@/lib/campanhas";
import CampanhasShell from "./_components/campanhas-shell";

export const dynamic = "force-dynamic";

const PERIODS = ["7d", "30d", "90d"] as const;
type Period = (typeof PERIODS)[number];

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    source?: string;
    medium?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const period: Period = PERIODS.includes(sp.period as Period)
    ? (sp.period as Period)
    : "30d";

  const [data, filterOptions] = await Promise.all([
    getCampaignsData({
      period,
      source: sp.source || undefined,
      medium: sp.medium || undefined,
      page: sp.page || undefined,
    }),
    getFilterOptions(),
  ]);

  return (
    <CampanhasShell
      campaigns={data.campaigns}
      summary={data.summary}
      sourceBreakdown={data.sourceBreakdown}
      pageBreakdown={data.pageBreakdown}
      dailyChart={data.dailyChart}
      period={period}
      filterSource={sp.source || undefined}
      filterMedium={sp.medium || undefined}
      filterPage={sp.page || undefined}
      filterOptions={filterOptions}
    />
  );
}
