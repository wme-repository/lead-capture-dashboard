import { getPlanilhasData } from "@/lib/planilhas";
import PlanilhasShell from "./_components/planilhas-shell";

export const dynamic = "force-dynamic";

export default async function PlanilhasPage() {
  const data = await getPlanilhasData();

  return (
    <PlanilhasShell
      captacao={data.captacao}
      questionario={data.questionario}
    />
  );
}
