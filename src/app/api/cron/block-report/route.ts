import { NextRequest, NextResponse } from 'next/server';
import { buildBlockReport } from '@/lib/reports/block';
import { sendWhatsAppText } from '@/lib/integrations/evolution';

// Manual trigger for the per-block analytical report (testing / on-demand).
export async function GET(request: NextRequest) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const report = await buildBlockReport();
  await sendWhatsAppText(report);
  return NextResponse.json({ ok: true, report });
}
