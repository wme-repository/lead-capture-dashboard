import { Check, Clock, AlertTriangle } from "lucide-react";

const SCORE: Record<string, string> = {
  A: "bg-green-50 text-green-700",
  B: "bg-green-50 text-green-700",
  C: "bg-amber-50 text-amber-700",
  D: "bg-red-50 text-red-700",
};

export function ScoreBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-gray-300">—</span>;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
        SCORE[grade] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {grade}
    </span>
  );
}

export function SyncBadge({ logs }: { logs: { status: string }[] }) {
  if (logs.length === 0)
    return <span className="text-[11px] text-gray-400">sem destino</span>;
  const cls = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium";
  if (logs.some((l) => l.status === "failed"))
    return (
      <span className={`${cls} bg-red-50 text-red-700`}>
        <AlertTriangle size={11} /> erro
      </span>
    );
  if (logs.every((l) => l.status === "done" || l.status === "synced"))
    return (
      <span className={`${cls} bg-green-50 text-green-700`}>
        <Check size={11} /> sincronizado
      </span>
    );
  return (
    <span className={`${cls} bg-amber-50 text-amber-700`}>
      <Clock size={11} /> pendente
    </span>
  );
}
