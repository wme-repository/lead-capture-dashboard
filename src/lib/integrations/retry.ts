import { prisma } from '@/lib/prisma';

export function computeNextRetryAt(attemptCount: number): Date {
  const delayMs = Math.min(Math.pow(2, attemptCount) * 60_000, 60 * 60_000);
  return new Date(Date.now() + delayMs);
}

export async function updateSyncLogSuccess(id: string): Promise<void> {
  await prisma.syncLog.update({
    where: { id },
    data: { status: 'done', error: null, attemptedAt: new Date() },
  });
}

export async function updateSyncLogFailure(
  id: string,
  error: string,
  attemptCount: number
): Promise<void> {
  await prisma.syncLog.update({
    where: { id },
    data: {
      status: 'failed',
      error,
      attemptCount: attemptCount + 1,
      nextRetryAt: computeNextRetryAt(attemptCount + 1),
      attemptedAt: new Date(),
    },
  });
}
