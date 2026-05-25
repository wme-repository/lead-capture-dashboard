import type { Source, Lead } from '@/generated/prisma/client';

type LeadFields = Pick<Lead, 'name' | 'email' | 'phone' | 'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmTerm' | 'utmContent' | 'score' | 'grade'>;

function leadToRecord(lead: LeadFields): Record<string, unknown> {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    utm_source: lead.utmSource,
    utm_medium: lead.utmMedium,
    utm_campaign: lead.utmCampaign,
    utm_term: lead.utmTerm,
    utm_content: lead.utmContent,
    score: lead.score,
    grade: lead.grade,
  };
}

export async function postToDataCrazy(
  source: Pick<Source, 'dataCrazyUrl' | 'fieldMapping'>,
  lead: LeadFields
): Promise<void> {
  if (!source.dataCrazyUrl) return;

  const leadFields = leadToRecord(lead);
  const mapping = (source.fieldMapping ?? {}) as Record<string, string>;

  let body: Record<string, unknown>;
  if (Object.keys(mapping).length > 0) {
    body = {};
    for (const [destKey, sourceKey] of Object.entries(mapping)) {
      body[destKey] = leadFields[sourceKey];
    }
  } else {
    body = leadFields;
  }

  const res = await fetch(source.dataCrazyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DataCrazy POST failed: ${res.status} ${text}`);
  }
}
