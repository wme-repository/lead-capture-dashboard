import { NextRequest, NextResponse } from "next/server";
import { getRealAdSets } from "@/lib/orcamento-decisao/realAdapter";
import { mockAdapter } from "@/lib/orcamento-decisao/mockAdapter";
import { isMetaConfigured } from "@/lib/integrations/meta";
import type { Janela } from "@/lib/orcamento-decisao/adapter";

export const dynamic = "force-dynamic";

const JANELAS: Janela[] = ["hoje", "ontem", "3d", "7d", "14d", "custom"];

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("janela") as Janela | null;
  const janela: Janela = raw && JANELAS.includes(raw) ? raw : "hoje";

  // Sem Meta configurada → dados de exemplo (mock) p/ a aba seguir demonstrável.
  if (!isMetaConfigured()) {
    return NextResponse.json({ adSets: await mockAdapter.fetchAdSets(janela), fonte: "mock" });
  }

  try {
    const adSets = await getRealAdSets(janela);
    return NextResponse.json({ adSets, fonte: "real" });
  } catch (e) {
    // Falha do Meta/DB não pode derrubar a aba — cai no mock e sinaliza.
    return NextResponse.json({
      adSets: await mockAdapter.fetchAdSets(janela),
      fonte: "mock",
      erro: String(e).slice(0, 200),
    });
  }
}
