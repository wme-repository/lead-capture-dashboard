import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { Inbox } from "lucide-react";
import LeadsFilters from "../_components/leads-filters";
import SourceFilter from "../_components/source-filter";
import ExportButton from "../_components/export-button";
import { ScoreBadge, SyncBadge } from "../_components/badges";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; grade?: string; q?: string }>;
}) {
  const sp = await searchParams;

  const where: Prisma.LeadWhereInput = {};
  if (sp.source) where.source = { slug: sp.source };
  if (sp.grade && ["A", "B", "C", "D"].includes(sp.grade)) where.grade = sp.grade;
  if (sp.q) {
    where.OR = [
      { name: { contains: sp.q, mode: "insensitive" } },
      { email: { contains: sp.q, mode: "insensitive" } },
    ];
  }

  const [sources, total, leads] = await Promise.all([
    prisma.source.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: 100,
      include: {
        source: { select: { name: true } },
        syncLogs: { select: { status: true } },
      },
    }),
  ]);

  const fmtTime = (d: Date) =>
    d.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <p className="mt-1 text-xs text-gray-500">
            {total.toLocaleString("pt-BR")} leads{" "}
            {total > 100 ? "(mostrando os 100 mais recentes)" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SourceFilter sources={sources} basePath="/leads" />
          <ExportButton />
        </div>
      </div>

      <LeadsFilters />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Inbox size={28} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-600">Nenhum lead encontrado</p>
            <p className="text-xs text-gray-400">Ajuste os filtros ou aguarde novas capturas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium">Recebido</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Lead</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Telefone</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Origem</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Campanha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Score</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-400">
                      {fmtTime(l.receivedAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800">{l.name ?? "—"}</div>
                      <div className="text-xs text-gray-400">{l.email ?? ""}</div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{l.phone ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.utmSource ?? "direto"}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {l.utmCampaign ?? l.source?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <ScoreBadge grade={l.grade} />
                    </td>
                    <td className="px-4 py-2.5">
                      <SyncBadge logs={l.syncLogs} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
