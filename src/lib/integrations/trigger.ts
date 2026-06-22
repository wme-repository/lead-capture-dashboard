import type { Lead, Source, SyncLog } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { appendLeadToSheet } from './sheets';
import { postToDataCrazy } from './datacrazy';
import { postToN8n } from './n8n';
import { updateSyncLogSuccess, updateSyncLogFailure } from './retry';

type LeadWithSource = Lead & { source: Source; syncLogs: SyncLog[] };

export async function triggerIntegrations(lead: LeadWithSource): Promise<void> {
  const { source, syncLogs } = lead;

  // Espelho auxiliar pro n8n — mesmos dados dos sheets, fire-and-forget.
  // NÃO entra no cálculo de status: falha aqui não reprova o lead.
  void postToN8n(source, lead).catch((err: Error) =>
    console.warn('[n8n] espelho falhou:', err.message)
  );

  const sheetsLog = syncLogs.find((l) => l.destination === 'sheets');
  const dataCrazyLog = syncLogs.find((l) => l.destination === 'datacrazy');

  const results = await Promise.allSettled([
    sheetsLog
      ? appendLeadToSheet(source, lead)
          .then(() => updateSyncLogSuccess(sheetsLog.id))
          .catch((err: Error) =>
            updateSyncLogFailure(sheetsLog.id, err.message, sheetsLog.attemptCount)
          )
      : Promise.resolve(),
    dataCrazyLog
      ? postToDataCrazy(source, lead)
          .then(() => updateSyncLogSuccess(dataCrazyLog.id))
          .catch((err: Error) =>
            updateSyncLogFailure(dataCrazyLog.id, err.message, dataCrazyLog.attemptCount)
          )
      : Promise.resolve(),
  ]);

  const allDone = results.every((r) => r.status === 'fulfilled');
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: allDone ? 'synced' : 'failed' },
  });
}
