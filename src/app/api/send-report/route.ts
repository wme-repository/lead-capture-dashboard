import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppText } from '@/lib/integrations/evolution';

// On-demand sender for custom report text (e.g. comparativos montados à mão).
// POST { text: string, to?: string } — `to` opcional sobrescreve o grupo padrão (REPORT_GROUP_JID).
export async function POST(request: NextRequest) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { text?: string; to?: string } | null;
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: 'Campo "text" é obrigatório.' }, { status: 400 });
  }

  await sendWhatsAppText(text, body?.to);
  return NextResponse.json({ ok: true, chars: text.length });
}
