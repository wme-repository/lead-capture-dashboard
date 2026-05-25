import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
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

  // 5. Atomic write: lead + two SyncLog rows (one per destination)
  const lead = await prisma.$transaction(async (tx) => {
    const newLead = await tx.lead.create({
      data: {
        sourceId: source.id,
        schemaType: source.schemaType,
        fields: result.data as Prisma.InputJsonValue,
        status: "pending",
      },
    });

    await tx.syncLog.createMany({
      data: [
        { leadId: newLead.id, destination: "sheets", status: "pending" },
        { leadId: newLead.id, destination: "datacrazy", status: "pending" },
      ],
    });

    return newLead;
  });

  return NextResponse.json({ id: lead.id }, { status: 200 });
}
