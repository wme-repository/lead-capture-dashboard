import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppText } from '@/lib/integrations/evolution';
import { askDeepSeek } from '@/lib/integrations/deepseek';
import { getQaContext } from '@/lib/reports/captacao';

const GROUP_JID = process.env.REPORT_GROUP_JID;
const FORWARD_URL = process.env.DASHBOARD_WEBHOOK_URL; // cascade to existing Python app

const QA_SYSTEM =
  'Você é o assistente da captação do Projeto TRT. Responda perguntas do gestor com base ' +
  'EXCLUSIVAMENTE nos dados fornecidos no contexto. Seja curto e direto, tom de gestor de tráfego. ' +
  'Se a informação não estiver nos dados, diga que ainda não tem esse dado. Nunca invente números.';

// Forward the raw event to the legacy dashboard webhook so it keeps working.
async function cascade(rawBody: string): Promise<void> {
  if (!FORWARD_URL) return;
  try {
    await fetch(FORWARD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBody,
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    console.error('[whatsapp] cascade forward error:', err);
  }
}

interface EvoBody {
  event?: string;
  data?: {
    Info?: { Chat?: string; IsFromMe?: boolean };
    Message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string };
    };
  };
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  // Always cascade to the legacy app first (non-blocking failure)
  await cascade(raw);

  let body: EvoBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ status: 'invalid_json' });
  }

  if (body.event && body.event !== 'Message') {
    return NextResponse.json({ status: 'ignored_event' });
  }

  const info = body.data?.Info ?? {};
  const message = body.data?.Message ?? {};

  if (info.IsFromMe) return NextResponse.json({ status: 'ignored_self' });
  if (info.Chat !== GROUP_JID) return NextResponse.json({ status: 'ignored_wrong_chat' });

  const text = (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    ''
  ).trim();

  if (!text || text.startsWith('/')) {
    return NextResponse.json({ status: 'ignored_no_text' });
  }

  // Answer the question via DeepSeek using current captação data
  try {
    const context = await getQaContext();
    const answer = await askDeepSeek(QA_SYSTEM, `${context}\n\n---\nPergunta: ${text}`);
    await sendWhatsAppText(answer || 'Não consegui gerar uma resposta agora.');
  } catch (err) {
    console.error('[whatsapp] qa error:', err);
    try {
      await sendWhatsAppText('⚠️ Tive um erro ao consultar os dados. Tente novamente em instantes.');
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ status: 'answered' });
}
