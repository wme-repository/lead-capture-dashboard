"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CaptacaoRow, QuestionarioRow, SheetMeta } from "@/lib/planilhas";
import {
  Search,
  RefreshCw,
  Download,
  ExternalLink,
  Maximize2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Eye,
  EyeOff,
  Columns3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  AlertTriangle,
  Inbox,
  Table2,
} from "lucide-react";

/* ---------- Captação column definitions ---------- */
const CAPTACAO_COLS: { key: keyof CaptacaoRow; label: string }[] = [
  { key: "dataInscricao", label: "Data de Inscrição" },
  { key: "hora", label: "Hora" },
  { key: "nome", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "telefone", label: "Telefone" },
  { key: "paginaCaptura", label: "Página de Captura" },
  { key: "pesquisa", label: "Pesquisa" },
  { key: "grupo", label: "Grupo" },
  { key: "utmCampaign", label: "utm_campaign" },
  { key: "utmMedium", label: "utm_medium" },
  { key: "utmSource", label: "utm_source" },
  { key: "utmContent", label: "utm_content" },
  { key: "utmTerm", label: "utm_term" },
  { key: "utmMedium2", label: "utm_medium" },
];

type Tab = "captacao" | "questionario";
type Density = "compact" | "default" | "comfortable";
type SortDir = "asc" | "desc" | null;

const DENSITY_PY: Record<Density, string> = {
  compact: "py-1",
  default: "py-2",
  comfortable: "py-3",
};

const PAGE_SIZES = [25, 50, 100, 250];

/* ---------- Helpers ---------- */
function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
}

function statusColor(s: SheetMeta["status"]) {
  switch (s) {
    case "synced": return "bg-emerald-100 text-emerald-700";
    case "updating": return "bg-blue-100 text-blue-700";
    case "error": return "bg-red-100 text-red-700";
    case "empty": return "bg-gray-100 text-gray-500";
  }
}

function statusLabel(s: SheetMeta["status"]) {
  switch (s) {
    case "synced": return "Sincronizada";
    case "updating": return "Atualizando";
    case "error": return "Erro";
    case "empty": return "Sem dados";
  }
}

function downloadCsv(headers: string[], rows: string[][], filename: string) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

/* ---------- Component ---------- */

export default function PlanilhasShell({
  captacao,
  questionario,
}: {
  captacao: { rows: CaptacaoRow[]; meta: SheetMeta };
  questionario: { rows: QuestionarioRow[]; meta: SheetMeta };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("captacao");
  const [search, setSearch] = useState("");
  const [density, setDensity] = useState<Density>("default");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColManager, setShowColManager] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [copiedRow, setCopiedRow] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ----- Derive columns/rows for active tab ----- */
  const questCols = useMemo(() => {
    const base = ["nome", "email", "telefone", "leadscore", "notaFaixaLead"];
    const extra = new Set<string>();
    for (const r of questionario.rows) {
      for (const k of Object.keys(r)) if (!base.includes(k)) extra.add(k);
    }
    return [
      { key: "nome", label: "Nome" },
      { key: "email", label: "Email" },
      { key: "telefone", label: "Telefone" },
      { key: "leadscore", label: "leadscore" },
      { key: "notaFaixaLead", label: "nota faixa lead" },
      ...[...extra].sort().map((k) => ({ key: k, label: k })),
    ];
  }, [questionario.rows]);

  const columns = tab === "captacao" ? CAPTACAO_COLS : questCols;
  const rawRows = tab === "captacao" ? captacao.rows : questionario.rows;
  const meta = tab === "captacao" ? captacao.meta : questionario.meta;

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.has(c.key)),
    [columns, hiddenCols]
  );

  /* Filter + search + sort */
  const processedRows = useMemo(() => {
    let rows = [...rawRows];

    // Column filters
    for (const [col, val] of Object.entries(columnFilters)) {
      if (!val) continue;
      const lower = val.toLowerCase();
      rows = rows.filter((r) => {
        const cell = (r as Record<string, string>)[col] ?? "";
        return cell.toLowerCase().includes(lower);
      });
    }

    // Global search
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortCol && sortDir) {
      rows.sort((a, b) => {
        const va = (a as Record<string, string>)[sortCol] ?? "";
        const vb = (b as Record<string, string>)[sortCol] ?? "";
        const cmp = va.localeCompare(vb, "pt-BR", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [rawRows, search, sortCol, sortDir, columnFilters]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = processedRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  /* Handlers */
  const handleSort = useCallback(
    (key: string) => {
      if (sortCol === key) {
        if (sortDir === "asc") setSortDir("desc");
        else if (sortDir === "desc") { setSortCol(null); setSortDir(null); }
      } else {
        setSortCol(key);
        setSortDir("asc");
      }
      setPage(0);
    },
    [sortCol, sortDir]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 1500);
  }, [router]);

  const handleExportCsv = useCallback(() => {
    const headers = visibleColumns.map((c) => c.label);
    const rows = processedRows.map((r) =>
      visibleColumns.map((c) => (r as Record<string, string>)[c.key] ?? "")
    );
    downloadCsv(headers, rows, `planilha-${tab}-${Date.now()}.csv`);
  }, [visibleColumns, processedRows, tab]);

  const handleCopyVisible = useCallback(() => {
    const headers = visibleColumns.map((c) => c.label);
    const rows = processedRows.map((r) =>
      visibleColumns.map((c) => (r as Record<string, string>)[c.key] ?? "")
    );
    const text = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    copyText(text);
  }, [visibleColumns, processedRows]);

  const handleCopyCell = useCallback((rowIdx: number, colKey: string, value: string) => {
    copyText(value);
    setCopiedCell(`${rowIdx}-${colKey}`);
    setTimeout(() => setCopiedCell(null), 1200);
  }, []);

  const handleCopyRow = useCallback(
    (rowIdx: number) => {
      const row = pageRows[rowIdx];
      const text = visibleColumns.map((c) => (row as Record<string, string>)[c.key] ?? "").join("\t");
      copyText(text);
      setCopiedRow(rowIdx);
      setTimeout(() => setCopiedRow(null), 1200);
    },
    [pageRows, visibleColumns]
  );

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setSearch("");
    setSortCol(null);
    setSortDir(null);
    setPage(0);
  }, []);

  const hasActiveFilters = search || Object.values(columnFilters).some(Boolean);

  /* ----- Render ----- */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Planilhas</h1>
          <p className="mt-1 text-xs text-gray-500">
            Espelhamento fiel das bases conectadas ao sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Atualizar dados
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download size={13} />
            Exportar CSV
          </button>
          <button
            onClick={() => window.open("https://docs.google.com/spreadsheets", "_blank")}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <ExternalLink size={13} />
            Abrir planilha
          </button>
          <button
            onClick={handleToggleFullscreen}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Maximize2 size={13} />
            Tela cheia
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {(["captacao", "questionario"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(0); setSearch(""); setColumnFilters({}); setSortCol(null); setSortDir(null); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "captacao" ? "Captação" : "Questionário"}
          </button>
        ))}
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <MetaCard label="Total de linhas" value={meta.totalRows.toLocaleString("pt-BR")} />
        <MetaCard label="Total de colunas" value={String(meta.totalColumns)} />
        <MetaCard label="Última atualização" value={timeAgo(meta.lastUpdate)} />
        <MetaCard label="Origem" value={meta.origin} small />
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(meta.status)}`}>
            {statusLabel(meta.status)}
          </span>
          <span className="text-[11px] text-gray-400">Status</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar na planilha..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-700 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <ToolbarBtn
            icon={<Filter size={13} />}
            label="Filtros"
            active={showFilterPanel}
            onClick={() => setShowFilterPanel(!showFilterPanel)}
          />
          <ToolbarBtn
            icon={<Columns3 size={13} />}
            label="Colunas"
            active={showColManager}
            onClick={() => setShowColManager(!showColManager)}
          />

          {/* Density */}
          <select
            value={density}
            onChange={(e) => setDensity(e.target.value as Density)}
            className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-600 outline-none"
          >
            <option value="compact">Compacta</option>
            <option value="default">Padrão</option>
            <option value="comfortable">Confortável</option>
          </select>

          <ToolbarBtn icon={<RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />} label="Atualizar" onClick={handleRefresh} />
          <ToolbarBtn icon={<Download size={13} />} label="CSV" onClick={handleExportCsv} />
          <ToolbarBtn icon={<Copy size={13} />} label="Copiar" onClick={handleCopyVisible} />
          <ToolbarBtn
            icon={<ExternalLink size={13} />}
            label="Abrir"
            onClick={() => window.open("https://docs.google.com/spreadsheets", "_blank")}
          />
        </div>

        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>

      {/* Column filter panel */}
      {showFilterPanel && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleColumns.map((col, i) => (
            <div key={`${col.key}-${i}`}>
              <label className="mb-0.5 block text-[10px] font-medium text-gray-400 uppercase">{col.label}</label>
              <input
                type="text"
                placeholder={`Filtrar ${col.label}...`}
                value={columnFilters[col.key] ?? ""}
                onChange={(e) => {
                  setColumnFilters((prev) => ({ ...prev, [col.key]: e.target.value }));
                  setPage(0);
                }}
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-300"
              />
            </div>
          ))}
        </div>
      )}

      {/* Column visibility manager */}
      {showColManager && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3">
          {columns.map((col, i) => {
            const hidden = hiddenCols.has(col.key);
            return (
              <button
                key={`${col.key}-${i}`}
                onClick={() => {
                  const next = new Set(hiddenCols);
                  if (hidden) next.delete(col.key); else next.add(col.key);
                  setHiddenCols(next);
                }}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  hidden
                    ? "bg-gray-100 text-gray-400 line-through"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                {col.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      {meta.status === "error" ? (
        <ErrorState onRetry={handleRefresh} />
      ) : meta.status === "empty" || rawRows.length === 0 ? (
        <EmptyState onRefresh={handleRefresh} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="w-10 border-b border-r border-gray-200 bg-gray-100 px-2 py-2 text-center text-[10px] font-semibold text-gray-400">#</th>
                  {visibleColumns.map((col, i) => (
                    <th
                      key={`${col.key}-${i}`}
                      onClick={() => handleSort(col.key)}
                      className="cursor-pointer select-none border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {sortCol === col.key ? (
                          sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                        ) : (
                          <ArrowUpDown size={10} className="text-gray-300" />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="w-16 border-b border-gray-200 bg-gray-50 px-2 py-2 text-center text-[10px] font-semibold text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((row, ri) => {
                  const globalIdx = safePage * pageSize + ri + 1;
                  return (
                    <tr
                      key={ri}
                      className={`transition-colors hover:bg-blue-50/40 ${copiedRow === ri ? "bg-green-50" : ""}`}
                    >
                      <td className="border-r border-gray-100 bg-gray-50/50 px-2 text-center text-[10px] font-medium text-gray-400">
                        <span className={DENSITY_PY[density]}>{globalIdx}</span>
                      </td>
                      {visibleColumns.map((col, ci) => {
                        const val = (row as Record<string, string>)[col.key] ?? "";
                        const cellId = `${ri}-${col.key}`;
                        return (
                          <td
                            key={`${col.key}-${ci}`}
                            className={`border-r border-gray-50 px-3 ${DENSITY_PY[density]} text-gray-700 whitespace-nowrap max-w-[240px] truncate group relative`}
                            title={val}
                          >
                            {val || <span className="text-gray-300">—</span>}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyCell(ri, col.key, val); }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 hidden rounded p-0.5 text-gray-300 hover:text-gray-600 group-hover:block"
                            >
                              {copiedCell === cellId ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                            </button>
                          </td>
                        );
                      })}
                      <td className={`px-2 ${DENSITY_PY[density]} text-center`}>
                        <button
                          onClick={() => handleCopyRow(ri)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Copiar linha"
                        >
                          {copiedRow === ri ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                {processedRows.length.toLocaleString("pt-BR")} linha{processedRows.length !== 1 ? "s" : ""}
                {hasActiveFilters ? " (filtradas)" : ""}
              </span>
              <span className="text-gray-300">|</span>
              <span>Página {safePage + 1} de {totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 outline-none"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>{s} linhas</option>
                ))}
              </select>
              <div className="flex items-center gap-0.5">
                <PagBtn disabled={safePage === 0} onClick={() => setPage(0)}>
                  <ChevronsLeft size={13} />
                </PagBtn>
                <PagBtn disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  <ChevronLeft size={13} />
                </PagBtn>
                <PagBtn disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
                  <ChevronRight size={13} />
                </PagBtn>
                <PagBtn disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
                  <ChevronsRight size={13} />
                </PagBtn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function MetaCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`mt-0.5 font-semibold text-gray-800 ${small ? "text-xs" : "text-sm"}`}>{value}</div>
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function PagBtn({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-20 text-center">
      <Inbox size={32} className="text-gray-300" />
      <div>
        <p className="text-sm font-medium text-gray-700">Nenhum dado encontrado nesta planilha.</p>
        <p className="mt-1 text-xs text-gray-400">A planilha está conectada, mas ainda não possui linhas para exibir.</p>
      </div>
      <button
        onClick={onRefresh}
        className="mt-2 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
      >
        <RefreshCw size={13} />
        Atualizar dados
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-white py-20 text-center">
      <AlertTriangle size={32} className="text-red-400" />
      <div>
        <p className="text-sm font-medium text-gray-700">Não foi possível carregar esta planilha.</p>
        <p className="mt-1 text-xs text-gray-400">Verifique a conexão, permissões ou configuração da integração.</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
        >
          <RefreshCw size={13} />
          Tentar novamente
        </button>
        <a
          href="/integracoes"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Ver integração
        </a>
      </div>
    </div>
  );
}
