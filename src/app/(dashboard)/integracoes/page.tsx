import { getIntegrationData } from "@/lib/integracoes";
import IntegracoesShell from "./_components/integracoes-shell";

export const dynamic = "force-dynamic";

export default async function IntegracoesPage() {
  const { integrations, summary, logs } = await getIntegrationData();

  return (
    <IntegracoesShell
      integrations={integrations}
      summary={summary}
      logs={logs}
    />
  );
}
