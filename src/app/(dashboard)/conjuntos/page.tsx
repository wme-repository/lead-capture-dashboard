import { getConjuntosData } from "@/lib/conjuntos";
import ConjuntosShell from "./_components/conjuntos-shell";

export const dynamic = "force-dynamic";

export default async function ConjuntosPage() {
  const campanhas = await getConjuntosData().catch(() => []);
  return <ConjuntosShell campanhas={campanhas} />;
}
