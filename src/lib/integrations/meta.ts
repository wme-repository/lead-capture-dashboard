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

function tempFromName(name: string): string | null {
  const u = name.toUpperCase();
  return u.includes('QUENTE') ? 'QUENTE' : u.includes('FRIO') ? 'FRIO' : null;
}

export const isMetaConfigured = (): boolean => Boolean(TOKEN && ACCT);

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

export interface ConjuntoRow {
  conjunto: string;
  campNum: string; // número da campanha (início do nome, ex: "01")
  status: string;
  budgetDia: number;
  gasto: number;
  leads: number;
  cpl: number | null;
}
export interface CampanhaBreakdown {
  campanha: string;
  lp: string | null;
  temperatura: string | null;
  budgetDia: number;
  gasto: number;
  leads: number;
  cpl: number | null;
  conjuntos: ConjuntoRow[];
}

function leadCountFromActions(actions?: { action_type: string; value: string }[]): number {
  if (!actions) return 0;
  // Prefer the grouped lead conversion; fall back to generic "lead".
  const grouped = actions.find((a) => a.action_type === 'onsite_conversion.lead_grouped');
  if (grouped) return parseFloat(grouped.value) || 0;
  const lead = actions.find((a) => a.action_type === 'lead' || a.action_type === 'leadgen_grouped');
  return lead ? parseFloat(lead.value) || 0 : 0;
}

// Campanhas [PROJETOTRT2] com seus conjuntos: orçamento/dia, gasto e CPL.
export async function getMetaConjuntos(): Promise<CampanhaBreakdown[]> {
  if (!TOKEN || !ACCT) return [];

  type Camp = { id?: string; name?: string };
  type AdSet = { id?: string; name?: string; daily_budget?: string; effective_status?: string; campaign?: { id?: string } };
  type Insight = { adset_id?: string; spend?: string; actions?: { action_type: string; value: string }[] };

  const [campaigns, adsets, insights] = await Promise.all([
    fetchAllPaged<Camp>(`${GRAPH}/${ACCT}/campaigns?fields=id,name&limit=500&access_token=${TOKEN}`),
    fetchAllPaged<AdSet>(
      `${GRAPH}/${ACCT}/adsets?fields=id,name,daily_budget,effective_status,campaign{id}&limit=500&access_token=${TOKEN}`,
    ),
    fetchAllPaged<Insight>(
      `${GRAPH}/${ACCT}/insights?level=adset&fields=adset_id,spend,actions&date_preset=maximum&limit=500&access_token=${TOKEN}`,
    ).catch(() => [] as Insight[]),
  ]);

  const trtCampaigns = campaigns.filter((c) => (c.name ?? '').toUpperCase().includes(TAG));
  const campById = new Map(trtCampaigns.map((c) => [c.id ?? '', c.name ?? '']));
  const lpOf = (name: string) => {
    const u = name.toUpperCase();
    return u.includes('LP01') ? 'LP01' : u.includes('LP02') ? 'LP02' : null;
  };
  const tempOf = (name: string) => {
    const u = name.toUpperCase();
    return u.includes('QUENTE') ? 'QUENTE' : u.includes('FRIO') ? 'FRIO' : null;
  };
  const spendByAdset = new Map<string, { gasto: number; leads: number }>();
  for (const ins of insights) {
    if (!ins.adset_id) continue;
    spendByAdset.set(ins.adset_id, {
      gasto: parseFloat(ins.spend ?? '0') || 0,
      leads: leadCountFromActions(ins.actions),
    });
  }

  const byCampaign = new Map<string, CampanhaBreakdown>();
  for (const a of adsets) {
    const campId = a.campaign?.id ?? '';
    const campName = campById.get(campId);
    if (!campName) continue;
    const c =
      byCampaign.get(campId) ??
      ({ campanha: campName, lp: lpOf(campName), temperatura: tempOf(campName), budgetDia: 0, gasto: 0, leads: 0, cpl: null, conjuntos: [] } as CampanhaBreakdown);
    const sp = spendByAdset.get(a.id ?? '') ?? { gasto: 0, leads: 0 };
    const budget = a.daily_budget ? parseInt(a.daily_budget, 10) / 100 : 0;
    const campNum = (campName.match(/^\s*(\d+)/)?.[1]) ?? '';
    c.conjuntos.push({
      conjunto: a.name ?? '',
      campNum,
      status: a.effective_status ?? '',
      budgetDia: budget,
      gasto: sp.gasto,
      leads: sp.leads,
      cpl: sp.leads > 0 ? sp.gasto / sp.leads : null,
    });
    c.budgetDia += budget;
    c.gasto += sp.gasto;
    c.leads += sp.leads;
    byCampaign.set(campId, c);
  }
  for (const c of byCampaign.values()) {
    c.cpl = c.leads > 0 ? c.gasto / c.leads : null;
    c.conjuntos.sort((a, b) => b.budgetDia - a.budgetDia);
  }

  return [...byCampaign.values()].sort((a, b) => a.campanha.localeCompare(b.campanha));
}

// Conjunto (ad set) das campanhas [PROJETOTRT2] com métricas ricas p/ a aba
// "Orçamento & Decisão": gasto, orçamento, status + CTR e Connect Rate por conjunto.
// datePreset segue a janela escolhida (today/yesterday/last_3d/last_7d/last_14d/maximum).
export interface MetaAdSet {
  id: string;
  conjunto: string;
  campanha: string;
  lp: string | null;
  temperatura: string | null;
  status: string; // effective_status do Meta
  budgetDia: number;
  gasto: number;
  impressions: number;
  linkClicks: number;
  lpViews: number;
  ctr: number; // fração: link_clicks / impressions
  connectRate: number; // fração: landing_page_view / inline_link_clicks
}

export async function getMetaAdSets(datePreset = 'maximum'): Promise<MetaAdSet[]> {
  if (!TOKEN || !ACCT) return [];

  type Camp = { id?: string; name?: string };
  type AdSet = { id?: string; name?: string; daily_budget?: string; effective_status?: string; campaign?: { id?: string } };
  type Insight = {
    adset_id?: string;
    spend?: string;
    impressions?: string;
    inline_link_clicks?: string;
    actions?: MetaAction[];
  };

  const [campaigns, adsets, insights] = await Promise.all([
    fetchAllPaged<Camp>(`${GRAPH}/${ACCT}/campaigns?fields=id,name&limit=500&access_token=${TOKEN}`),
    fetchAllPaged<AdSet>(
      `${GRAPH}/${ACCT}/adsets?fields=id,name,daily_budget,effective_status,campaign{id}&limit=500&access_token=${TOKEN}`,
    ),
    fetchAllPaged<Insight>(
      `${GRAPH}/${ACCT}/insights?level=adset&fields=adset_id,spend,impressions,inline_link_clicks,actions&date_preset=${datePreset}&limit=500&access_token=${TOKEN}`,
    ).catch(() => [] as Insight[]),
  ]);

  const campById = new Map(
    campaigns.filter((c) => (c.name ?? '').toUpperCase().includes(TAG)).map((c) => [c.id ?? '', c.name ?? '']),
  );
  const insByAdset = new Map<string, Insight>();
  for (const ins of insights) if (ins.adset_id) insByAdset.set(ins.adset_id, ins);

  const out: MetaAdSet[] = [];
  for (const a of adsets) {
    const campName = campById.get(a.campaign?.id ?? '');
    if (!campName) continue;
    const ins = insByAdset.get(a.id ?? '');
    const impressions = parseInt(ins?.impressions ?? '0', 10) || 0;
    const linkClicks = parseInt(ins?.inline_link_clicks ?? '0', 10) || 0;
    const lpViews = actionValue(ins?.actions, 'landing_page_view');
    out.push({
      id: a.id ?? '',
      conjunto: (a.name ?? '').trim(),
      campanha: campName,
      lp: lpFromName(campName),
      temperatura: tempFromName(campName),
      status: a.effective_status ?? '',
      budgetDia: a.daily_budget ? parseInt(a.daily_budget, 10) / 100 : 0,
      gasto: parseFloat(ins?.spend ?? '0') || 0,
      impressions,
      linkClicks,
      lpViews,
      ctr: impressions > 0 ? linkClicks / impressions : 0,
      connectRate: linkClicks > 0 ? lpViews / linkClicks : 0,
    });
  }
  return out;
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
