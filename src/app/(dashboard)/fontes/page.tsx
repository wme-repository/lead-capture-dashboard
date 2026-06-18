import { getSourcesWithStats, getSyncLogs, getDestinationStats } from "@/lib/fontes";
import FontesShell from "./_components/fontes-shell";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://leads.esqtools.com";

export default async function FontesPage() {
  const [sources, logs, failures, destStats] = await Promise.all([
    getSourcesWithStats(),
    getSyncLogs({ limit: 100 }),
    getSyncLogs({ onlyFailed: true, limit: 100 }),
    getDestinationStats(),
  ]);

  return (
    <FontesShell
      sources={sources}
      logs={logs}
      failures={failures}
      destStats={destStats}
      appUrl={APP_URL}
    />
  );
}
