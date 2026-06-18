import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
  }

  const slug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const existing = await prisma.source.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: 'slug already exists' }, { status: 409 });
  }

  const source = await prisma.source.create({
    data: {
      name: body.name,
      slug,
      token: randomBytes(32).toString('hex'),
      schemaType: body.schemaType ?? 'standard',
      sheetsId: body.sheetsId ?? null,
      sheetTab: body.sheetTab ?? null,
      dataCrazyUrl: body.dataCrazyUrl ?? null,
    },
  });

  return NextResponse.json(source, { status: 201 });
}
