import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leads = await prisma.lead.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 50,
    include: {
      source: { select: { name: true, slug: true } },
      syncLogs: {
        select: { destination: true, status: true, error: true, attemptCount: true, attemptedAt: true },
      },
    },
  });

  return NextResponse.json({ leads });
}
