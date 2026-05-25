# Phase 3: Integrations — Research

**Researched:** 2026-05-25
**Domain:** Google Sheets API v4, HTTP POST integration (DataCrazy), database-backed retry queue, Next.js App Router constraints
**Confidence:** HIGH

---

## Summary

Phase 3 forwards every saved lead to two destinations: a Google Sheet (via Sheets API v4 append) and DataCrazy (via configurable HTTP POST). Failures must be retried with exponential backoff. The project runs exclusively in a Next.js container on Easypanel — no separate worker process is available. All retry logic must live inside the Next.js app.

The retry strategy that fits these constraints is a **database-backed queue using the existing SyncLog table** combined with a `/api/cron/retry` route called periodically by an Easypanel cron service or external cron (cron-job.org). The SyncLog table already has `nextRetryAt`, `attemptCount`, and `status` columns — the exact fields this pattern requires. No new infrastructure is needed; only a schema migration on `Source` (to add Sheets/DataCrazy config) and the integration logic.

The sync trigger is **synchronous in the webhook route**: immediately after the lead is saved, fire both integrations. On failure, the SyncLog row is updated to `failed` with `nextRetryAt` computed using exponential backoff. A cron route polls for overdue failed rows and retries them. The lead list query for INT-04 is a simple join from `Lead` to `SyncLog`.

**Primary recommendation:** `googleapis` npm package (JWT/Service Account auth) for Sheets, plain `fetch` for DataCrazy, database queue on SyncLog, Easypanel cron calling `/api/cron/retry`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Trigger Sheets + DataCrazy send | API Route (webhook handler) | — | Fire integrations synchronously after lead save; no separate entry point needed |
| Google Sheets append | API Route (integration lib) | External Google API | googleapis JWT call from server — never from browser |
| DataCrazy POST | API Route (integration lib) | External HTTP endpoint | Plain fetch with configurable URL and field mapping per source |
| Retry queue | Database (SyncLog) | API Route (/api/cron/retry) | SyncLog already designed for this; cron polls overdue rows |
| Retry scheduler | Easypanel cron / external cron | — | Calls /api/cron/retry on interval; Easypanel supports cron services |
| Sync status display (INT-04) | API Route (data fetch) | Frontend (read-only) | Query SyncLog rows grouped by leadId; render in lead list |
| Source Sheets/DataCrazy config | Database (Source table) | — | Needs new columns: sheetsId, sheetTab, dataCrazyUrl, fieldMapping |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-01 | Lead appended to configured Google Sheet for that source | googleapis v4 `spreadsheets.values.append`, Source.sheetsId + Source.sheetTab |
| INT-02 | Lead POSTed to DataCrazy webhook URL for that source | Plain `fetch` POST, Source.dataCrazyUrl + Source.fieldMapping |
| INT-03 | Failures retried with exponential backoff without manual intervention | SyncLog-backed queue, nextRetryAt = now + 2^attempt minutes, /api/cron/retry route |
| INT-04 | Lead list shows per-lead sync status: synced, pending, failed | Query SyncLog grouped by leadId; render badge in existing lead list |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| googleapis | 172.0.0 | Google Sheets API v4 client + Service Account JWT auth | Official Google client; handles token refresh automatically |
| (built-in fetch) | Node 18+ | DataCrazy HTTP POST | No library needed — configurable POST with JSON body |
| prisma (existing) | 7.8.0 | SyncLog queue reads/writes | Already in project |

[VERIFIED: npm registry — `npm view googleapis version` returned 172.0.0]

### No New Libraries for Retry
The retry pattern is pure logic: compute `nextRetryAt = new Date(Date.now() + Math.pow(2, attemptCount) * 60_000)`, update SyncLog row, poll via cron. No queue library (BullMQ, etc.) is needed and would require Redis — unavailable in this stack.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| googleapis (172) | google-spreadsheet (5.2.0) | google-spreadsheet is a simpler wrapper but adds a dependency for minimal gain; googleapis is official and handles JWT internally |
| Easypanel cron | cron-job.org (external) | cron-job.org is free, zero-config HTTP cron — viable fallback if Easypanel cron setup is cumbersome |
| Synchronous trigger in webhook | Queued-only (async) | Synchronous trigger gives immediate first attempt; failures fall into the retry queue. Simpler than async-only. |

**Installation:**
```bash
npm install googleapis
```

**Version verification:**
```
npm view googleapis version  →  172.0.0  [VERIFIED: 2026-05-25]
```

---

## Architecture Patterns

### System Architecture Diagram

```
POST /api/webhook/[slug]  (existing)
         |
         | (lead saved + SyncLog rows created with status="pending")
         |
         v
  triggerIntegrations(lead, source)   ← new function, called inline
         |
         |-- sheetsSync(lead, source) ──→ Google Sheets API v4
         |        |                          (append row)
         |        +-- success → SyncLog.status = "done"
         |        +-- failure → SyncLog.status = "failed"
         |                       SyncLog.nextRetryAt = now + backoff
         |                       SyncLog.error = message
         |
         |-- dataCrazySync(lead, source) ──→ POST dataCrazyUrl
                  |
                  +-- success → SyncLog.status = "done"
                  +-- failure → SyncLog.status = "failed"
                                 SyncLog.nextRetryAt = now + backoff
                                 SyncLog.error = message

Cron (every 5 min):
  GET /api/cron/retry
         |
         v
  Query SyncLog WHERE status="failed" AND nextRetryAt <= now
  LIMIT 50
         |
         |-- For each row: re-run sheetsSync or dataCrazySync
         |-- attemptCount++
         |-- success → status = "done"
         |-- failure → status = "failed", nextRetryAt = exponential next
         |-- max attempts (e.g. 10) → status = "failed" permanently
```

### Recommended Project Structure
```
src/
├── lib/
│   ├── integrations/
│   │   ├── sheets.ts        # Google Sheets append logic
│   │   ├── datacrazy.ts     # DataCrazy POST logic
│   │   ├── trigger.ts       # triggerIntegrations(lead, source) — called from webhook
│   │   └── retry.ts         # computeNextRetry(attemptCount), updateSyncLog helpers
│   ├── prisma.ts            # existing
│   └── schemas/             # existing
├── app/
│   └── api/
│       ├── webhook/[slug]/route.ts    # existing — add triggerIntegrations call
│       └── cron/
│           └── retry/route.ts        # new — polls and retries failed SyncLog rows
```

### Pattern 1: Google Sheets Append with Service Account JWT

**What:** Use `googleapis` JWT auth from env vars, call `spreadsheets.values.append`
**When to use:** Every lead save where source has `sheetsId` set

```typescript
// Source: googleapis Node.js client (official) [VERIFIED: web search + docs.cloud.google.com]
import { google } from 'googleapis';

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function appendLeadToSheet(
  spreadsheetId: string,
  sheetTab: string,
  values: string[]
): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetTab}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}
```

**Private key env var note:** Service account JSON `private_key` contains literal `\n`. When stored in `.env`, the string becomes `\\n`. Must `.replace(/\\n/g, '\n')` before passing to JWT. [VERIFIED: multiple sources, known googleapis issue]

### Pattern 2: DataCrazy POST with Field Mapping

**What:** Plain fetch POST with configurable URL and JSON body built from field mapping
**When to use:** Every lead save where source has `dataCrazyUrl` set

```typescript
// [ASSUMED] — DataCrazy API is undocumented; treating as generic JSON webhook POST
async function postToDataCrazy(
  url: string,
  fieldMapping: Record<string, string>,  // e.g. { "nome": "name", "email": "email" }
  leadFields: Record<string, unknown>
): Promise<void> {
  const body: Record<string, unknown> = {};
  for (const [destKey, sourceKey] of Object.entries(fieldMapping)) {
    body[destKey] = leadFields[sourceKey];
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`DataCrazy POST failed: ${res.status} ${await res.text()}`);
  }
}
```

### Pattern 3: Retry Queue — SyncLog as Database Queue

**What:** Cron route reads `SyncLog WHERE status='failed' AND nextRetryAt <= now`, retries each
**When to use:** Cron every ~5 minutes

```typescript
// Exponential backoff: 2^attemptCount minutes, capped at 60 minutes [ASSUMED — standard formula]
function computeNextRetryAt(attemptCount: number): Date {
  const delayMs = Math.min(Math.pow(2, attemptCount) * 60_000, 60 * 60_000);
  return new Date(Date.now() + delayMs);
}

// /api/cron/retry route body
const overdue = await prisma.syncLog.findMany({
  where: {
    status: 'failed',
    nextRetryAt: { lte: new Date() },
    attemptCount: { lt: 10 },
  },
  include: { lead: { include: { source: true } } },
  take: 50,
});
```

### Pattern 4: Cron Scheduling on Easypanel

**What:** Easypanel supports a separate "Cron" service type that runs on a schedule
**When to use:** To call `/api/cron/retry` every 5 minutes

Easypanel's cron guide shows adding a cron container. The simplest approach is a minimal shell script or use `cron-job.org` (free, external) to HTTP GET `/api/cron/retry` every 5 minutes. [VERIFIED: easypanel.io/docs/guides/cron-job]

The cron route should verify a secret header to prevent unauthorized triggering:
```typescript
// /api/cron/retry/route.ts
if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Anti-Patterns to Avoid

- **Fire-and-forget without SyncLog update:** If the webhook route fires integrations without awaiting and updating SyncLog, failures are silently lost. Always await and write the result back.
- **Retrying at fixed intervals:** Without exponential backoff, a broken destination gets hammered. Use `2^attemptCount` delay.
- **No max attempt cap:** Without a cap (e.g., 10), failed rows retry forever. After max attempts, set status to `failed` permanently and stop scheduling retries.
- **Private key passed without `\n` replace:** googleapis JWT will fail to parse the PEM key. Always `.replace(/\\n/g, '\n')`.
- **Sharing googleapis JWT client across requests without re-instantiation or token caching:** The JWT client handles token refresh internally; instantiate once per module (module-level singleton is fine in Next.js server context).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Google Sheets auth | Custom OAuth2/JWT flow | `google.auth.JWT` from `googleapis` | Token refresh, retry, scopes handled internally |
| HTTP retry with backoff | Custom retry loop in fetch | Database queue + cron poller | No in-memory state that survives container restart; DB-backed is durable |
| Field mapping serialization | Complex DSL or JSON schema | Simple `Record<string, string>` key-value map | DataCrazy endpoint is unknown — keep mapping as flat key→key pairs |

**Key insight:** The SyncLog table was designed for exactly this pattern. Using it as the queue avoids Redis/BullMQ and keeps the retry state durable across container restarts (which happen on every Easypanel redeploy).

---

## Schema Changes Required

### Source table — new columns needed

The `Source` model currently has no Sheets or DataCrazy fields. Phase 3 requires:

```sql
-- Run in Supabase SQL editor (same pattern as Phase 2 migrations)
ALTER TABLE "Source"
  ADD COLUMN "sheetsId"     TEXT,
  ADD COLUMN "sheetTab"     TEXT,
  ADD COLUMN "dataCrazyUrl" TEXT,
  ADD COLUMN "fieldMapping" JSONB;
```

And update `prisma/schema.prisma`:

```prisma
model Source {
  // ... existing fields ...
  sheetsId      String?
  sheetTab      String?
  dataCrazyUrl  String?
  fieldMapping  Json?
}
```

**Migration note:** Must use raw SQL in Supabase SQL editor. `prisma db push` and `prisma migrate deploy` hang on the Transaction pooler (port 6543) — established pattern from Phase 2. [VERIFIED: project STATE.md]

### SyncLog table — no changes needed

Existing columns cover all retry state: `status`, `error`, `attemptCount`, `nextRetryAt`, `attemptedAt`. [VERIFIED: prisma/schema.prisma]

### Lead.status — update flow

Lead.status transitions: `pending` → `synced` (both destinations done) or `failed` (at least one permanently failed). This field already exists. Update it after both SyncLog rows are resolved.

---

## Common Pitfalls

### Pitfall 1: googleapis private_key newline escaping
**What goes wrong:** `Error: error:0909006C:PEM routines:get_name:no start line` — JWT auth fails
**Why it happens:** `.env` stores `\n` as literal two characters `\n`; PEM requires real newlines
**How to avoid:** Always `.replace(/\\n/g, '\n')` on `process.env.GOOGLE_PRIVATE_KEY`
**Warning signs:** Sheets call throws immediately, not on network timeout

### Pitfall 2: SyncLog rows not updated on failure
**What goes wrong:** Lead always shows "pending" in the UI; failures are invisible
**Why it happens:** Fire-and-forget call to `triggerIntegrations` — no await, no catch
**How to avoid:** Await the call in the webhook route; wrap in try/catch; always write result to SyncLog

### Pitfall 3: Cron route unauthenticated
**What goes wrong:** Any HTTP client can trigger mass retries
**How to avoid:** Guard with `X-Cron-Secret` header checked against env var

### Pitfall 4: Container restart loses in-flight retry state
**What goes wrong:** A retry was "in progress" in memory when container restarted; it never completes
**Why it happens:** No in-memory queue survives restart
**How to avoid:** Only the database is the source of truth. "Syncing" status rows should be treated as "failed" on startup (or use `failed` status directly and rely on `nextRetryAt`).

### Pitfall 5: Google Sheet not shared with service account
**What goes wrong:** `403 The caller does not have permission` from Sheets API
**Why it happens:** Spreadsheet must be shared with the service account email as Editor
**Warning signs:** Auth succeeds (token obtained) but append call returns 403

### Pitfall 6: Source has no Sheets/DataCrazy config (nullable fields)
**What goes wrong:** Trigger function throws on null `sheetsId`
**How to avoid:** In `triggerIntegrations`, skip a destination if its config fields are null. Only attempt Sheets if `source.sheetsId != null`; only attempt DataCrazy if `source.dataCrazyUrl != null`. The SyncLog rows for that destination should be created as `"done"` (skipped) or omitted entirely.

---

## Code Examples

### Verified Sheets append pattern
```typescript
// Source: developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
// + googleapis Node.js client official docs [VERIFIED]
const sheets = google.sheets({ version: 'v4', auth: jwtClient });
await sheets.spreadsheets.values.append({
  spreadsheetId: source.sheetsId,
  range: `${source.sheetTab}!A1`,
  valueInputOption: 'USER_ENTERED',
  insertDataOption: 'INSERT_ROWS',
  requestBody: {
    values: [[ lead.fields.name, lead.fields.email, /* ... */ ]],
  },
});
```

### SyncLog retry query
```typescript
// [ASSUMED — standard DB queue pattern, no library needed]
const rows = await prisma.syncLog.findMany({
  where: {
    status: 'failed',
    nextRetryAt: { lte: new Date() },
    attemptCount: { lt: 10 },
  },
  include: { lead: { include: { source: true } } },
  take: 50,
  orderBy: { nextRetryAt: 'asc' },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `resource:` key in Sheets API call | `requestBody:` key | googleapis v50+ | `resource` is deprecated; use `requestBody` |
| google-spreadsheet (simpler wrapper) | googleapis (official) | N/A | googleapis is canonical; google-spreadsheet is third-party |

**Deprecated/outdated:**
- `resource:` parameter in googleapis Sheets calls — use `requestBody:` instead [VERIFIED: googleapis changelog]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DataCrazy accepts a generic JSON POST with no required authentication header | Standard Stack / Pattern 2 | DataCrazy may require API key or specific payload shape — must be confirmed before Phase 3 execution |
| A2 | DataCrazy field mapping is a flat key→key map (dest field → lead field name) | Pattern 2 | If DataCrazy requires nested structure or array, the mapping format needs rethinking |
| A3 | Webhook route awaits `triggerIntegrations` synchronously (adds ~200-500ms to webhook response) | Architecture | If performance is a concern, fire-and-forget + immediate SyncLog "pending" is an alternative; current plan prioritizes simplicity |
| A4 | Exponential backoff formula: `2^attemptCount` minutes (1min, 2min, 4min… cap 60min) | Pattern 3 | Any reasonable formula works; this is a discretionary choice |
| A5 | Max 10 retry attempts before permanent failure | Pattern 3 | Could be higher/lower — project preference |

---

## Open Questions (RESOLVED)

1. **DataCrazy field mapping format**
   - What we know: DataCrazy endpoint is undocumented; context says "configurable URL and field mapping"
   - What's unclear: Does DataCrazy require specific field names, a specific auth header, or a specific content-type?
   - RESOLVED: Implement as fully configurable (URL + arbitrary JSON key mapping via `fieldMapping` JSONB on Source). Phase 4 Config UI will populate these fields. DataCrazy unknown details are deferred — implementation proceeds with configurable approach, real credentials injected in Plan 03-04.

2. **Webhook response latency tolerance**
   - What we know: Synchronous trigger adds latency to webhook response; sites posting leads are waiting
   - What's unclear: Is 200-500ms of added latency acceptable for the calling sites?
   - RESOLVED: Synchronous trigger is acceptable — leads are the core value, and immediate first-attempt is preferable. Errors caught and logged without returning 5xx to caller (lead is always saved). If latency becomes an issue post-deploy, switch to SyncLog-only retry.

3. **Google Service Account credentials availability**
   - What we know: STATE.md notes "Obtain Google Service Account credentials before Phase 3"
   - What's unclear: Whether credentials exist yet
   - RESOLVED: Plan 03-04 includes an explicit checkpoint task to provision and inject `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` env vars before E2E testing. All integration code is written in Plans 03-01 to 03-03 without blocking on credentials.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| googleapis npm | INT-01 (Sheets) | Install needed | 172.0.0 | — |
| Google Sheets API (external) | INT-01 | Requires GCP project + Service Account | — | Manual export only |
| DataCrazy endpoint (external) | INT-02 | Unknown — URL provided by project owner | — | Skip if URL absent |
| Easypanel cron or cron-job.org | INT-03 | Easypanel supports cron service; cron-job.org is free external fallback | — | cron-job.org |
| node fetch (built-in) | INT-02 | Node 18+ (Next.js 15 requirement) | Built-in | — |

**Missing dependencies with no fallback:**
- Google Service Account credentials (email + private key) — INT-01 cannot be tested without these

**Missing dependencies with fallback:**
- Easypanel cron → cron-job.org (free HTTP cron service, zero infrastructure)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not yet installed |
| Config file | None — Wave 0 must add |
| Quick run command | `npx jest --testPathPattern=integrations --passWithNoTests` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-01 | Sheets append called with correct spreadsheetId, range, values | unit (mock googleapis) | `npx jest src/lib/integrations/sheets.test.ts -x` | Wave 0 |
| INT-02 | DataCrazy fetch called with correct URL and mapped body | unit (mock fetch) | `npx jest src/lib/integrations/datacrazy.test.ts -x` | Wave 0 |
| INT-03 | Failed SyncLog rows are picked up and retried by /api/cron/retry | unit (mock DB + integration fns) | `npx jest src/app/api/cron/retry/route.test.ts -x` | Wave 0 |
| INT-04 | Lead query returns sync status fields | unit (Prisma mock or test DB) | `npx jest src/lib/integrations/status.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --passWithNoTests -x` (only tests that exist)
- **Per wave merge:** full jest suite
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Install jest + ts-jest: `npm install --save-dev jest ts-jest @types/jest`
- [ ] `jest.config.ts` — configure ts-jest for src/
- [ ] `src/lib/integrations/sheets.test.ts` — covers INT-01
- [ ] `src/lib/integrations/datacrazy.test.ts` — covers INT-02
- [ ] `src/app/api/cron/retry/route.test.ts` — covers INT-03

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | Yes | Cron route guarded by `X-Cron-Secret` header (env var) |
| V5 Input Validation | Yes | Source config fields (sheetsId, dataCrazyUrl) treated as untrusted until validated by admin input |
| V6 Cryptography | No | Service Account key in env var (not hardcoded) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized cron trigger | Elevation of Privilege | `X-Cron-Secret` header checked against env var |
| SSRF via dataCrazyUrl | Tampering | URL is admin-configured (not user-supplied), but should validate it is HTTPS and not a private IP range |
| Service account key leakage | Information Disclosure | Key only in env vars; never logged; never returned in API response |

---

## Sources

### Primary (HIGH confidence)
- `npm view googleapis version` — confirmed version 172.0.0 [VERIFIED: npm registry, 2026-05-25]
- [Google Sheets API v4 — values.append reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append) — required parameters and body format confirmed
- [Easypanel cron job guide](https://easypanel.io/docs/guides/cron-job) — confirmed cron is Dockerfile-based or external service; no native HTTP-trigger cron
- `prisma/schema.prisma` in project — confirmed SyncLog columns, Source columns

### Secondary (MEDIUM confidence)
- [googleapis Node.js client — multiple web sources](https://github.com/googleapis/google-api-nodejs-client) — JWT auth pattern, `requestBody` vs `resource`, private_key newline handling
- [Background Jobs with Next.js and Supabase](https://www.iloveblogs.blog/guides/nextjs-supabase-background-jobs-async-patterns) — database queue pattern without separate worker

### Tertiary (LOW confidence)
- DataCrazy API behavior — no documentation found; all claims about its interface are [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — googleapis version verified against npm; fetch is Node built-in
- Architecture: HIGH — SyncLog table already designed for queue pattern; verified against schema
- Retry pattern: HIGH — database-backed queue is well-established for serverless/container environments
- DataCrazy integration: LOW — API undocumented; all claims are assumed

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (googleapis updates frequently but the Sheets v4 API surface is stable)
