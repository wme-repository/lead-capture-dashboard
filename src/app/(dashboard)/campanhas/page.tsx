import { prisma } from "@/lib/prisma";
import { Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampanhasPage() {
  const rows = await prisma.lead.findMany({
    select: { utmCampaign: true, grade: true, receivedAt: true },
    orderBy: { receivedAt: "desc" },
    take: 5000,
  });

  const map = new Map<
    string,
    { count: number; ab: number; graded: number; last: Date }
  >();
  for (const r of rows) {
    const key = r.utmCampaign || "(sem campanha)";
    const e = map.get(key) ?? { count: 0, ab: 0, graded: 0, last: r.receivedAt };
    e.count += 1;
    if (r.receivedAt > e.last) e.last = r.receivedAt;
    if (r.grade) {
      e.graded += 1;
      if (r.grade === "A" || r.grade === "B") e.ab += 1;
    }
    map.set(key, e);
  }
  const campaigns = [...map.entries()]
    .map(([name, e]) => ({
      name,
      count: e.count,
      abPct: e.graded > 0 ? Math.round((e.ab / e.graded) * 100) : null,
      last: e.last,
    }))
    .sort((a, b) => b.count - a.count);

  const fmt = (d: Date) =>
    d.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Campanhas</h1>
        <p className="mt-1 text-xs text-gray-500">
          Agrupado por <code className="text-gray-600">utm_campaign</code> dos leads. As campanhas
          são gerenciadas no Meta Ads — aqui é a leitura de performance.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Megaphone size={28} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-600">Nenhuma campanha ainda</p>
            <p className="text-xs text-gray-400">
              Os leads com UTM de campanha aparecem aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium">Campanha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Leads</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Score A/B</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Último lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((c) => (
                  <tr key={c.name} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.count.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {c.abPct === null ? "—" : `${c.abPct}%`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-400">{fmt(c.last)}</td>
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
