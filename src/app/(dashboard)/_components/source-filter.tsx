"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { slug: string; name: string };

export default function SourceFilter({
  sources,
  basePath = "/",
}: {
  sources: Option[];
  basePath?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const selected = sp.get("source") ?? "";

  function go(value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set("source", value);
    else params.delete("source");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <select
      value={selected}
      onChange={(e) => go(e.target.value)}
      className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm hover:border-gray-300"
    >
      <option value="">Todas as campanhas</option>
      {sources.map((s) => (
        <option key={s.slug} value={s.slug}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
