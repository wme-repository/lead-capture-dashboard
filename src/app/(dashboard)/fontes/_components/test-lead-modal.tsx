"use client";

import { useState } from "react";
import type { SourceWithStats } from "@/lib/fontes";
import { X, Send, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

const DEFAULT_PAYLOADS: Record<string, object> = {
  standard: {
    name: "Lead Teste",
    email: "teste@leads.esqtools.com",
    phone: "11999990000",
    pagina_captura: "teste",
    utm_source: "dashboard-test",
    utm_medium: "test",
    utm_campaign: "test",
  },
  questionnaire: {
    name: "Lead Teste",
    email: "teste@leads.esqtools.com",
    phone: "11999990000",
    answers: {
      nivel_concursos: "Teste",
      estudou_tribunal: "Sim",
      conhece_thallius: "Não",
      motivo_projeto: "Teste",
      idade: "30",
      renda: "Teste",
      genero: "Teste",
      escolaridade: "Teste",
      situacao: "Teste",
      tempo_esquadrao: "Teste",
      expectativas: "Teste automático",
    },
    score: 50,
    grade: "C",
  },
};

type SyncResult = { destination: string; status: string; error: string | null };
type TestResult = {
  success: boolean;
  leadId?: string;
  status?: number;
  ms: number;
  sync?: SyncResult[];
  error?: string;
};

type Props = {
  sources: SourceWithStats[];
  onClose: () => void;
};

export default function TestLeadModal({ sources, onClose }: Props) {
  const [selectedId, setSelectedId] = useState(sources[0]?.id ?? "");
  const selected = sources.find((s) => s.id === selectedId);
  const [payload, setPayload] = useState(
    JSON.stringify(DEFAULT_PAYLOADS[selected?.schemaType ?? "standard"], null, 2)
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleSourceChange = (id: string) => {
    setSelectedId(id);
    const s = sources.find((src) => src.id === id);
    setPayload(JSON.stringify(DEFAULT_PAYLOADS[s?.schemaType ?? "standard"], null, 2));
    setResult(null);
  };

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      let parsedPayload: unknown;
      try {
        parsedPayload = JSON.parse(payload);
      } catch {
        setResult({ success: false, ms: 0, error: "JSON inválido" });
        return;
      }

      const res = await fetch(`/api/sources/${selectedId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: parsedPayload }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, ms: 0, error: String(err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[8%] z-50 mx-auto flex max-h-[80vh] max-w-lg flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Enviar Lead Teste</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Source selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Fonte</label>
            <select
              value={selectedId}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (/{s.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Payload editor */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Payload JSON</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              spellCheck={false}
            />
          </div>

          {/* Result */}
          {result && (
            <div
              className={`rounded-lg border p-4 ${
                result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <div className={`flex items-center gap-2 text-xs font-medium ${result.success ? "text-green-800" : "text-red-800"}`}>
                {result.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {result.success ? "Lead criado com sucesso" : "Falha no envio"}
                <span className="text-gray-500">({result.ms}ms)</span>
              </div>

              {result.error && (
                <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[11px] text-red-700">
                  {result.error}
                </pre>
              )}

              {result.sync && result.sync.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="text-[11px] font-medium text-gray-600">
                    Sincronização por destino:
                  </div>
                  {result.sync.map((s) => (
                    <div key={s.destination} className="flex items-center gap-2 text-[11px]">
                      {s.status === "done" ? (
                        <CheckCircle2 size={12} className="text-green-600" />
                      ) : s.status === "failed" ? (
                        <XCircle size={12} className="text-red-600" />
                      ) : (
                        <Clock size={12} className="text-amber-600" />
                      )}
                      <span className="font-medium text-gray-700">
                        {s.destination === "sheets" ? "Google Sheets" : s.destination}
                      </span>
                      <span className="text-gray-500">{s.status}</span>
                      {s.error && (
                        <span className="text-red-600">— {s.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.leadId && (
                <div className="mt-2 text-[10px] text-gray-500">
                  Lead ID: <code className="rounded bg-white/50 px-1 py-0.5">{result.leadId}</code>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Fechar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? "Enviando..." : "Enviar Teste"}
          </button>
        </div>
      </div>
    </>
  );
}
