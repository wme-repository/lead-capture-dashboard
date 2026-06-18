"use client";

import { useState, useEffect } from "react";
import type { SourceWithStats } from "@/lib/fontes";
import { useRouter } from "next/navigation";
import {
  X,
  Copy,
  Check,
  Send,
  ScrollText,
  RotateCw,
  Trash2,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://leads.esqtools.com";

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };
  return { copied, copy };
}

type Props = {
  source: SourceWithStats;
  appUrl: string;
  onClose: () => void;
};

export default function SourceDrawer({ source, appUrl, onClose }: Props) {
  const router = useRouter();
  const { copied, copy } = useCopy();
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { success: boolean; ms: number; sync?: { destination: string; status: string }[] }>(null);
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const webhookUrl = `${appUrl}/api/webhook/${source.slug}`;

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
      const data = await res.json();
      setTestResult(data);
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sources/${source.id}`, { method: "DELETE" });
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "Erro ao excluir");
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{source.name}</h2>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">
                /{source.slug}
              </code>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium">
                {source.schemaType === "questionnaire" ? "questionário" : "padrão"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-lg font-semibold text-gray-900">{source.leadCount}</div>
              <div className="text-[10px] text-gray-500">leads</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-lg font-semibold text-gray-900">
                {source.destinations.length}
              </div>
              <div className="text-[10px] text-gray-500">destinos</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className={`text-lg font-semibold ${source.leadCount > 0 ? "text-green-600" : "text-gray-400"}`}>
                {source.leadCount > 0 ? "ativa" : "—"}
              </div>
              <div className="text-[10px] text-gray-500">status</div>
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase text-gray-400">
              URL do Webhook
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-700">
                {webhookUrl}
              </code>
              <button
                onClick={() => copy("url", webhookUrl)}
                className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                {copied === "url" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Token */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase text-gray-400">
              Token (header x-webhook-token)
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-700">
                {showToken ? source.token : `${source.token.slice(0, 6)}••••••••${source.token.slice(-4)}`}
              </code>
              <button
                onClick={() => setShowToken(!showToken)}
                className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={() => copy("token", source.token)}
                className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                {copied === "token" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Destinations */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase text-gray-400">
              Destinos conectados
            </label>
            <div className="flex flex-wrap gap-2">
              {source.destinations.length === 0 ? (
                <span className="text-xs text-gray-400">Nenhum destino configurado</span>
              ) : (
                source.destinations.map((d) => (
                  <span
                    key={d}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      d === "sheets"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {d === "sheets" ? "Google Sheets" : d === "datacrazy" ? "DataCrazy" : d}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={`rounded-lg border p-3 ${
                testResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className={`text-xs font-medium ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                {testResult.success ? "Lead teste enviado com sucesso" : "Falha no envio"} ({testResult.ms}ms)
              </div>
              {testResult.sync && (
                <div className="mt-2 space-y-1">
                  {testResult.sync.map((s) => (
                    <div key={s.destination} className="flex items-center gap-1.5 text-[11px]">
                      {s.status === "done" ? (
                        <Check size={11} className="text-green-600" />
                      ) : (
                        <X size={11} className="text-red-600" />
                      )}
                      <span className="text-gray-700">
                        {s.destination === "sheets" ? "Google Sheets" : s.destination}: {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions footer */}
        <div className="border-t border-gray-200 px-5 py-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {testing ? <RotateCw size={13} className="animate-spin" /> : <Send size={13} />}
              {testing ? "Enviando..." : "Enviar Teste"}
            </button>
            <button
              onClick={() => copy("curl", `curl -X POST ${webhookUrl} -H "Content-Type: application/json" -H "x-webhook-token: ${source.token}" -d '{"name":"Teste","email":"teste@email.com"}'`)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied === "curl" ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              Copiar cURL
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleRotate}
              disabled={rotating}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              <Shield size={13} />
              {rotating ? "Rotacionando..." : "Rotacionar Token"}
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={13} />
                Excluir
              </button>
            ) : (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={13} />
                {deleting ? "Excluindo..." : "Confirmar exclusão"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
