import { NextRequest, NextResponse } from 'next/server';
import { getCaptacaoSnapshot, formatDailyReport } from '@/lib/reports/captacao';
import { sendWhatsAppText } from '@/lib/integrations/evolution';

export async function GET(request: NextRequest) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshot = await getCaptacaoSnapshot();
  const text = formatDailyReport(snapshot);
  await sendWhatsAppText(text);

  return NextResponse.json({ ok: true, sent: true });
}
