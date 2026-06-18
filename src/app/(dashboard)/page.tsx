import { prisma } from "@/lib/prisma";
import AutoRefresh from "./_components/auto-refresh";
import SourceFilter from "./_components/source-filter";
import ExportButton from "./_components/export-button";

export const dynamic = "force-dynamic";

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

function brtDayKey(d: Date): string {
  return new Date(d.getTime() - BRT_OFFSET_MS).toISOString().slice(0, 10);
}

function brtDayLabel(key: string): string {
  const [, m, day] = key.split("-");
  return `${day}/${m}`;
}

const GRADE_STYLES: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700",
  B: "bg-emerald-50 text-emerald-700",
  C: "bg-amber-50 text-amber-700",
  D: "bg-red-50 text-red-700",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source: sourceSlug } = await searchParams;

  const sources = await prisma.source.findMany({
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });

  const where = sourceSlug ? { source: { slug: sourceSlug } } : {};

  const now = new Date();
  const brtNow = new Date(now.getTime() - BRT_OFFSET_MS);
  const startTodayUtc = new Date(
    Date.UTC(brtNow.getUTCFullYear(), brtNow.getUTCMonth(), brtNow.getUTCDate()) +
      BRT_OFFSET_MS
  );
  const hourAgo = new Date(now.getTime() - 3600_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600_000);

  const [total, today, lastHour, gradeGroups, utmGroups, last7Raw, recent] =
    await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, receivedAt: { gte: startTodayUtc } } }),
      prisma.lead.count({ where: { ...where, receivedAt: { gte: hourAgo } } }),
      prisma.lead.groupBy({
        by: ["grade"],
        where: { ...where, grade: { not: null } },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ["utmSource"],
        where,
        _count: { _all: true },
      }),
      prisma.lead.findMany({
        where: { ...where, receivedAt: { gte: sevenDaysAgo } },
        select: { receivedAt: true },
      }),
      prisma.lead.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: 20,
        include: {
          source: { select: { name: true, slug: true } },
          syncLogs: { select: { destination: true, status: true } },
        },
      }),
    ]);

  // Score A/B percentage over graded leads
  const gradedTotal = gradeGroups.reduce((s, g) => s + g._count._all, 0);
  const abCount = gradeGroups
    .filter((g) => g.grade === "A" || g.grade === "B")
    .reduce((s, g) => s + g._count._all, 0);
  const abPct = gradedTotal > 0 ? Math.round((abCount / gradedTotal) * 100) : null;

  // UTM source breakdown — top 5
  const utmTop = utmGroups
    .map((g) => ({ label: g.utmSource || "(direto)", count: g._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const utmMax = Math.max(1, ...utmTop.map((u) => u.count));

  // Leads per day — last 7 BRT days
  const dayCounts = new Map<string, number>();
  for (const l of last7Raw) {
    const k = brtDayKey(l.receivedAt);
    dayCounts.set(k, (dayCounts.get(k) ?? 0) + 1);
  }
  const days: { key: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const k = brtDayKey(new Date(now.getTime() - i * 24 * 3600_000));
    days.push({ key: k, count: dayCounts.get(k) ?? 0 });
  }
  const dayMax = Math.max(1, ...days.map((d) => d.count));

  const fmtTime = (d: Date) =>
    d.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  function syncIcon(logs: { status: string }[]) {
    if (logs.length === 0) return <span className="text-gray-400">—</span>;
    if (logs.some((l) => l.status === "failed"))
      return <span className="text-red-600" title="falha">✕</span>;
    if (logs.every((l) => l.status === "done" || l.status === "synced"))
      return <span className="text-green-600" title="sincronizado">✓</span>;
    return <span className="text-amber-600" title="pendente">⏳</span>;
  }

  const cards = [
    { label: "Total de leads", value: total.toLocaleString("pt-BR") },
    { label: "Hoje", value: today.toLocaleString("pt-BR") },
    { label: "Última hora", value: lastHour.toLocaleString("pt-BR") },
    { label: "Score A/B", value: abPct === null ? "—" : `${abPct}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-800">Analytics</h1>
          <AutoRefresh />
        </div>
        <SourceFilter sources={sources} selected={sourceSlug} />
      </div>

      {/* Metric cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 mb-1.5">{c.label}</p>
            <p className="text-2xl font-semibold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm font-medium text-gray-800 mb-3">Origem (utm_source)</p>
          {utmTop.length === 0 ? (
            <p className="text-sm text-gray-400">Sem dados ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {utmTop.map((u) => (
                <div key={u.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{u.label}</span>
                    <span className="font-medium text-gray-800">{u.count}</span>
                  </div>
                  <div className="h-1.5 rounded bg-gray-100">
                    <div
                      className="h-1.5 rounded bg-blue-500"
                      style={{ width: `${Math.round((u.count / utmMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm font-medium text-gray-800 mb-3">Leads por dia</p>
          <div className="flex items-end gap-1.5 h-32">
            {days.map((d, i) => (
              <div
                key={d.key}
                className={`flex-1 rounded-t ${
                  i === days.length - 1 ? "bg-emerald-700" : "bg-emerald-500"
                }`}
                style={{ height: `${Math.max(4, Math.round((d.count / dayMax) * 100))}%` }}
                title={`${d.count} leads`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 mt-1.5">
            {days.map((d) => (
              <span key={d.key} className="flex-1 text-center">
                {brtDayLabel(d.key)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-800">Leads recentes</span>
          <ExportButton />
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 p-6">Nenhum lead capturado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Recebido</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Origem</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Campanha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Score</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {fmtTime(l.receivedAt)}
                    </td>
                    <td className="px-4 py-2 text-gray-800 whitespace-nowrap">
                      {l.name ?? l.email ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{l.utmSource ?? "(direto)"}</td>
                    <td className="px-4 py-2 text-gray-600">{l.source?.name ?? "—"}</td>
                    <td className="px-4 py-2">
                      {l.grade ? (
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            GRADE_STYLES[l.grade] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {l.grade}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">{syncIcon(l.syncLogs)}</td>
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
