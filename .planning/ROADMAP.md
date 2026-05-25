# ROADMAP — Lead Capture Dashboard

## Project

Receive leads from multiple sites, guarantee none are lost, and provide immediate visibility on volume and origin.

## Phases

- [ ] **Phase 1: Foundation** — Next.js project scaffolding, Prisma/SQLite schema, deploy infra with Traefik, and multi-user authentication
- [ ] **Phase 2: Webhook Ingestion** — Dual-schema webhook endpoints with validation and token auth, persisting all leads and sync logs to SQLite
- [ ] **Phase 3: Integrations** — Google Sheets append and DataCrazy POST per source, with retry queue and sync status tracking
- [ ] **Phase 4: Config UI** — Source management interface: create sources, configure Sheets/DataCrazy destinations, copy webhook URLs
- [ ] **Phase 5: Analytics Dashboard** — Charts (hourly/daily leads), UTM breakdown, leadscore distribution, paginated lead list with real-time updates

## Phase Details

### Phase 1: Foundation
**Goal**: Project runs on VPS with working auth — users can log in and access the app
**Depends on**: Nothing
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. User can log in with email + password and reach the dashboard
  2. Admin can create and deactivate user accounts
  3. Non-admin users see the dashboard read-only and cannot access config
  4. App is reachable via HTTPS on esqtools.com subdomain through Traefik
**Plans**: 4 plans
- [x] 01-01-PLAN.md — Scaffold + Prisma schema + better-auth server wiring
- [x] 01-02-PLAN.md — Middleware + login page + dashboard shell + role guards
- [x] 01-03-PLAN.md — Admin user management page + seed script
- [ ] 01-04-PLAN.md — Dockerfile + docker-compose + Traefik deploy
**UI hint**: yes

### Phase 2: Webhook Ingestion
**Goal**: Both sites can POST leads that are reliably saved to SQLite
**Depends on**: Phase 1
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. A POST to `/api/webhook/:sourceId` with a standard lead payload (name, email, phone, UTMs) returns 200 and the lead appears in the database
  2. A POST with a questionnaire + leadscore payload is accepted and saved with correct schema_type
  3. A POST missing required fields or with invalid email returns 422
  4. A POST without the correct `X-Webhook-Token` header returns 401
  5. Each sync attempt (pending/synced/failed) is recorded in the sync log table
**Plans**: TBD

### Phase 3: Integrations
**Goal**: Every saved lead is automatically forwarded to Google Sheets and DataCrazy, with failures retried
**Depends on**: Phase 2
**Requirements**: INT-01, INT-02, INT-03, INT-04
**Success Criteria** (what must be TRUE):
  1. A new lead triggers an append to the configured Google Sheet for that source
  2. A new lead triggers a POST to the DataCrazy webhook URL for that source
  3. If either destination fails, the lead is queued and retried with exponential backoff without manual intervention
  4. The lead list shows per-lead sync status: synced, pending, or failed
**Plans**: TBD

### Phase 4: Config UI
**Goal**: User can fully configure sources and destinations from the browser without touching code or env files
**Depends on**: Phase 1 (auth gating), Phase 2 (source concept exists)
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04
**Success Criteria** (what must be TRUE):
  1. Admin can create a new source with a name, schema type, and generated webhook token
  2. Admin can configure Google Sheets for a source (Spreadsheet ID, tab name, field mapping)
  3. Admin can configure DataCrazy for a source (webhook URL and field mapping)
  4. Config tab displays the ready-to-copy webhook URL for each source
**Plans**: TBD
**UI hint**: yes

### Phase 5: Analytics Dashboard
**Goal**: User can see lead volume, origin, and quality at a glance without reloading the page
**Depends on**: Phase 2 (leads exist), Phase 3 (sync status exists), Phase 4 (sources named)
**Requirements**: ANL-01, ANL-02, ANL-03, ANL-04, ANL-05, ANL-06
**Success Criteria** (what must be TRUE):
  1. Dashboard shows a bar/line chart of leads per hour for the last 24 hours
  2. Dashboard shows a chart of leads per day for the last 30 days
  3. Dashboard shows UTM source breakdown with lead counts per channel
  4. Dashboard shows a paginated list of recent leads with their main fields and sync status
  5. Dashboard shows leadscore A/B/C/D distribution for questionnaire sources
  6. Dashboard data refreshes automatically (polling or SSE) without a page reload
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/4 | In Progress | - |
| 2. Webhook Ingestion | 0/? | Not started | - |
| 3. Integrations | 0/? | Not started | - |
| 4. Config UI | 0/? | Not started | - |
| 5. Analytics Dashboard | 0/? | Not started | - |

## Coverage

| Requirement | Phase |
|-------------|-------|
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| HOOK-01 | Phase 2 |
| HOOK-02 | Phase 2 |
| HOOK-03 | Phase 2 |
| HOOK-04 | Phase 2 |
| DATA-01 | Phase 2 |
| DATA-02 | Phase 2 |
| INT-01 | Phase 3 |
| INT-02 | Phase 3 |
| INT-03 | Phase 3 |
| INT-04 | Phase 3 |
| CFG-01 | Phase 4 |
| CFG-02 | Phase 4 |
| CFG-03 | Phase 4 |
| CFG-04 | Phase 4 |
| ANL-01 | Phase 5 |
| ANL-02 | Phase 5 |
| ANL-03 | Phase 5 |
| ANL-04 | Phase 5 |
| ANL-05 | Phase 5 |
| ANL-06 | Phase 5 |

**Coverage: 22/22 requirements mapped.**
