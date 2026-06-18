"use client";

import { useState } from "react";
import type { SourceWithStats } from "@/lib/fontes";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
      title={`Copiar ${label}`}
    >
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      {label}
    </button>
  );
}

function MaskedToken({ token }: { token: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-1.5">
      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600">
        {show ? token : `${token.slice(0, 6)}••••••••${token.slice(-4)}`}
      </code>
      <button
        onClick={() => setShow(!show)}
        className="text-gray-400 hover:text-gray-600"
        title={show ? "Ocultar" : "Mostrar"}
      >
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}

type Props = {
  sources: SourceWithStats[];
  appUrl: string;
};

export default function WebhooksTab({ sources, appUrl }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-4 py-2.5 font-medium text-gray-500">Nome</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">URL</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Método</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Token</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Tipo</th>
              <th className="px-4 py-2.5 font-medium text-gray-500 text-right">Leads</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sources.map((s) => {
              const url = `${appUrl}/api/webhook/${s.slug}`;
              return (
                <tr key={s.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.name}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 break-all">
                      {url}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      POST
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <MaskedToken token={s.token} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {s.schemaType === "questionnaire" ? "questionário" : "padrão"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                    {s.leadCount.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <CopyBtn value={url} label="URL" />
                      <CopyBtn value={s.token} label="Token" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Payload example */}
      <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase text-gray-400">
          Header obrigatório
        </p>
        <code className="text-[11px] text-gray-600">
          x-webhook-token: &lt;token&gt;
        </code>
      </div>
    </div>
  );
}
