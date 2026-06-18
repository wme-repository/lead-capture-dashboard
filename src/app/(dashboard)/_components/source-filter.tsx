"use client";

import { useRouter } from "next/navigation";

type Option = { slug: string; name: string };

export default function SourceFilter({
  sources,
  selected,
}: {
  sources: Option[];
  selected?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selected ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v ? `/?source=${encodeURIComponent(v)}` : "/");
      }}
      className="rounded border border-gray-300 px-3 py-1.5 text-sm bg-white"
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
