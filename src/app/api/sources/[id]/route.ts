import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const allowed = ['name', 'sheetsId', 'sheetTab', 'dataCrazyUrl', 'schemaType'] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const source = await prisma.source.update({ where: { id }, data });
  return NextResponse.json(source);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const leadCount = await prisma.lead.count({ where: { sourceId: id } });
  if (leadCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${leadCount} leads linked` },
      { status: 409 }
    );
  }

  await prisma.source.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
