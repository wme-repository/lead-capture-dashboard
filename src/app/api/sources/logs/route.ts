import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getSyncLogs } from '@/lib/fontes';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const onlyFailed = url.searchParams.get('failed') === '1';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const logs = await getSyncLogs({ onlyFailed, limit, offset });
  return NextResponse.json(logs);
}
