"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

const GRADES = ["Todos", "A", "B", "C", "D"];

export default function LeadsFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const grade = sp.get("grade") ?? "Todos";

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "Todos") params.set(k, v);
      else params.delete(k);
    }
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q });
        }}
        className="relative"
      >
        <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar nome ou e-mail"
          className="w-56 rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 shadow-sm focus:border-gray-300 focus:outline-none"
        />
      </form>
      <div className="flex rounded-md bg-gray-100 p-0.5">
        {GRADES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => update({ grade: g })}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              grade === g
                ? "bg-white font-medium text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
