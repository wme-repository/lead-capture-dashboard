// Meta Marketing API — campaign insights for the Projeto TRT launch.
// Reuses the same token/account as the meta-ads-agent project.
const GRAPH = `https://graph.facebook.com/${process.env.META_API_VER ?? 'v19.0'}`;
const TOKEN = process.env.META_ACCESS_TOKEN;
const ACCT = process.env.META_AD_ACCOUNT_ID;
const TAG = (process.env.META_CAMPAIGN_TAG ?? 'PROJETOTRT2').toUpperCase();

export interface LpAdMetrics {
  spend: number;
  impressions: number;
  linkClicks: number;
  lpViews: number;
  ctr: number; // link_clicks / impressions * 100
}

interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaRow {
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  inline_link_clicks?: string;
  actions?: MetaAction[];
}

function actionValue(actions: MetaAction[] | undefined, type: string): number {
  if (!actions) return 0;
  const a = actions.find((x) => x.action_type === type);
  return a ? parseFloat(a.value) || 0 : 0;
}

function lpFromName(name: string): string | null {
  const upper = name.toUpperCase();
  if (!upper.includes(TAG)) return null;
  if (upper.includes('LP01')) return 'LP01';
  if (upper.includes('LP02')) return 'LP02';
  return null;
}

// Returns per-LP ad metrics, or {} if Meta is not configured / fails.
export async function getAdMetricsByLp(): Promise<Record<string, LpAdMetrics>> {
  if (!TOKEN || !ACCT) return {};

  const url = new URL(`${GRAPH}/${ACCT}/insights`);
  url.searchParams.set('level', 'campaign');
  url.searchParams.set('fields', 'campaign_name,spend,impressions,inline_link_clicks,actions');
  url.searchParams.set('date_preset', 'maximum');
  url.searchParams.set('limit', '500');
  url.searchParams.set('access_token', TOKEN);

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Meta insights ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { data?: MetaRow[] };
  const out: Record<string, LpAdMetrics> = {};

  for (const row of data.data ?? []) {
    const lp = lpFromName(row.campaign_name ?? '');
    if (!lp) continue;
    const bucket =
      out[lp] ?? (out[lp] = { spend: 0, impressions: 0, linkClicks: 0, lpViews: 0, ctr: 0 });
    bucket.spend += parseFloat(row.spend ?? '0') || 0;
    bucket.impressions += parseInt(row.impressions ?? '0', 10) || 0;
    bucket.linkClicks += parseInt(row.inline_link_clicks ?? '0', 10) || 0;
    bucket.lpViews += actionValue(row.actions, 'landing_page_view');
  }

  for (const m of Object.values(out)) {
    m.ctr = m.impressions > 0 ? (m.linkClicks / m.impressions) * 100 : 0;
  }

  return out;
}
