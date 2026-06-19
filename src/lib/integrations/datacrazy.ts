import type { Source, Lead } from '@/generated/prisma/client';

type LeadFields = Pick<Lead, 'name' | 'email' | 'phone' | 'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmTerm' | 'utmContent' | 'score' | 'grade' | 'paginaCaptura'>;

function normalizePhone(raw: string | null): string {
  if (!raw) return '';
  return raw.replace(/[^\d+]/g, '');
}

function buildPayload(
  lead: LeadFields,
  mapping: Record<string, string> | null,
): Record<string, unknown> {
  const name = (lead.name ?? '').trim();
  const email = (lead.email ?? '').trim().toLowerCase();
  const telefone = normalizePhone(lead.phone);

  const base: Record<string, unknown> = { name, telefone, email };

  // Extra fields — only included when fieldMapping enables them
  if (mapping && Object.keys(mapping).length > 0) {
    const extras: Record<string, unknown> = {
      leadscore: lead.score,
      nota_faixa_lead: lead.grade,
      utm_source: lead.utmSource,
      utm_medium: lead.utmMedium,
      utm_campaign: lead.utmCampaign,
      utm_content: lead.utmContent,
      utm_term: lead.utmTerm,
      pagina_captura: lead.paginaCaptura,
    };
    for (const [destKey, sourceKey] of Object.entries(mapping)) {
      if (sourceKey in extras) base[destKey] = extras[sourceKey];
    }
  }

  return base;
}

export async function postToDataCrazy(
  source: Pick<Source, 'dataCrazyUrl' | 'fieldMapping'>,
  lead: LeadFields,
): Promise<void> {
  if (!source.dataCrazyUrl) return;

  const name = (lead.name ?? '').trim();
  const email = (lead.email ?? '').trim();
  const phone = (lead.phone ?? '').trim();

  if (!name) throw new Error('DataCrazy: nome vazio, envio ignorado');
  if (!email && !phone) throw new Error('DataCrazy: email e telefone ausentes, envio ignorado');

  const mapping = (source.fieldMapping ?? null) as Record<string, string> | null;
  const body = buildPayload(lead, mapping);

  const res = await fetch(source.dataCrazyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DataCrazy POST ${res.status}: ${text.slice(0, 200)}`);
  }
}
