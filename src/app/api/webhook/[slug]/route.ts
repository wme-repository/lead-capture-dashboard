import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { triggerIntegrations } from "@/lib/integrations/trigger";
import {
  StandardLeadSchema,
  QuestionnaireLeadSchema,
} from "@/lib/schemas/webhook";

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

  // 2. Authenticate
  const token = request.headers.get("x-webhook-token");
  if (token !== source.token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse body
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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
        score: (data as { score: number }).score,
        grade: (data as { grade: string }).grade,
        answers: (data as { answers: Record<string, unknown> }).answers as Prisma.InputJsonValue,
        status: "pending",
      }
    : {
        sourceId: source.id,
        schemaType: source.schemaType,
        name: data.name,
        email: data.email,
        phone: (data as { phone?: string }).phone ?? null,
        utmSource: (data as { utm_source?: string }).utm_source ?? null,
        utmMedium: (data as { utm_medium?: string }).utm_medium ?? null,
        utmCampaign: (data as { utm_campaign?: string }).utm_campaign ?? null,
        utmTerm: (data as { utm_term?: string }).utm_term ?? null,
        utmContent: (data as { utm_content?: string }).utm_content ?? null,
        status: "pending",
      };

  // 6. Atomic write: lead + two SyncLog rows (one per destination)
  const lead = await prisma.$transaction(async (tx) => {
    const newLead = await tx.lead.create({ data: leadData });

    await tx.syncLog.createMany({
      data: [
        { leadId: newLead.id, destination: "sheets", status: "pending" },
        { leadId: newLead.id, destination: "datacrazy", status: "pending" },
      ],
    });

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
