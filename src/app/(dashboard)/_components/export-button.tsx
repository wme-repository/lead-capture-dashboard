"use client";

import { useState } from "react";

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

export default function ExportButton() {
  const [loading, setLoading] = useState(false);

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
        ].map(csvCell).join(",")
      );
      const csv = [header.map(csvCell).join(","), ...rows].join("\n");
      const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
    >
      {loading ? "exportando…" : "exportar CSV"}
    </button>
  );
}
