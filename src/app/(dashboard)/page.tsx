import { prisma } from "@/lib/prisma";
import { getDashboardData, type Period } from "@/lib/dashboard";
import { Users, CalendarDays, Clock, Award, ArrowUpRight, ArrowDownRight, Inbox } from "lucide-react";
import Sparkline from "./_components/sparkline";
import AreaChart from "./_components/area-chart";
import PeriodFilter from "./_components/period-filter";
import SourceFilter from "./_components/source-filter";
import ExportButton from "./_components/export-button";
import LiveStatus from "./_components/live-status";
import { ScoreBadge, SyncBadge } from "./_components/badges";

export const dynamic = "force-dynamic";

const PERIODS: Period[] = ["today", "7d", "30d"];

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
        up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(value)}%
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; period?: string }>;
}) {
  const sp = await searchParams;
  const sourceSlug = sp.source;
  const period: Period = PERIODS.includes(sp.period as Period) ? (sp.period as Period) : "7d";

  const [sources, data] = await Promise.all([
    prisma.source.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    getDashboardData(sourceSlug, period),
  ]);

  const recent = await prisma.lead.findMany({
    where: sourceSlug ? { source: { slug: sourceSlug } } : {},
    orderBy: { receivedAt: "desc" },
    take: 8,
    include: {
      source: { select: { name: true } },
      syncLogs: { select: { status: true } },
    },
  });

  const fmtTime = (d: Date) =>
    d.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const originMax = Math.max(1, ...data.origin.map((o) => o.count));
  const originColors = ["#1d4ed8", "#2563eb", "#60a5fa", "#93c5fd", "#9ca3af"];

  const cards = [
    { label: "Total de leads", value: data.total.value.toLocaleString("pt-BR"), delta: data.total.delta, series: data.total.series, icon: Users, tone: "bg-blue-50 text-blue-700", color: "#2563eb" },
    { label: "Leads hoje", value: data.today.value.toLocaleString("pt-BR"), delta: data.today.delta, series: data.today.series, icon: CalendarDays, tone: "bg-green-50 text-green-700", color: "#16a34a" },
    { label: "Última hora", value: data.lastHour.value.toLocaleString("pt-BR"), delta: data.lastHour.delta, series: data.lastHour.series, icon: Clock, tone: "bg-amber-50 text-amber-700", color: "#d97706" },
    { label: "Score A/B", value: data.scoreAB.hasGraded ? `${data.scoreAB.value}%` : "—", delta: data.scoreAB.delta, series: data.scoreAB.series, icon: Award, tone: "bg-violet-50 text-violet-700", color: "#7c3aed" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <div className="mt-1">
            <LiveStatus />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter />
          <SourceFilter sources={sources} />
          <ExportButton />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.tone}`}>
                  <Icon size={17} />
                </div>
                <Delta value={c.delta} />
              </div>
              <div className="mt-2.5 text-2xl font-semibold tracking-tight text-gray-900">
                {c.value}
              </div>
              <div className="text-xs text-gray-500">{c.label}</div>
              <div className="mt-1.5">
                <Sparkline data={c.series} color={c.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800">Leads por dia</span>
            <span className="text-[11px] text-gray-400">
              {period === "today" ? "hoje, por hora" : `últimos ${data.periodDays} dias`}
            </span>
          </div>
          {data.chart.every((d) => d.value === 0) ? (
            <div className="flex h-[180px] items-center justify-center text-sm text-gray-400">
              Sem leads no período.
            </div>
          ) : (
            <AreaChart data={data.chart} />
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-medium text-gray-800">Origem dos leads</div>
          {data.origin.length === 0 ? (
            <div className="flex h-[140px] items-center justify-center text-sm text-gray-400">
              Sem dados ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {data.origin.map((o, i) => (
                <div key={o.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-gray-600">{o.label}</span>
                    <span className="font-medium text-gray-800">{o.count}</span>
                  </div>
                  <div className="h-1.5 rounded bg-gray-100">
                    <div
                      className="h-1.5 rounded"
                      style={{
                        width: `${Math.round((o.count / originMax) * 100)}%`,
                        background: originColors[i] ?? "#9ca3af",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent leads */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span className="text-sm font-medium text-gray-800">Leads recentes</span>
          <a href="/leads" className="text-xs font-medium text-blue-600 hover:underline">
            Ver todos
          </a>
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Inbox size={28} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-600">Nenhum lead capturado ainda</p>
            <p className="text-xs text-gray-400">
              Assim que um formulário enviar um webhook, ele aparece aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium">Recebido</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Lead</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Origem</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Campanha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Score</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-400">
                      {fmtTime(l.receivedAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800">{l.name ?? "—"}</div>
                      <div className="text-xs text-gray-400">{l.email ?? l.phone ?? ""}</div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{l.utmSource ?? "direto"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.source?.name ?? "—"}</td>
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
