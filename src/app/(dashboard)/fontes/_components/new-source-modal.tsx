"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronRight, ChevronLeft, Check, Copy, Loader2 } from "lucide-react";

type Props = { onClose: () => void };

const STEPS = ["Dados básicos", "Tipo & Campos", "Destinos", "Webhook gerado"];

export default function NewSourceModal({ onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [schemaType, setSchemaType] = useState<"standard" | "questionnaire">("standard");
  const [sheetsId, setSheetsId] = useState("");
  const [sheetTab, setSheetTab] = useState("Leads");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ slug: string; token: string } | null>(null);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://leads.esqtools.com";

  const autoSlug = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          schemaType,
          sheetsId: sheetsId || null,
          sheetTab: sheetTab || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao criar fonte");
        return;
      }
      const data = await res.json();
      setResult({ slug: data.slug, token: data.token });
      setStep(3);
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  const copyField = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const canNext =
    step === 0 ? name.trim() && slug.trim()
    : step === 1 ? true
    : step === 2 ? true
    : false;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Nova Fonte</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                  i < step
                    ? "bg-green-100 text-green-700"
                    : i === step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < step ? <Check size={10} /> : i + 1}
              </div>
              <span className={`hidden text-[11px] sm:inline ${i === step ? "font-medium text-gray-900" : "text-gray-400"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="h-px w-4 bg-gray-200" />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-5 py-5 min-h-[200px]">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Nome da fonte
                </label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug || slug === autoSlug(name)) setSlug(autoSlug(e.target.value));
                  }}
                  placeholder="Ex: Landing Page TRT"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Slug (caminho do webhook)
                </label>
                <div className="flex items-center gap-0">
                  <span className="rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-400">
                    /api/webhook/
                  </span>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(autoSlug(e.target.value))}
                    className="w-full rounded-r-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-700">
                  Tipo da fonte
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "standard" as const, label: "Padrão (captação)", desc: "Nome, email, telefone, UTMs" },
                    { value: "questionnaire" as const, label: "Questionário", desc: "Nome, email, respostas, score" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSchemaType(opt.value)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        schemaType === opt.value
                          ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-900">{opt.label}</div>
                      <div className="mt-0.5 text-[11px] text-gray-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Google Sheets — ID da planilha (opcional)
                </label>
                <input
                  value={sheetsId}
                  onChange={(e) => setSheetsId(e.target.value)}
                  placeholder="Ex: 1Ppo8AxtrUtKuwmnEG..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Parte da URL: docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Nome da aba
                </label>
                <input
                  value={sheetTab}
                  onChange={(e) => setSheetTab(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-medium text-green-800">
                  Fonte criada com sucesso!
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase text-gray-400">
                  URL do Webhook
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-700">
                    {appUrl}/api/webhook/{result.slug}
                  </code>
                  <button
                    onClick={() => copyField("url", `${appUrl}/api/webhook/${result.slug}`)}
                    className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                  >
                    {copiedField === "url" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase text-gray-400">
                  Token
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-700">
                    {result.token}
                  </code>
                  <button
                    onClick={() => copyField("token", result.token)}
                    className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                  >
                    {copiedField === "token" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Compartilhe a planilha com{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">
                  leads-sheets-writer@leads-esqtools.iam.gserviceaccount.com
                </code>{" "}
                (Editor) para que o sync funcione.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          {step > 0 && step < 3 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft size={14} /> Voltar
            </button>
          ) : (
            <div />
          )}
          {step < 2 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Próximo <ChevronRight size={14} />
            </button>
          )}
          {step === 2 && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {creating ? "Criando..." : "Criar Fonte"}
            </button>
          )}
          {step === 3 && (
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </>
  );
}
