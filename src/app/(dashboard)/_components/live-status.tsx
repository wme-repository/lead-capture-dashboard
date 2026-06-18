"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LiveStatus({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => {
      router.refresh();
      setSecs(0);
    }, intervalMs);
    return () => clearInterval(id);
  }, [on, router, intervalMs]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
          on ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${on ? "animate-pulse bg-green-500" : "bg-gray-400"}`}
        />
        {on ? "Ao vivo" : "Pausado"}
      </button>
      <span className="text-[11px] text-gray-400">
        {on ? `Atualizado há ${secs}s` : "Atualização pausada"}
      </span>
    </div>
  );
}
