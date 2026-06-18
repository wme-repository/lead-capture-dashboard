"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CaptacaoRow, QuestionarioRow, SheetMeta } from "@/lib/planilhas";
import {
  Search,
  RefreshCw,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
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
  AlertTriangle,
  Inbox,
  Table2,
  Rows3,
  Clock,
  Database,
  Activity,
  Hash,
} from "lucide-react";

/* ================================================================
   UTF-8 Mojibake fixer
   Fixes double-encoded Latin-1 → UTF-8 (e.g. "JoÃ£o" → "João")
   and strips leftover replacement chars (�)
   ================================================================ */
const MOJIBAKE: [RegExp, string][] = [
  [/Ã£/g, "ã"], [/Ã¡/g, "á"], [/Ã¢/g, "â"], [/Ã /g, "à"],
  [/Ã©/g, "é"], [/Ãª/g, "ê"], [/Ã­/g, "í"],
  [/Ã³/g, "ó"], [/Ã´/g, "ô"], [/Ãµ/g, "õ"],
  [/Ãº/g, "ú"], [/Ã§/g, "ç"],
  [/Ã\x83/g, "Ã"], [/Ã‰/g, "É"], [/Ã"/g, "Ó"],
  [/Ã/g, "Á"], [/Ã/g, "Â"], [/Ã/g, "Ã"],
  [/Ã/g, "É"], [/Ã/g, "Í"], [/Ã/g, "Ó"],
  [/Ã/g, "Ú"], [/Ã/g, "Ç"],
  [/Ã£o/g, "ão"], [/Ã§Ã£o/g, "ção"], [/Ã§Ã£/g, "çã"],
  [/�/g, ""],
];

function fixUtf8(s: string): string {
  if (!s) return s;
  let out = s;
  for (const [re, rep] of MOJIBAKE) out = out.replace(re, rep);
  return out;
}

/* ================================================================
   Column definitions
   ================================================================ */
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

const DENSITY_CLS: Record<Density, { cell: string; row: string }> = {
  compact: { cell: "py-1.5 px-3", row: "h-8" },
  default: { cell: "py-2.5 px-4", row: "h-10" },
  comfortable: { cell: "py-3.5 px-4", row: "h-12" },
};

const PAGE_SIZES = [25, 50, 100, 250];

const GRADE_BADGE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  B: "bg-blue-100 text-blue-700 ring-blue-200",
  C: "bg-amber-100 text-amber-700 ring-amber-200",
  D: "bg-red-100 text-red-700 ring-red-200",
};

/* ================================================================
   Helpers
   ================================================================ */
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

function statusConfig(s: SheetMeta["status"]) {
  const map = {
    synced: { bg: "bg-emerald-500", ring: "ring-emerald-400/30", label: "Sincronizada", dot: "bg-emerald-400" },
    updating: { bg: "bg-blue-500", ring: "ring-blue-400/30", label: "Atualizando", dot: "bg-blue-400 animate-pulse" },
    error: { bg: "bg-red-500", ring: "ring-red-400/30", label: "Erro", dot: "bg-red-400" },
    empty: { bg: "bg-gray-400", ring: "ring-gray-300/30", label: "Sem dados", dot: "bg-gray-400" },
  };
  return map[s];
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

function isEmailCol(key: string) {
  return key === "email";
}

function isPhoneCol(key: string) {
  return key === "telefone";
}

function isScoreCol(key: string) {
  return key === "leadscore";
}

function isGradeCol(key: string) {
  return key === "notaFaixaLead";
}

/* ================================================================
   Main component
   ================================================================ */
export default function PlanilhasShell({
  captacao,
  questionario,
}: {
  captacao: { rows: CaptacaoRow[]; meta: SheetMeta };
  questionario: { rows: QuestionarioRow[]; meta: SheetMeta };
}) {
  const router = useRouter();
  const tableRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

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
    for (const [col, val] of Object.entries(columnFilters)) {
      if (!val) continue;
      const lower = val.toLowerCase();
      rows = rows.filter((r) => {
        const cell = (r as Record<string, string>)[col] ?? "";
        return fixUtf8(cell).toLowerCase().includes(lower);
      });
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((v) => v != null && fixUtf8(String(v)).toLowerCase().includes(q))
      );
    }
    if (sortCol && sortDir) {
      rows.sort((a, b) => {
        const va = fixUtf8((a as Record<string, string>)[sortCol] ?? "");
        const vb = fixUtf8((b as Record<string, string>)[sortCol] ?? "");
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
        else { setSortCol(null); setSortDir(null); }
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
      visibleColumns.map((c) => fixUtf8((r as Record<string, string>)[c.key] ?? ""))
    );
    downloadCsv(headers, rows, `planilha-${tab}-${Date.now()}.csv`);
  }, [visibleColumns, processedRows, tab]);

  const handleCopyVisible = useCallback(() => {
    const headers = visibleColumns.map((c) => c.label);
    const rows = processedRows.map((r) =>
      visibleColumns.map((c) => fixUtf8((r as Record<string, string>)[c.key] ?? ""))
    );
    const text = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    copyText(text);
  }, [visibleColumns, processedRows]);

  const handleCopyCell = useCallback((rowIdx: number, colKey: string, value: string) => {
    copyText(fixUtf8(value));
    setCopiedCell(`${rowIdx}-${colKey}`);
    setTimeout(() => setCopiedCell(null), 1200);
  }, []);

  const handleCopyRow = useCallback(
    (rowIdx: number) => {
      const row = pageRows[rowIdx];
      const text = visibleColumns.map((c) => fixUtf8((row as Record<string, string>)[c.key] ?? "")).join("\t");
      copyText(text);
      setCopiedRow(rowIdx);
      setTimeout(() => setCopiedRow(null), 1200);
    },
    [pageRows, visibleColumns]
  );

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setSearch("");
    setSortCol(null);
    setSortDir(null);
    setPage(0);
  }, []);

  const switchTab = useCallback((t: Tab) => {
    setTab(t);
    setPage(0);
    setSearch("");
    setColumnFilters({});
    setSortCol(null);
    setSortDir(null);
    setHiddenCols(new Set());
  }, []);

  const hasActiveFilters = search || Object.values(columnFilters).some(Boolean);
  const st = statusConfig(meta.status);

  /* ================================================================
     Render
     ================================================================ */
  return (
    <div className="flex flex-col gap-5">
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10">
              <Table2 size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Planilhas</h1>
              <p className="text-xs text-gray-500">
                Espelhamento fiel das bases conectadas ao sistema, com dados brutos e colunas originais.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Atualizar dados
          </button>
          <HeaderBtn icon={<Download size={13} />} label="Exportar CSV" onClick={handleExportCsv} />
          <HeaderBtn
            icon={<ExternalLink size={13} />}
            label="Abrir planilha"
            onClick={() => window.open("https://docs.google.com/spreadsheets", "_blank")}
          />
          <HeaderBtn
            icon={fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            onClick={handleToggleFullscreen}
          />
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <div className="flex items-center gap-6 border-b border-gray-200">
        {(["captacao", "questionario"] as const).map((t) => {
          const active = tab === t;
          const count = t === "captacao" ? captacao.meta.totalRows : questionario.meta.totalRows;
          return (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`relative flex items-center gap-2 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "captacao" ? "Captação" : "Questionário"}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {count.toLocaleString("pt-BR")}
              </span>
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* ---- Meta cards ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetaCard icon={<Rows3 size={14} />} label="Total de linhas" value={meta.totalRows.toLocaleString("pt-BR")} />
        <MetaCard icon={<Hash size={14} />} label="Total de colunas" value={String(meta.totalColumns)} />
        <MetaCard icon={<Clock size={14} />} label="Última atualização" value={timeAgo(meta.lastUpdate)} />
        <MetaCard icon={<Database size={14} />} label="Origem" value={meta.origin} small />
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${st.dot}`} />
            <span className="text-sm font-semibold text-gray-800">{st.label}</span>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Status</span>
        </div>
      </div>

      {/* ---- Toolbar ---- */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        {/* Search — wider */}
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar na planilha..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* View controls */}
        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
          <ToolbarBtn icon={<Filter size={14} />} label="Filtros" active={showFilterPanel} onClick={() => setShowFilterPanel(!showFilterPanel)} />
          <ToolbarBtn icon={<Columns3 size={14} />} label="Colunas" active={showColManager} onClick={() => setShowColManager(!showColManager)} />
          <select
            value={density}
            onChange={(e) => setDensity(e.target.value as Density)}
            className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs text-gray-600 outline-none focus:border-blue-300"
          >
            <option value="compact">Compacta</option>
            <option value="default">Padrão</option>
            <option value="comfortable">Confortável</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
          <ToolbarBtn icon={<RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />} label="Atualizar" onClick={handleRefresh} />
          <ToolbarBtn icon={<Download size={14} />} label="CSV" onClick={handleExportCsv} />
          <ToolbarBtn icon={<Copy size={14} />} label="Copiar" onClick={handleCopyVisible} />
          <ToolbarBtn icon={<ExternalLink size={14} />} label="Abrir" onClick={() => window.open("https://docs.google.com/spreadsheets", "_blank")} />
        </div>

        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="ml-auto flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100">
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>

      {/* ---- Column filter panel ---- */}
      {showFilterPanel && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibleColumns.map((col, i) => (
            <div key={`${col.key}-${i}`}>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">{col.label}</label>
              <input
                type="text"
                placeholder={`Filtrar...`}
                value={columnFilters[col.key] ?? ""}
                onChange={(e) => {
                  setColumnFilters((prev) => ({ ...prev, [col.key]: e.target.value }));
                  setPage(0);
                }}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
              />
            </div>
          ))}
        </div>
      )}

      {/* ---- Column visibility ---- */}
      {showColManager && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-4">
          <span className="mr-2 self-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">Visíveis:</span>
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
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all ${
                  hidden
                    ? "bg-gray-50 text-gray-400 ring-gray-200 line-through"
                    : "bg-blue-50 text-blue-700 ring-blue-200"
                }`}
              >
                {hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                {col.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ---- Table area ---- */}
      {meta.status === "error" ? (
        <ErrorState onRetry={handleRefresh} />
      ) : meta.status === "empty" || rawRows.length === 0 ? (
        <EmptyState onRefresh={handleRefresh} />
      ) : (
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm" style={{ minHeight: "480px" }}>
          <div ref={tableRef} className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              {/* Header */}
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 w-12 border-b border-r border-gray-200 bg-gray-100 px-2 py-2.5 text-center text-[10px] font-bold text-gray-400">
                    #
                  </th>
                  {visibleColumns.map((col, i) => (
                    <th
                      key={`${col.key}-${i}`}
                      onClick={() => handleSort(col.key)}
                      className="cursor-pointer select-none whitespace-nowrap border-b border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    >
                      <span className="flex items-center gap-1.5">
                        {col.label}
                        {sortCol === col.key ? (
                          sortDir === "asc" ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={10} className="text-gray-300" />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="sticky right-0 z-30 w-14 border-b border-l border-gray-200 bg-gray-100 px-2 py-2.5 text-center text-[10px] font-bold text-gray-400">
                    Ações
                  </th>
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {pageRows.map((row, ri) => {
                  const globalIdx = safePage * pageSize + ri + 1;
                  const isEven = ri % 2 === 0;
                  return (
                    <tr
                      key={ri}
                      className={`group transition-colors ${
                        copiedRow === ri
                          ? "bg-emerald-50"
                          : isEven
                            ? "bg-white hover:bg-blue-50/50"
                            : "bg-gray-50/40 hover:bg-blue-50/50"
                      }`}
                    >
                      {/* Row number — sticky left */}
                      <td className={`sticky left-0 z-10 w-12 border-r border-gray-100 text-center text-[10px] font-semibold tabular-nums text-gray-400 ${isEven ? "bg-white group-hover:bg-blue-50/50" : "bg-gray-50/40 group-hover:bg-blue-50/50"} ${DENSITY_CLS[density].cell}`}>
                        {globalIdx}
                      </td>

                      {/* Data cells */}
                      {visibleColumns.map((col, ci) => {
                        const raw = (row as Record<string, string>)[col.key] ?? "";
                        const val = fixUtf8(raw);
                        const cellId = `${ri}-${col.key}`;
                        return (
                          <td
                            key={`${col.key}-${ci}`}
                            className={`relative max-w-[280px] truncate whitespace-nowrap border-r border-gray-50 ${DENSITY_CLS[density].cell} ${cellTextClass(col.key, val)}`}
                            title={val}
                          >
                            <CellContent colKey={col.key} value={val} />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyCell(ri, col.key, val); }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100"
                              title="Copiar célula"
                            >
                              {copiedCell === cellId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </td>
                        );
                      })}

                      {/* Actions — sticky right */}
                      <td className={`sticky right-0 z-10 w-14 border-l border-gray-100 text-center ${isEven ? "bg-white group-hover:bg-blue-50/50" : "bg-gray-50/40 group-hover:bg-blue-50/50"} ${DENSITY_CLS[density].cell}`}>
                        <button
                          onClick={() => handleCopyRow(ri)}
                          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-600"
                          title="Copiar linha"
                        >
                          {copiedRow === ri ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ---- Pagination ---- */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
            <span className="text-xs text-gray-500">
              {processedRows.length.toLocaleString("pt-BR")} linha{processedRows.length !== 1 ? "s" : ""}
              {hasActiveFilters && " (filtradas)"}
              {" · "}
              Página {safePage + 1} de {totalPages}
            </span>
            <div className="flex items-center gap-3">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs text-gray-600 outline-none"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>{s} linhas</option>
                ))}
              </select>
              <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <PagBtn disabled={safePage === 0} onClick={() => setPage(0)} title="Primeira página">
                  <ChevronsLeft size={14} />
                </PagBtn>
                <PagBtn disabled={safePage === 0} onClick={() => setPage(safePage - 1)} title="Anterior">
                  <ChevronLeft size={14} />
                </PagBtn>
                <span className="min-w-[3rem] text-center text-xs font-medium tabular-nums text-gray-600">{safePage + 1}</span>
                <PagBtn disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)} title="Próxima">
                  <ChevronRight size={14} />
                </PagBtn>
                <PagBtn disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)} title="Última página">
                  <ChevronsRight size={14} />
                </PagBtn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Cell rendering helpers
   ================================================================ */
function cellTextClass(key: string, val: string): string {
  if (isEmailCol(key)) return "text-blue-600";
  if (isPhoneCol(key)) return "font-mono text-gray-600 tracking-wide";
  if (isScoreCol(key) && val) return "font-semibold tabular-nums text-gray-800";
  return "text-gray-700";
}

function CellContent({ colKey, value }: { colKey: string; value: string }) {
  if (!value) return <span className="text-gray-300">—</span>;

  if (isGradeCol(colKey)) {
    const cls = GRADE_BADGE[value.toUpperCase()];
    if (cls) {
      return (
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ${cls}`}>
          {value.toUpperCase()}
        </span>
      );
    }
  }

  if (isScoreCol(colKey)) {
    const n = Number(value);
    if (!isNaN(n)) {
      const color = n >= 80 ? "text-emerald-600" : n >= 50 ? "text-amber-600" : "text-red-500";
      return <span className={`font-semibold tabular-nums ${color}`}>{value}</span>;
    }
  }

  return <>{value}</>;
}

/* ================================================================
   Sub-components
   ================================================================ */
function MetaCard({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: string; small?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</div>
        <div className={`mt-0.5 truncate font-semibold text-gray-800 ${small ? "text-xs" : "text-sm"}`}>{value}</div>
      </div>
    </div>
  );
}

function HeaderBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800"
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function ToolbarBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
        active
          ? "border-blue-300 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function PagBtn({ disabled, onClick, title, children }: { disabled: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200/60 disabled:text-gray-300 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white py-24 text-center" style={{ minHeight: "480px" }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <Table2 size={28} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">Nenhum dado encontrado nesta planilha.</p>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-gray-400">
          A planilha está conectada, mas ainda não possui linhas para exibir.
        </p>
      </div>
      <button
        onClick={onRefresh}
        className="mt-1 flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
      >
        <RefreshCw size={13} />
        Atualizar dados
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-red-100 bg-white py-24 text-center" style={{ minHeight: "480px" }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">Não foi possível carregar esta planilha.</p>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-gray-400">
          Verifique permissões ou conexão com a origem dos dados.
        </p>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <RefreshCw size={13} />
          Tentar novamente
        </button>
        <a
          href="/integracoes"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-5 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Abrir integração
        </a>
      </div>
    </div>
  );
}
