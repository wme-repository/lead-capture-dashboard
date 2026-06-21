import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public healthcheck for uptime monitors.
export async function GET() {
  try {
    const [total, last] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.findFirst({ orderBy: { receivedAt: 'desc' }, select: { receivedAt: true } }),
    ]);
    return NextResponse.json({
      ok: true,
      db: true,
      totalLeads: total,
      lastLeadAt: last?.receivedAt ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
