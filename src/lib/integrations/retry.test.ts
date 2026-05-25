import { computeNextRetryAt } from './retry';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    syncLog: {
      update: jest.fn(),
    },
  },
}));

describe('computeNextRetryAt', () => {
  it('returns ~60s delay for attemptCount=0', () => {
    const before = Date.now();
    const result = computeNextRetryAt(0);
    const after = Date.now();
    const diff = result.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(59_900);
    expect(diff).toBeLessThanOrEqual(60_100 + (after - before));
  });

  it('returns ~120s delay for attemptCount=1', () => {
    const result = computeNextRetryAt(1);
    const diff = result.getTime() - Date.now();
    expect(diff).toBeGreaterThanOrEqual(119_000);
    expect(diff).toBeLessThanOrEqual(121_000);
  });

  it('caps at 3_600_000ms for high attemptCount', () => {
    const result = computeNextRetryAt(20);
    const diff = result.getTime() - Date.now();
    expect(diff).toBeLessThanOrEqual(3_601_000);
    expect(diff).toBeGreaterThanOrEqual(3_599_000);
  });
});
