import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { appendLeadToSheet } from '@/lib/integrations/sheets';
import { postToDataCrazy } from '@/lib/integrations/datacrazy';
import { updateSyncLogSuccess, updateSyncLogFailure } from '@/lib/integrations/retry';
import { sendWhatsAppText } from '@/lib/integrations/evolution';

const MAX_ATTEMPTS = 10;

export async function GET(request: NextRequest) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const overdue = await prisma.syncLog.findMany({
    where: {
      status: 'failed',
      nextRetryAt: { lte: new Date() },
      attemptCount: { lt: MAX_ATTEMPTS },
    },
    include: { lead: { include: { source: true } } },
    take: 50,
    orderBy: { nextRetryAt: 'asc' },
  });

  let processed = 0;
  for (const row of overdue) {
    try {
      if (row.destination === 'sheets') {
        await appendLeadToSheet(row.lead.source, row.lead);
      } else if (row.destination === 'datacrazy') {
        await postToDataCrazy(row.lead.source, row.lead);
      }
      await updateSyncLogSuccess(row.id);
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateSyncLogFailure(row.id, message, row.attemptCount);

      // Permanent failure (last attempt) → alert the group once
      if (row.attemptCount + 1 >= MAX_ATTEMPTS) {
        try {
          await sendWhatsAppText(
            `🔴 *Falha de sincronização — Projeto TRT*\n\n` +
              `Lead: ${row.lead.name ?? '(sem nome)'} (${row.lead.email ?? 's/ email'})\n` +
              `Destino: *${row.destination}*\n` +
              `Tentativas esgotadas (${MAX_ATTEMPTS}).\n` +
              `Erro: ${message.slice(0, 150)}`
          );
        } catch (alertErr) {
          console.error('[retry] alert error:', alertErr);
        }
      }
    }
  }

  // Refresh Lead.status for all affected leads
  const leadIds = [...new Set(overdue.map((r) => r.lead.id))];
  for (const leadId of leadIds) {
    const logs = await prisma.syncLog.findMany({ where: { leadId } });
    const allDone = logs.every((l) => l.status === 'done');
    const anyFailed = logs.some((l) => l.status === 'failed');
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: allDone ? 'synced' : anyFailed ? 'failed' : 'pending' },
    });
  }

  return NextResponse.json({ processed, total: overdue.length });
}
