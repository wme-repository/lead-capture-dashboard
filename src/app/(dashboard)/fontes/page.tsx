import { prisma } from "@/lib/prisma";
import { Plug } from "lucide-react";
import CopyField from "../_components/copy-field";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://leads.esqtools.com";

export default async function FontesPage() {
  const sources = await prisma.source.findMany({ orderBy: { name: "asc" } });
  const counts = await prisma.lead.groupBy({ by: ["sourceId"], _count: { _all: true } });
  const countMap = new Map(counts.map((c) => [c.sourceId, c._count._all]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Fontes de captação</h1>
        <p className="mt-1 text-xs text-gray-500">
          Cada fonte é um endpoint de webhook. Configure a URL e o token no formulário do site de
          origem.
        </p>
      </div>

      {sources.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <Plug size={28} className="text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Nenhuma fonte cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {sources.map((s) => (
            <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-400">
                    /{s.slug} ·{" "}
                    {s.schemaType === "questionnaire" ? "questionário (com score)" : "padrão"}
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  {(countMap.get(s.id) ?? 0).toLocaleString("pt-BR")} leads
                </span>
              </div>

              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                <div>
                  <div className="mb-1 text-[11px] font-medium uppercase text-gray-400">
                    URL do webhook
                  </div>
                  <CopyField value={`${APP_URL}/api/webhook/${s.slug}`} />
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div>
                    <div className="mb-1 text-[11px] font-medium uppercase text-gray-400">
                      Token (header x-webhook-token)
                    </div>
                    <CopyField value={s.token} mask />
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] font-medium uppercase text-gray-400">
                      Google Sheets
                    </div>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        s.sheetsId && !s.sheetsId.startsWith("SEU_")
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.sheetsId && !s.sheetsId.startsWith("SEU_")
                        ? "configurado"
                        : "não configurado"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Para cadastrar uma fonte nova (site novo), fale com o administrador — é um registro rápido
        no banco.
      </p>
    </div>
  );
}
