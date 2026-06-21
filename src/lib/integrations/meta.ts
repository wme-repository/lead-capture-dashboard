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

export interface MetaCampaign {
  name: string;
  status: string;
  lp: string | null;
}

export interface ConjuntoPacing {
  conjunto: string;
  budgetDia: number; // soma dos orçamentos diários (LP01+LP02)
  gastoTotal: number; // gasto acumulado
}

async function fetchAllPaged<T>(firstUrl: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = firstUrl;
  let guard = 0;
  while (url && guard < 20) {
    const res: Response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`Meta ${res.status}: ${(await res.text()).slice(0, 150)}`);
    const data = (await res.json()) as { data?: T[]; paging?: { next?: string } };
    out.push(...(data.data ?? []));
    url = data.paging?.next ?? null;
    guard++;
  }
  return out;
}

// Gasto por conjunto (ad set) das campanhas [PROJETOTRT2], agrupado por nome
// do conjunto (somando LP01+LP02). budgetDia = orçamento diário, gastoTotal = gasto acumulado.
export async function getConjuntoPacing(): Promise<ConjuntoPacing[]> {
  if (!TOKEN || !ACCT) return [];

  type AdSet = { id?: string; name?: string; daily_budget?: string; campaign?: { name?: string } };
  type Insight = { adset_id?: string; spend?: string };

  const [adsets, insights] = await Promise.all([
    fetchAllPaged<AdSet>(
      `${GRAPH}/${ACCT}/adsets?fields=id,name,daily_budget,campaign{name}&limit=500&access_token=${TOKEN}`,
    ),
    fetchAllPaged<Insight>(
      `${GRAPH}/${ACCT}/insights?level=adset&fields=adset_id,spend&date_preset=maximum&limit=500&access_token=${TOKEN}`,
    ).catch(() => [] as Insight[]),
  ]);

  // Only PROJETOTRT2 ad sets: map adset_id → conjunto name (avoids same-named ad
  // sets from other/old campaigns polluting the spend).
  const idToConjunto = new Map<string, string>();
  const map = new Map<string, ConjuntoPacing>();
  for (const a of adsets) {
    if (!(a.campaign?.name ?? '').toUpperCase().includes(TAG)) continue;
    const nome = (a.name ?? '').trim();
    if (a.id) idToConjunto.set(a.id, nome);
    const e = map.get(nome) ?? { conjunto: nome, budgetDia: 0, gastoTotal: 0 };
    e.budgetDia += a.daily_budget ? parseInt(a.daily_budget, 10) / 100 : 0;
    map.set(nome, e);
  }
  for (const ins of insights) {
    const nome = ins.adset_id ? idToConjunto.get(ins.adset_id) : undefined;
    if (!nome) continue;
    const e = map.get(nome);
    if (e) e.gastoTotal += parseFloat(ins.spend ?? '0') || 0;
  }

  return [...map.values()].sort((a, b) => b.budgetDia - a.budgetDia);
}

// Lista de campanhas [PROJETOTRT2] (nome + status + LP), ou [] se não configurado/falha.
export async function getCampaignList(): Promise<MetaCampaign[]> {
  if (!TOKEN || !ACCT) return [];

  const url = new URL(`${GRAPH}/${ACCT}/campaigns`);
  url.searchParams.set('fields', 'name,effective_status');
  url.searchParams.set('limit', '500');
  url.searchParams.set('access_token', TOKEN);

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Meta campaigns ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { data?: { name?: string; effective_status?: string }[] };
  return (data.data ?? [])
    .filter((c) => (c.name ?? '').toUpperCase().includes(TAG))
    .map((c) => ({
      name: c.name ?? '',
      status: c.effective_status ?? '',
      lp: lpFromName(c.name ?? ''),
    }));
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
