import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppText } from '@/lib/integrations/evolution';

const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

// Edge-triggered silence alert: fires once when captação was receiving leads
// and then stopped (0 in the recent window, but >0 in the window before it).
export async function GET(request: NextRequest) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hours = Number(process.env.SILENCE_HOURS ?? 2);
  const startH = Number(process.env.ACTIVE_START_HOUR ?? 8);
  const endH = Number(process.env.ACTIVE_END_HOUR ?? 23);

  const spHour = new Date(Date.now() - SP_OFFSET_MS).getUTCHours();
  if (spHour < startH || spHour >= endH) {
    return NextResponse.json({ status: 'fora-do-horario', spHour });
  }

  const now = Date.now();
  const recentStart = new Date(now - hours * 3600_000);
  const priorStart = new Date(now - 2 * hours * 3600_000);

  const [recent, prior] = await Promise.all([
    prisma.lead.count({ where: { schemaType: 'standard', receivedAt: { gte: recentStart } } }),
    prisma.lead.count({
      where: { schemaType: 'standard', receivedAt: { gte: priorStart, lt: recentStart } },
    }),
  ]);

  if (recent === 0 && prior > 0) {
    await sendWhatsAppText(
      `🚨 Alerta de captação — Projeto TRT\n\n` +
        `0 leads nas últimas ${hours}h (vinha recebendo e parou).\n` +
        `Verificar: LPs no ar, tracking/UTM, campanhas ativas e o webhook.`
    );
    return NextResponse.json({ status: 'alerted', recent, prior });
  }

  return NextResponse.json({ status: 'ok', recent, prior });
}
