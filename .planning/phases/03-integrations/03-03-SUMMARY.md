---
phase: 03-integrations
plan: "03"
subsystem: api-routes
tags: [cron, retry, webhook, leads, integrations]
dependency_graph:
  requires: [03-02]
  provides: [cron-retry-route, leads-api, webhook-integration-wiring]
  affects: [dashboard-ui]
tech_stack:
  added: []
  patterns: [fire-and-forget-integration, cron-secret-auth, session-auth]
key_files:
  created:
    - src/app/api/cron/retry/route.ts
    - src/app/api/cron/retry/route.test.ts
    - src/app/api/leads/route.ts
  modified:
    - src/app/api/webhook/[slug]/route.ts
    - src/middleware.ts
decisions:
  - "triggerIntegrations wrapped in try/catch in webhook — integration failure non-fatal, lead always saved"
  - "Cron processes max 50 overdue rows per run, bounded by attemptCount < 10"
  - "Lead.status refreshed after each cron run based on all SyncLog states"
metrics:
  duration: "15 minutes"
  completed: "2026-05-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 03 Plan 03: Wire Routes and Cron Retry — Summary

**One-liner:** Webhook now calls triggerIntegrations post-lead-save; GET /api/cron/retry retries failed SyncLogs with X-Cron-Secret auth; GET /api/leads exposes per-lead sync status for dashboard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire webhook + create cron retry route | 91fc3b1 | webhook/[slug]/route.ts, cron/retry/route.ts, cron/retry/route.test.ts, middleware.ts |
| 2 | GET /api/leads with sync status | 7a39aad | leads/route.ts |

## What Was Built

### Modified: src/app/api/webhook/[slug]/route.ts
After the prisma.$transaction saves the lead, the route re-fetches the lead with `include: { source: true, syncLogs: true }` and calls `triggerIntegrations`. Errors are caught and logged — the webhook always returns 200 with the lead ID.

### Created: src/app/api/cron/retry/route.ts
GET handler that:
1. Validates `X-Cron-Secret` header against `CRON_SECRET` env var — returns 401 on mismatch
2. Queries `SyncLog` where status=failed, nextRetryAt <= now, attemptCount < 10 (take 50, ordered by nextRetryAt asc)
3. For each row, calls `appendLeadToSheet` or `postToDataCrazy` based on destination
4. Calls `updateSyncLogSuccess` or `updateSyncLogFailure` accordingly
5. Refreshes `Lead.status` for all affected leads (synced if all done, failed if any failed, else pending)
6. Returns `{ processed, total }`

### Created: src/app/api/cron/retry/route.test.ts
Unit tests covering:
- 401 returned without correct X-Cron-Secret
- 200 with `{ processed: 0 }` when no overdue rows

### Created: src/app/api/leads/route.ts
GET handler protected by `auth.api.getSession`. Returns 50 most recent leads ordered by receivedAt desc, each including source name/slug and all SyncLog entries (destination, status, error, attemptCount, attemptedAt).

### Modified: src/middleware.ts
Added `api/cron` to the exclusion list so the cron route is not blocked by session middleware (it uses its own X-Cron-Secret auth).

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Compliance

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-03-03-01: /api/cron/retry without secret | X-Cron-Secret validated; 401 on mismatch | Implemented |
| T-03-03-02: /api/leads exposes PII | auth.api.getSession check; 401 if no session | Implemented |
| T-03-03-03: DoS via unlimited cron rows | take: 50 cap + attemptCount < 10 bound | Implemented |

## Known Stubs

None — all data is fetched from the database.

## Self-Check: PASSED

- `src/app/api/cron/retry/route.ts` — exists
- `src/app/api/cron/retry/route.test.ts` — exists, 2 tests pass
- `src/app/api/leads/route.ts` — exists
- `src/app/api/webhook/[slug]/route.ts` — imports triggerIntegrations
- `src/middleware.ts` — excludes api/cron
- Commits 91fc3b1 and 7a39aad exist in git log
- `npx tsc --noEmit` — no errors in project files (only pre-existing .next/dev/types cache issue unrelated to this plan)
