import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { triggerIntegrations } from "@/lib/integrations/trigger";
import {
  StandardLeadSchema,
  QuestionnaireLeadSchema,
} from "@/lib/schemas/webhook";

function deriveLp(explicit?: string, paginaCaptura?: string): string | null {
  if (explicit) return explicit;
  if (!paginaCaptura) return null;
  if (paginaCaptura.includes("trt.oesquadraodeelite.com.br")) return "LP01";
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Look up source
  const source = await prisma.source.findUnique({ where: { slug } });
  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Log incoming request origin
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  const referer = request.headers.get("referer") ?? "none";
  const origin = request.headers.get("origin") ?? "none";
  console.log(`[webhook] slug=${slug} ip=${ip} ua=${ua} origin=${origin} referer=${referer}`);

  // 3. Parse body — accept JSON, form-encoded, or multipart
  const contentType = request.headers.get("content-type") ?? "";
  let body: Record<string, unknown> | null = null;
  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      body = {};
      for (const [key, value] of form.entries()) {
        body[key] = typeof value === "string" ? value : value.name;
      }
    } else {
      // Fallback: try JSON
      body = await request.json();
    }
  } catch {
    body = null;
  }
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  console.log(`[webhook] body keys: ${Object.keys(body).join(",")}`);
  if (slug === "lead") {
    console.log(`[webhook] FULL BODY: ${JSON.stringify(body)}`);
  }

  // 4. Validate against schema for this source
  const schema =
    source.schemaType === "questionnaire"
      ? QuestionnaireLeadSchema
      : StandardLeadSchema;

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 422 }
    );
  }

  // 5. Map validated data to individual columns
  const data = result.data;
  const isQuestionnaire = source.schemaType === "questionnaire";

  const leadData = isQuestionnaire
    ? {
        sourceId: source.id,
        schemaType: source.schemaType,
        name: data.name,
        email: data.email,
        phone: (data as { phone?: string }).phone ?? null,
        score: (data as { score: number }).score,
        grade: (data as { grade: string }).grade,
        answers: (data as { answers: Record<string, unknown> }).answers as Prisma.InputJsonValue,
        status: "pending",
      }
    : (() => {
        const d = data as {
          phone?: string;
          pagina_captura?: string;
          pesquisa?: string;
          grupo?: string;
          utm_source?: string;
          utm_medium?: string;
          utm_campaign?: string;
          utm_term?: string;
          utm_content?: string;
          lp?: string;
          utms?: Record<string, string>;
          meta?: { page_url?: string };
        };
        const utms = d.utms ?? {};
        const paginaCaptura = d.pagina_captura ?? d.meta?.page_url ?? null;
        return {
          sourceId: source.id,
          schemaType: source.schemaType,
          name: data.name,
          email: data.email,
          phone: d.phone ?? null,
          paginaCaptura,
          pesquisa: d.pesquisa ?? null,
          grupo: d.grupo ?? null,
          utmSource: d.utm_source ?? utms.utm_source ?? null,
          utmMedium: d.utm_medium ?? utms.utm_medium ?? null,
          utmCampaign: d.utm_campaign ?? utms.utm_campaign ?? null,
          utmTerm: d.utm_term ?? utms.utm_term ?? null,
          utmContent: d.utm_content ?? utms.utm_content ?? null,
          lp: deriveLp(d.lp, paginaCaptura ?? undefined),
          status: "pending",
        };
      })();

  // 6. Atomic write: lead + two SyncLog rows (one per destination)
  const lead = await prisma.$transaction(async (tx) => {
    const newLead = await tx.lead.create({ data: leadData });

    const syncRows = [
      { leadId: newLead.id, destination: "sheets", status: "pending" },
    ];
    if (source.schemaType === "standard") {
      syncRows.push({ leadId: newLead.id, destination: "datacrazy", status: "pending" });
    }
    await tx.syncLog.createMany({ data: syncRows });

    return newLead;
  });

  // 7. Trigger integrations (non-fatal — retry cron will pick up failures)
  try {
    const leadWithRelations = await prisma.lead.findUniqueOrThrow({
      where: { id: lead.id },
      include: { source: true, syncLogs: true },
    });
    await triggerIntegrations(leadWithRelations);
  } catch (err) {
    console.error("[webhook] triggerIntegrations error:", err);
  }

  return NextResponse.json({ id: lead.id }, { status: 200 });
}
