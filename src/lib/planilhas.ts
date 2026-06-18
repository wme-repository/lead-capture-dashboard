import { prisma } from "@/lib/prisma";

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

function toBRT(d: Date) {
  return new Date(d.getTime() - BRT_OFFSET_MS);
}

export type CaptacaoRow = {
  dataInscricao: string;
  hora: string;
  nome: string;
  email: string;
  telefone: string;
  paginaCaptura: string;
  pesquisa: string;
  grupo: string;
  utmCampaign: string;
  utmMedium: string;
  utmSource: string;
  utmContent: string;
  utmTerm: string;
  utmMedium2: string;
};

export type QuestionarioRow = {
  nome: string;
  email: string;
  telefone: string;
  leadscore: string;
  notaFaixaLead: string;
  [key: string]: string;
};

export type SheetMeta = {
  totalRows: number;
  totalColumns: number;
  lastUpdate: string | null;
  origin: string;
  status: "synced" | "updating" | "error" | "empty";
};

export type PlanilhasData = {
  captacao: { rows: CaptacaoRow[]; meta: SheetMeta };
  questionario: { rows: QuestionarioRow[]; meta: SheetMeta };
};

export async function getPlanilhasData(): Promise<PlanilhasData> {
  const [captLeads, questLeads, lastSync] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { receivedAt: "desc" },
      take: 5000,
      select: {
        name: true,
        email: true,
        phone: true,
        paginaCaptura: true,
        pesquisa: true,
        grupo: true,
        utmCampaign: true,
        utmMedium: true,
        utmSource: true,
        utmContent: true,
        utmTerm: true,
        score: true,
        grade: true,
        answers: true,
        receivedAt: true,
      },
    }),
    prisma.lead.findMany({
      where: { OR: [{ score: { not: null } }, { grade: { not: null } }] },
      orderBy: { receivedAt: "desc" },
      take: 5000,
      select: {
        name: true,
        email: true,
        phone: true,
        score: true,
        grade: true,
        answers: true,
        receivedAt: true,
      },
    }),
    prisma.syncLog.findFirst({ orderBy: { attemptedAt: "desc" }, select: { attemptedAt: true } }),
  ]);

  const captacaoRows: CaptacaoRow[] = captLeads.map((l) => {
    const brt = toBRT(l.receivedAt);
    return {
      dataInscricao: brt.toISOString().slice(0, 10).split("-").reverse().join("/"),
      hora: brt.toISOString().slice(11, 16),
      nome: l.name ?? "",
      email: l.email ?? "",
      telefone: l.phone ?? "",
      paginaCaptura: l.paginaCaptura ?? "",
      pesquisa: l.pesquisa ?? "",
      grupo: l.grupo ?? "",
      utmCampaign: l.utmCampaign ?? "",
      utmMedium: l.utmMedium ?? "",
      utmSource: l.utmSource ?? "",
      utmContent: l.utmContent ?? "",
      utmTerm: l.utmTerm ?? "",
      utmMedium2: l.utmMedium ?? "",
    };
  });

  const questionarioRows: QuestionarioRow[] = questLeads.map((l) => {
    const base: QuestionarioRow = {
      nome: l.name ?? "",
      email: l.email ?? "",
      telefone: l.phone ?? "",
      leadscore: l.score != null ? String(l.score) : "",
      notaFaixaLead: l.grade ?? "",
    };
    if (l.answers && typeof l.answers === "object" && !Array.isArray(l.answers)) {
      const ans = l.answers as Record<string, unknown>;
      for (const [k, v] of Object.entries(ans)) {
        base[k] = v != null ? String(v) : "";
      }
    }
    return base;
  });

  const questColumns = new Set<string>(["nome", "email", "telefone", "leadscore", "notaFaixaLead"]);
  for (const row of questionarioRows) {
    for (const k of Object.keys(row)) questColumns.add(k);
  }

  const lastUpdateIso = lastSync?.attemptedAt?.toISOString() ?? captLeads[0]?.receivedAt?.toISOString() ?? null;

  return {
    captacao: {
      rows: captacaoRows,
      meta: {
        totalRows: captacaoRows.length,
        totalColumns: 14,
        lastUpdate: lastUpdateIso,
        origin: "Google Sheets — Captação",
        status: captacaoRows.length > 0 ? "synced" : "empty",
      },
    },
    questionario: {
      rows: questionarioRows,
      meta: {
        totalRows: questionarioRows.length,
        totalColumns: questColumns.size,
        lastUpdate: lastUpdateIso,
        origin: "Google Sheets — Questionário",
        status: questionarioRows.length > 0 ? "synced" : "empty",
      },
    },
  };
}
