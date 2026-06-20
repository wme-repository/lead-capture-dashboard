// Evolution-GO WhatsApp sender. Auth is the per-instance token via `apikey` header.
const EVO_URL = process.env.EVOLUTION_GO_URL; // e.g. https://evogo.esqtools.com
const EVO_TOKEN = process.env.EVOLUTION_INSTANCE_TOKEN; // instance token
const GROUP_JID = process.env.REPORT_GROUP_JID; // target group, e.g. 1203...@g.us

export async function sendWhatsAppText(text: string, to?: string): Promise<void> {
  const number = to ?? GROUP_JID;
  if (!EVO_URL || !EVO_TOKEN || !number) {
    console.warn('[evolution] missing config, message not sent');
    return;
  }

  const res = await fetch(`${EVO_URL}/send/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EVO_TOKEN },
    body: JSON.stringify({ number, text }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Evolution send ${res.status}: ${body.slice(0, 200)}`);
  }
}
