import { NextRequest } from 'next/server';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    syncLog: { findMany: jest.fn(), update: jest.fn() },
    lead: { update: jest.fn() },
  },
}));

// Mock integration functions
jest.mock('@/lib/integrations/sheets', () => ({ appendLeadToSheet: jest.fn() }));
jest.mock('@/lib/integrations/datacrazy', () => ({ postToDataCrazy: jest.fn() }));
jest.mock('@/lib/integrations/retry', () => ({
  updateSyncLogSuccess: jest.fn(),
  updateSyncLogFailure: jest.fn(),
}));

import { GET } from './route';
import { prisma } from '@/lib/prisma';

const SECRET = 'test-cron-secret';
process.env.CRON_SECRET = SECRET;

function makeRequest(secret?: string) {
  return new NextRequest('http://localhost/api/cron/retry', {
    headers: secret ? { 'x-cron-secret': secret } : {},
  });
}

describe('GET /api/cron/retry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without correct secret', async () => {
    const res = await GET(makeRequest('wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with { processed: 0 } when no overdue rows', async () => {
    (prisma.syncLog.findMany as jest.Mock).mockResolvedValue([]);
    const res = await GET(makeRequest(SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(0);
  });
});
