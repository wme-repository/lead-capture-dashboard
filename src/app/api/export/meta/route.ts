import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

function csvCell(v: unknown): string {
  return `"${(v ?? '').toString().replace(/"/g, '""')}"`;
}

// Meta prefers digits with country code (E.164 without "+"): 55 + DDD + número.
function normPhone(raw: string | null): string {
  if (!raw) return '';
  let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (!d.startsWith('55') && (d.length === 10 || d.length === 11)) d = '55' + d;
  return d;
}

// CSV with ONLY nome, email, telefone — unique by email (captação leads) for Meta Ads.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leads = await prisma.lead.findMany({
    where: { schemaType: 'standard', NOT: { email: null } },
    select: { name: true, email: true, phone: true },
    distinct: ['email'],
    orderBy: { receivedAt: 'desc' },
  });

  const header = ['nome', 'email', 'telefone'].join(',');
  const rows = leads
    .filter((l) => (l.email ?? '').trim() !== '')
    .map((l) => [csvCell(l.name), csvCell(l.email), csvCell(normPhone(l.phone))].join(','));
  const csv = `﻿${[header, ...rows].join('\n')}`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': `attachment; filename="meta-ads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
