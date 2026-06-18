import { getAtribuicaoData } from "@/lib/atribuicao";
import AtribuicaoShell from "./_components/atribuicao-shell";

export const dynamic = "force-dynamic";

const PERIODS = ["7d", "30d", "90d"] as const;
type Period = (typeof PERIODS)[number];

export default async function AtribuicaoPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    campaign?: string;
    source?: string;
    platform?: string;
  }>;
}) {
  const sp = await searchParams;
  const period: Period = PERIODS.includes(sp.period as Period)
    ? (sp.period as Period)
    : "30d";

  const data = await getAtribuicaoData({
    period,
    campaign: sp.campaign || undefined,
    source: sp.source || undefined,
    platform: sp.platform || undefined,
  });

  return (
    <AtribuicaoShell
      data={data}
      period={period}
      filterCampaign={sp.campaign || undefined}
      filterSource={sp.source || undefined}
      filterPlatform={sp.platform || undefined}
    />
  );
}
