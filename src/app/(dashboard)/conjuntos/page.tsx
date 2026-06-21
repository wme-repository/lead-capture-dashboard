import { getMetaConjuntos } from "@/lib/integrations/meta";
import ConjuntosShell from "./_components/conjuntos-shell";

export const dynamic = "force-dynamic";

export default async function ConjuntosPage() {
  const campanhas = await getMetaConjuntos().catch(() => []);
  return <ConjuntosShell campanhas={campanhas} />;
}
