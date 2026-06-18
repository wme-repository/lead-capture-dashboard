import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://leads.esqtools.com';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

  const body = await request.json().catch(() => null);

  const testPayload =
    body?.payload ??
    (source.schemaType === 'questionnaire'
      ? {
          name: 'Lead Teste',
          email: 'teste@leads.esqtools.com',
          phone: '11999990000',
          answers: {
            nivel_concursos: 'Teste',
            estudou_tribunal: 'Teste',
            conhece_thallius: 'Teste',
            motivo_projeto: 'Teste',
            idade: '30',
            renda: 'Teste',
            genero: 'Teste',
            escolaridade: 'Teste',
            situacao: 'Teste',
            tempo_esquadrao: 'Teste',
            expectativas: 'Teste automático',
          },
          score: 50,
          grade: 'C',
        }
      : {
          name: 'Lead Teste',
          email: 'teste@leads.esqtools.com',
          phone: '11999990000',
          pagina_captura: 'teste',
          utm_source: 'dashboard-test',
          utm_medium: 'test',
          utm_campaign: 'test',
        });

  const webhookUrl = `${APP_URL}/api/webhook/${source.slug}`;
  const start = Date.now();

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': source.token,
        Origin: APP_URL,
      },
      body: JSON.stringify(testPayload),
    });

    const resBody = await res.json().catch(() => null);
    const ms = Date.now() - start;

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        status: res.status,
        response: resBody,
        ms,
      });
    }

    const leadId = resBody?.id;
    let syncResults: { destination: string; status: string; error: string | null }[] = [];
    if (leadId) {
      await new Promise((r) => setTimeout(r, 2000));
      syncResults = await prisma.syncLog.findMany({
        where: { leadId },
        select: { destination: true, status: true, error: true },
      });
    }

    return NextResponse.json({
      success: true,
      leadId,
      status: res.status,
      ms,
      sync: syncResults,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - start,
    });
  }
}
