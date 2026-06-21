import { NextRequest, NextResponse, after } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { triggerIntegrations } from "@/lib/integrations/trigger";
import { sendWhatsAppText } from "@/lib/integrations/evolution";
import { buildBlockReport } from "@/lib/reports/block";
import {
  StandardLeadSchema,
  QuestionnaireLeadSchema,
} from "@/lib/schemas/webhook";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-token",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function deriveLp(explicit?: string, paginaCaptura?: string): string | null {
  if (explicit) return explicit;
  if (!paginaCaptura) return null;
  if (paginaCaptura.includes("trt.oesquadraodeelite.com.br")) return "LP01";
  if (paginaCaptura.includes("lp.oesquadraodeelite.com.br")) return "LP02";
  return null;
}

// WordPress sends User-Agent like "WordPress/7.0; https://lp.oesquadraodeelite.com.br"
function urlFromUserAgent(ua: string): string | null {
  const m = ua.match(/https?:\/\/[^\s;]+/);
  return m ? m[0] : null;
}

function firstValue(
  raw: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return undefined;
}

// Normalize the many field-name variants LPs use (Elementor sends "Nome",
// "Whatsapp com DDD"; the LP01 system sends name/email/phone + nested meta/utms).
function normalizeStandardBody(
  raw: Record<string, unknown>,
  ua: string,
  referer: string,
  origin: string,
): Record<string, unknown> {
  const meta = (raw.meta as { page_url?: string } | undefined) ?? undefined;
  const paginaCaptura =
    firstValue(raw, ["pagina_captura"]) ??
    meta?.page_url ??
    urlFromUserAgent(ua) ??
    (referer !== "none" ? referer : undefined) ??
    (origin !== "none" ? origin : undefined);

  return {
    ...raw,
    name: firstValue(raw, ["name", "Nome", "nome"]),
    email: firstValue(raw, ["email", "Email", "E-mail", "e-mail"]),
    phone: firstValue(raw, [
      "phone",
      "telefone",
      "Telefone",
      "Whatsapp com DDD",
      "whatsapp",
      "WhatsApp",
      "Whatsapp",
    ]),
    pagina_captura: paginaCaptura,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Look up source
  const source = await prisma.source.findUnique({ where: { slug } });
  if (!source) {
    return json({ error: "Not found" }, 404);
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
    return json({ error: "Invalid body" }, 400);
  }
  console.log(`[webhook] body keys: ${Object.keys(body).join(",")}`);
  if (slug === "lead") {
    console.log(`[webhook] FULL BODY: ${JSON.stringify(body)}`);
  }

  // 4. Normalize (standard only) then validate against schema for this source
  const schema =
    source.schemaType === "questionnaire"
      ? QuestionnaireLeadSchema
      : StandardLeadSchema;

  const payload =
    source.schemaType === "standard"
      ? normalizeStandardBody(body, ua, referer, origin)
      : body;

  const result = schema.safeParse(payload);
  if (!result.success) {
    return json(
      { error: "Validation failed", details: result.error.flatten() },
      422
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

  // 5b. Skip duplicates — same email already registered for this source.
  // Does not write to sheet, does not count as a new lead.
  const email = (data.email ?? "").trim();
  if (email) {
    const existing = await prisma.lead.findFirst({
      where: {
        sourceId: source.id,
        email: { equals: email, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existing) {
      console.log(`[webhook] duplicate email skipped: ${email} (source=${source.id})`);
      return json({ duplicate: true }, 200);
    }
  }

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

  // Respond immediately; run sync + milestone AFTER the response so slow
  // destinations (Sheets/DataCrazy) never make the LP's webhook time out.
  after(async () => {
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

    // 8. Block report on captação milestone (non-fatal)
    if (source.schemaType === "standard") {
      try {
        const every = Number(process.env.MILESTONE_EVERY ?? 100);
        if (every > 0) {
          const total = await prisma.lead.count({ where: { schemaType: "standard" } });
          if (total > 0 && total % every === 0) {
            const report = await buildBlockReport();
            await sendWhatsAppText(report);
          }
        }
      } catch (err) {
        console.error("[webhook] block report error:", err);
      }

      // 9. Mirror email into the shared dedup registry (keeps n8n standby in sync)
      if (email) {
        try {
          await prisma.$executeRaw`
            INSERT INTO emails_captados_trt_julho (email, nome, telefone)
            VALUES (${email}, ${leadData.name ?? ""}, ${leadData.phone ?? ""})
            ON CONFLICT (email) DO NOTHING`;
        } catch (err) {
          console.error("[webhook] registry mirror error:", err);
        }
      }
    }
  });

  return json({ id: lead.id }, 200);
}
