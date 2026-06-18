"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyField({ value, mask = false }: { value: string; mask?: boolean }) {
  const [copied, setCopied] = useState(false);
  const display = mask ? `${value.slice(0, 4)}••••${value.slice(-4)}` : value;

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-600 hover:bg-gray-100"
      title="Copiar"
    >
      <span className="truncate">{display}</span>
      {copied ? (
        <Check size={12} className="shrink-0 text-green-600" />
      ) : (
        <Copy size={12} className="shrink-0 text-gray-400" />
      )}
    </button>
  );
}
