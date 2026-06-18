"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTS: { value: string; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

export default function PeriodFilter({ basePath = "/" }: { basePath?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("period") ?? "7d";

  function go(value: string) {
    const params = new URLSearchParams(sp.toString());
    params.set("period", value);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex rounded-md bg-gray-100 p-0.5">
      {OPTS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => go(o.value)}
          className={`rounded px-2.5 py-1 text-xs transition-colors ${
            current === o.value
              ? "bg-white font-medium text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
