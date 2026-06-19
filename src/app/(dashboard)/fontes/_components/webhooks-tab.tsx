"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SourceWithStats } from "@/lib/fontes";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Settings,
  Send,
  ExternalLink,
  Shield,
  Globe,
  Lock,
  RotateCw,
  ChevronRight,
  X,
  ScrollText,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

const BG = "#0d1117";
const CARD = "#161b22";
const BORDER = "#30363d";
const BORDER2 = "#21262d";
const TEXT = "#c9d1d9";
const MUTED = "#8b949e";
const ACCENT = "#58a6ff";
const GREEN = "#3fb950";
const RED = "#f85149";
const YELLOW = "#d29922";
const PURPLE = "#a371f7";

const PROD_HOST = "https://leads.segatools.com";

const SOURCE_DESC: Record<string, string> = {
  lead: "Recebe leads das landing pages com parâmetros UTM.",
  quest: "Recebe respostas do formulário de perguntas.",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };
  return { copied, copy };
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{
        background: active ? "rgba(63,185,80,0.12)" : "rgba(139,148,158,0.12)",
        color: active ? GREEN : MUTED,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: active ? GREEN : MUTED }}
      />
      {active ? "Ativo" : "Sem recebimentos"}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isQuest = type === "questionnaire";
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: isQuest ? "rgba(88,166,255,0.12)" : "rgba(139,148,158,0.1)",
        color: isQuest ? ACCENT : MUTED,
      }}
    >
      {isQuest ? "questionário" : "padrão"}
    </span>
  );
}

function MaskedToken({ token, show }: { token: string; show: boolean }) {
  return (
    <code
      className="rounded px-2 py-1 font-mono text-[11px]"
      style={{ background: "rgba(139,148,158,0.1)", color: MUTED }}
    >
      {show ? token : `${token.slice(0, 6)}······${token.slice(-4)}`}
    </code>
  );
}

function IconBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md p-1.5 transition-colors"
      style={{ color: active ? GREEN : MUTED }}
      title={title}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,148,158,0.1)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

/* ── Webhook Detail Drawer ── */
function WebhookDrawer({
  source,
  appUrl,
  onClose,
}: {
  source: SourceWithStats;
  appUrl: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { copied, copy } = useCopy();
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | {
    success: boolean;
    ms: number;
    sync?: { destination: string; status: string }[];
    error?: string;
  }>(null);
  const [rotating, setRotating] = useState(false);

  const prodUrl = `${PROD_HOST}/api/webhook/${source.slug}`;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/sources/${source.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setTestResult(await res.json());
    } catch {
      setTestResult({ success: false, ms: 0 });
    } finally {
      setTesting(false);
    }
  };

  const handleRotate = async () => {
    if (!confirm("Rotacionar o token? O token antigo deixará de funcionar imediatamente.")) return;
    setRotating(true);
    try {
      await fetch(`/api/sources/${source.id}/rotate-token`, { method: "POST" });
      router.refresh();
    } finally {
      setRotating(false);
    }
  };

  const examplePayload =
    source.schemaType === "questionnaire"
      ? JSON.stringify(
          {
            nome: "João Silva",
            email: "joao@email.com",
            telefone: "11999999999",
            answers: {
              nivel_concursos: "Intermediário",
              estudou_tribunal: "Sim",
              motivo_projeto: "Aprovação no TRT até 2027",
            },
            score: 72,
            grade: "B",
          },
          null,
          2
        )
      : JSON.stringify(
          {
            nome: "João Silva",
            email: "joao@email.com",
            telefone: "11999999999",
            utm_source: "google",
            utm_medium: "cpc",
            utm_campaign: "promo_maio",
            landing_page: "lp-promocao",
          },
          null,
          2
        );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col shadow-2xl"
        style={{ background: CARD, borderLeft: `1px solid ${BORDER}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold" style={{ color: TEXT }}>
                {source.name}
              </h2>
              <TypeBadge type={source.schemaType} />
            </div>
            <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
              Detalhes do webhook
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors"
            style={{ color: MUTED }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,148,158,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Leads", value: source.leadCount, color: ACCENT },
              { label: "Destinos", value: source.destinations.length, color: PURPLE },
              { label: "Status", value: source.leadCount > 0 ? "Ativo" : "—", color: source.leadCount > 0 ? GREEN : MUTED },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-lg p-3 text-center"
                style={{ background: BG, border: `1px solid ${BORDER2}` }}
              >
                <div className="text-lg font-bold" style={{ color: c.color }}>
                  {c.value}
                </div>
                <div className="text-[10px] font-medium" style={{ color: MUTED }}>
                  {c.label}
                </div>
              </div>
            ))}
          </div>

          {/* Endpoint */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
              Endpoint
            </label>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 truncate rounded-lg px-3 py-2 font-mono text-[11px]"
                style={{ background: BG, border: `1px solid ${BORDER2}`, color: TEXT }}
              >
                {prodUrl}
              </code>
              <IconBtn onClick={() => copy("url", prodUrl)} title="Copiar URL" active={copied === "url"}>
                {copied === "url" ? <Check size={14} /> : <Copy size={14} />}
              </IconBtn>
            </div>
          </div>

          {/* Token */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
              Token de autenticação
            </label>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 truncate rounded-lg px-3 py-2 font-mono text-[11px]"
                style={{ background: BG, border: `1px solid ${BORDER2}`, color: TEXT }}
              >
                {showToken ? source.token : `${source.token.slice(0, 6)}······${source.token.slice(-4)}`}
              </code>
              <IconBtn onClick={() => setShowToken(!showToken)} title={showToken ? "Ocultar" : "Mostrar"}>
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </IconBtn>
              <IconBtn onClick={() => copy("token", source.token)} title="Copiar token" active={copied === "token"}>
                {copied === "token" ? <Check size={14} /> : <Copy size={14} />}
              </IconBtn>
            </div>
            <button
              onClick={handleRotate}
              disabled={rotating}
              className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
              style={{ color: YELLOW }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(210,153,34,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Shield size={12} />
              {rotating ? "Rotacionando..." : "Rotacionar token"}
            </button>
          </div>

          {/* Autenticação */}
          <div
            className="rounded-lg p-4 space-y-3"
            style={{ background: BG, border: `1px solid ${BORDER2}` }}
          >
            <div className="flex items-center gap-2">
              <Lock size={14} style={{ color: ACCENT }} />
              <span className="text-xs font-semibold" style={{ color: TEXT }}>
                Autenticação obrigatória
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>
                  Header
                </div>
                <code className="mt-1 block text-[11px] font-mono" style={{ color: TEXT }}>
                  x-webhook-token
                </code>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>
                  Valor
                </div>
                <code className="mt-1 block text-[11px] font-mono" style={{ color: MUTED }}>
                  [token da fonte]
                </code>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
              Todas as requisições devem enviar esse header com o token correspondente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => copy("header", "x-webhook-token")}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
                style={{ color: ACCENT, background: "rgba(88,166,255,0.08)" }}
              >
                {copied === "header" ? <Check size={10} /> : <Copy size={10} />}
                Copiar header
              </button>
              <button
                onClick={() =>
                  copy(
                    "example",
                    `curl -X POST ${prodUrl} \\\n  -H "Content-Type: application/json" \\\n  -H "x-webhook-token: ${source.token}" \\\n  -d '${examplePayload}'`
                  )
                }
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
                style={{ color: ACCENT, background: "rgba(88,166,255,0.08)" }}
              >
                {copied === "example" ? <Check size={10} /> : <Copy size={10} />}
                Copiar exemplo
              </button>
            </div>
          </div>

          {/* Exemplo de payload */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
              Exemplo de payload (JSON)
            </label>
            <div
              className="rounded-lg p-3"
              style={{ background: BG, border: `1px solid ${BORDER2}` }}
            >
              <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed" style={{ color: GREEN }}>
                {examplePayload}
              </pre>
            </div>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className="rounded-lg p-3"
              style={{
                background: testResult.success ? "rgba(63,185,80,0.08)" : "rgba(248,81,73,0.08)",
                border: `1px solid ${testResult.success ? "rgba(63,185,80,0.3)" : "rgba(248,81,73,0.3)"}`,
              }}
            >
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: testResult.success ? GREEN : RED }}>
                {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {testResult.success ? "Lead teste enviado com sucesso" : "Falha no envio"}
                <span style={{ color: MUTED }}>({testResult.ms}ms)</span>
              </div>
              {testResult.sync && (
                <div className="mt-2 space-y-1">
                  {testResult.sync.map((s) => (
                    <div key={s.destination} className="flex items-center gap-1.5 text-[11px]">
                      {s.status === "done" ? (
                        <Check size={11} style={{ color: GREEN }} />
                      ) : (
                        <X size={11} style={{ color: RED }} />
                      )}
                      <span style={{ color: TEXT }}>
                        {s.destination === "sheets" ? "Google Sheets" : s.destination}: {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 space-y-2" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: ACCENT }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#4090e0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
            >
              {testing ? <RotateCw size={13} className="animate-spin" /> : <Send size={13} />}
              {testing ? "Enviando..." : "Testar webhook"}
            </button>
            <button
              onClick={() => copy("curl-full", `curl -X POST ${prodUrl} -H "Content-Type: application/json" -H "x-webhook-token: ${source.token}" -d '${examplePayload}'`)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2129")}
              onMouseLeave={(e) => (e.currentTarget.style.background = BG)}
            >
              {copied === "curl-full" ? <Check size={13} style={{ color: GREEN }} /> : <Copy size={13} />}
              Copiar cURL
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main WebhooksTab ── */
type Props = {
  sources: SourceWithStats[];
  appUrl: string;
};

export default function WebhooksTab({ sources, appUrl }: Props) {
  const { copied, copy } = useCopy();
  const [tokenVisibility, setTokenVisibility] = useState<Record<string, boolean>>({});
  const [drawerSource, setDrawerSource] = useState<SourceWithStats | null>(null);

  const toggleToken = (id: string) =>
    setTokenVisibility((prev) => ({ ...prev, [id]: !prev[id] }));

  if (sources.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl px-6 py-16 text-center"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <Globe size={32} style={{ color: MUTED, opacity: 0.5 }} />
        <p className="text-sm font-medium" style={{ color: TEXT }}>
          Nenhum webhook cadastrado.
        </p>
        <p className="text-xs" style={{ color: MUTED }}>
          Cadastre uma nova fonte para gerar endpoints de recebimento de leads.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Table */}
        <div className="overflow-hidden rounded-xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER2}` }}>
                  {["Nome", "Endpoint / URL", "Método", "Autenticação", "Token", "Tipo", "Leads", "Último recebimento", "Status", "Ações"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 6 ? "text-right" : ""}`}
                        style={{ color: MUTED }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => {
                  const prodUrl = `${PROD_HOST}/api/webhook/${s.slug}`;
                  const showTk = tokenVisibility[s.id] ?? false;
                  return (
                    <tr
                      key={s.id}
                      className="group transition-colors"
                      style={{ borderBottom: `1px solid ${BORDER2}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Nome */}
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium" style={{ color: TEXT }}>{s.name}</div>
                          <div className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
                            {SOURCE_DESC[s.slug] ?? "Fonte de captação de leads."}
                          </div>
                        </div>
                      </td>

                      {/* Endpoint */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <code
                            className="max-w-[260px] truncate rounded px-2 py-1 font-mono text-[11px]"
                            style={{ background: "rgba(139,148,158,0.08)", color: ACCENT }}
                            title={prodUrl}
                          >
                            {prodUrl}
                          </code>
                          <IconBtn
                            onClick={() => copy(`url-${s.id}`, prodUrl)}
                            title="Copiar URL"
                            active={copied === `url-${s.id}`}
                          >
                            {copied === `url-${s.id}` ? <Check size={12} /> : <Copy size={12} />}
                          </IconBtn>
                        </div>
                      </td>

                      {/* Método */}
                      <td className="px-4 py-4">
                        <span
                          className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: "rgba(63,185,80,0.12)", color: GREEN }}
                        >
                          POST
                        </span>
                      </td>

                      {/* Autenticação */}
                      <td className="px-4 py-4">
                        <code className="text-[11px] font-mono" style={{ color: MUTED }}>
                          x-webhook-token
                        </code>
                      </td>

                      {/* Token */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <MaskedToken token={s.token} show={showTk} />
                          <IconBtn onClick={() => toggleToken(s.id)} title={showTk ? "Ocultar" : "Mostrar"}>
                            {showTk ? <EyeOff size={12} /> : <Eye size={12} />}
                          </IconBtn>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-4">
                        <TypeBadge type={s.schemaType} />
                      </td>

                      {/* Leads */}
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold tabular-nums" style={{ color: TEXT }}>
                          {s.leadCount.toLocaleString("pt-BR")}
                        </span>
                      </td>

                      {/* Último recebimento */}
                      <td className="px-4 py-4">
                        <span className="text-[11px]" style={{ color: MUTED }}>
                          {timeAgo(s.lastLeadAt)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge active={s.leadCount > 0} />
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDrawerSource(s)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                            style={{ color: ACCENT }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(88,166,255,0.1)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Settings size={12} /> Gerenciar
                          </button>
                          <IconBtn
                            onClick={() => copy(`tk-${s.id}`, s.token)}
                            title="Copiar Token"
                            active={copied === `tk-${s.id}`}
                          >
                            {copied === `tk-${s.id}` ? <Check size={12} /> : <Copy size={12} />}
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y md:hidden" style={{ borderColor: BORDER2 }}>
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => setDrawerSource(s)}
                className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: TEXT }}>{s.name}</span>
                    <StatusBadge active={s.leadCount > 0} />
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: MUTED }}>
                    {SOURCE_DESC[s.slug] ?? "Fonte de captação de leads."}
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: MUTED }}>
                    {PROD_HOST}/api/webhook/{s.slug} · {s.leadCount} leads
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: MUTED }} className="shrink-0" />
              </button>
            ))}
          </div>

          {/* Pagination hint */}
          <div
            className="flex items-center justify-center gap-3 px-4 py-3 text-[11px]"
            style={{ borderTop: `1px solid ${BORDER2}`, color: MUTED }}
          >
            1–{sources.length} de {sources.length}
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold"
              style={{ background: ACCENT, color: "#fff" }}
            >
              1
            </span>
          </div>
        </div>

        {/* Bottom sections: Como funciona + Autenticação */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Como funciona */}
          <div
            className="rounded-xl p-5"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <h3 className="mb-4 text-sm font-semibold" style={{ color: TEXT }}>
              Como funciona
            </h3>
            <div className="space-y-3">
              {[
                "A landing page envia os dados do lead para o endpoint (URL) configurado.",
                "A requisição é feita via método POST com payload em JSON.",
                "O header x-webhook-token é obrigatório e deve conter o token da fonte.",
                "O token é validado para garantir que a requisição é autorizada.",
                "Os dados do lead são processados e armazenados no sistema.",
                "O status e o histórico ficam disponíveis nas abas Logs e Falhas.",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: "rgba(88,166,255,0.12)", color: ACCENT }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Autenticação obrigatória */}
          <div
            className="rounded-xl p-5"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <h3 className="mb-4 text-sm font-semibold" style={{ color: TEXT }}>
              Autenticação obrigatória
            </h3>

            <div className="space-y-4">
              <div
                className="rounded-lg p-4"
                style={{ background: BG, border: `1px solid ${BORDER2}` }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                      Header
                    </div>
                    <code className="mt-1 block text-sm font-mono font-medium" style={{ color: ACCENT }}>
                      x-webhook-token
                    </code>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                      Valor
                    </div>
                    <code className="mt-1 block text-sm font-mono" style={{ color: MUTED }}>
                      [token da fonte]
                    </code>
                  </div>
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                Todas as requisições para este webhook devem enviar o header{" "}
                <code className="rounded px-1 py-0.5 font-mono text-[11px]" style={{ background: "rgba(139,148,158,0.1)", color: TEXT }}>
                  x-webhook-token
                </code>{" "}
                com o token correspondente da fonte.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => copy("hdr-name", "x-webhook-token")}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                  style={{ color: ACCENT, background: "rgba(88,166,255,0.08)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(88,166,255,0.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(88,166,255,0.08)")}
                >
                  {copied === "hdr-name" ? <Check size={11} /> : <Copy size={11} />}
                  Copiar header
                </button>
                <button
                  onClick={() =>
                    copy(
                      "hdr-example",
                      `POST /api/webhook/lead\nContent-Type: application/json\nx-webhook-token: <seu-token>\n\n{\n  "nome": "João Silva",\n  "email": "joao@email.com"\n}`
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                  style={{ color: ACCENT, background: "rgba(88,166,255,0.08)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(88,166,255,0.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(88,166,255,0.08)")}
                >
                  {copied === "hdr-example" ? <Check size={11} /> : <Copy size={11} />}
                  Copiar exemplo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {drawerSource && (
        <WebhookDrawer source={drawerSource} appUrl={appUrl} onClose={() => setDrawerSource(null)} />
      )}
    </>
  );
}
