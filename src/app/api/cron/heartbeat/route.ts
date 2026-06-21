import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppText } from '@/lib/integrations/evolution';

const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

function spDayStart(): Date {
  const n = new Date(Date.now() - SP_OFFSET_MS);
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()) + SP_OFFSET_MS);
}

function ago(date: Date | null): string {
  if (!date) return '—';
  const min = Math.floor((Date.now() - date.getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  return `há ${h}h${min % 60 ? ` ${min % 60}min` : ''}`;
}

// Simple liveness heartbeat: "Captação ok" + a quick number. Active hours only.
export async function GET(request: NextRequest) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startH = Number(process.env.ACTIVE_START_HOUR ?? 8);
  const endH = Number(process.env.ACTIVE_END_HOUR ?? 23);
  const spHour = new Date(Date.now() - SP_OFFSET_MS).getUTCHours();
  if (spHour < startH || spHour >= endH) {
    return NextResponse.json({ status: 'fora-do-horario', spHour });
  }

  const [hoje, last] = await Promise.all([
    prisma.lead.count({ where: { schemaType: 'standard', receivedAt: { gte: spDayStart() } } }),
    prisma.lead.findFirst({
      where: { schemaType: 'standard' },
      orderBy: { receivedAt: 'desc' },
      select: { receivedAt: true },
    }),
  ]);

  const detalhe =
    hoje > 0 ? `${hoje} leads hoje · último ${ago(last?.receivedAt ?? null)}` : 'aguardando primeiros leads';

  await sendWhatsAppText(`✅ Captação ok · ${detalhe}`);
  return NextResponse.json({ status: 'sent', hoje });
}
