import type { Lead, Source } from '@/generated/prisma/client';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// Espelha para um webhook do n8n os MESMOS dados que enviamos aos sheets
// (captação + questionário), lead a lead. schemaType distingue qual é.
// Auxiliar e fire-and-forget: falha aqui NUNCA bloqueia nem reprova o lead.
export async function postToN8n(
  source: Pick<Source, 'schemaType'>,
  lead: Lead
): Promise<void> {
  if (!N8N_WEBHOOK_URL) return;

  const payload = {
    schemaType: source.schemaType, // 'standard' (captação) | 'questionnaire'
    receivedAt: lead.receivedAt,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    paginaCaptura: lead.paginaCaptura,
    pesquisa: lead.pesquisa,
    grupo: lead.grupo,
    utmCampaign: lead.utmCampaign,
    utmMedium: lead.utmMedium,
    utmSource: lead.utmSource,
    utmContent: lead.utmContent,
    utmTerm: lead.utmTerm,
    lp: lead.lp,
    score: lead.score,
    grade: lead.grade,
    answers: lead.answers,
  };

  await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
}
