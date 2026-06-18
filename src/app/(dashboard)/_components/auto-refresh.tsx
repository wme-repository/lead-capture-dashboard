"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [on, router, intervalMs]);

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md ${
        on ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? "bg-green-500" : "bg-gray-400"}`} />
      {on ? "ao vivo" : "pausado"}
    </button>
  );
}
