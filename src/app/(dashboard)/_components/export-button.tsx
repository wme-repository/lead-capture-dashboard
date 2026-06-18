"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type LeadRow = {
  receivedAt: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  score: number | null;
  grade: string | null;
  status: string;
  source?: { name: string } | null;
};

function csvCell(v: unknown): string {
  return `"${(v ?? "").toString().replace(/"/g, '""')}"`;
}

export default function ExportButton({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const { leads } = (await res.json()) as { leads: LeadRow[] };
      const header = [
        "recebido",
        "nome",
        "email",
        "telefone",
        "campanha",
        "utm_source",
        "utm_campaign",
        "score",
        "grade",
        "status",
      ];
      const rows = leads.map((l) =>
        [
          l.receivedAt,
          l.name,
          l.email,
          l.phone,
          l.source?.name,
          l.utmSource,
          l.utmCampaign,
          l.score,
          l.grade,
          l.status,
        ]
          .map(csvCell)
          .join(",")
      );
      const csv = [header.map(csvCell).join(","), ...rows].join("\n");
      const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast(`${leads.length} leads exportados`);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        <Download size={14} />
        {compact ? "" : loading ? "Exportando…" : "CSV"}
      </button>
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          {toast}
        </div>
      )}
    </>
  );
}
