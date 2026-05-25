---
phase: 03-integrations
plan: "02"
subsystem: integrations
tags: [google-sheets, datacrazy, retry, jest, unit-tests]
dependency_graph:
  requires: [03-01]
  provides: [appendLeadToSheet, postToDataCrazy, triggerIntegrations, computeNextRetryAt, updateSyncLogSuccess, updateSyncLogFailure]
  affects: [src/lib/integrations]
tech_stack:
  added: [googleapis, jest, ts-jest, @types/jest]
  patterns: [JWT service account auth, AbortSignal.timeout, Promise.allSettled, exponential backoff cap]
key_files:
  created:
    - src/lib/integrations/sheets.ts
    - src/lib/integrations/datacrazy.ts
    - src/lib/integrations/retry.ts
    - src/lib/integrations/trigger.ts
    - src/lib/integrations/sheets.test.ts
    - src/lib/integrations/datacrazy.test.ts
    - src/lib/integrations/retry.test.ts
    - jest.config.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - Lead model uses individual typed columns (name, email, phone, utmSource, etc.) not a fields:Json blob — sheets.ts and datacrazy.ts adapted accordingly
  - AbortSignal.timeout(10_000) added to datacrazy.ts fetch per T-03-02-03 threat mitigation
metrics:
  duration: ~15 min
  completed: 2026-05-25
  tasks: 2/2
  files_created: 10
---

# Phase 3 Plan 02: Integration Library Files Summary

Implement four integration library files (sheets, datacrazy, retry, trigger) with full unit test coverage using jest + ts-jest, with googleapis JWT for Sheets and a 10s fetch timeout for DataCrazy.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install deps + jest config + integration lib files | e196e11 | package.json, jest.config.ts, sheets.ts, datacrazy.ts, retry.ts |
| 2 | trigger.ts + unit tests for all integration libs | e30aec8 | trigger.ts, sheets.test.ts, datacrazy.test.ts, retry.test.ts |

## What Was Built

- **sheets.ts** — `appendLeadToSheet(source, lead)`: JWT auth via env vars, appends a row using the Lead model's individual columns (name, email, phone, utmSource/Medium/Campaign/Term/Content, score, grade); no-op if sheetsId is null.
- **datacrazy.ts** — `postToDataCrazy(source, lead)`: POSTs lead fields to the configured URL, applies fieldMapping if present, includes `AbortSignal.timeout(10_000)` per threat model; no-op if dataCrazyUrl is null.
- **retry.ts** — `computeNextRetryAt(n)`: min(2^n * 60s, 3600s); `updateSyncLogSuccess` and `updateSyncLogFailure` update SyncLog rows in Prisma.
- **trigger.ts** — `triggerIntegrations(lead)`: runs sheets and datacrazy in parallel via Promise.allSettled, updates SyncLog rows, sets Lead.status to "synced" or "failed".
- **Unit tests** — 9 tests across 3 test files, all passing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lead model has individual columns, not fields:Json**
- **Found during:** Task 1, reading prisma/schema.prisma
- **Issue:** Plan assumed `lead.fields` as a Json blob; actual schema has typed columns (name, email, phone, utmSource, etc.)
- **Fix:** sheets.ts and datacrazy.ts adapted to use individual Lead fields; `leadToRecord()` helper in datacrazy.ts maps column names to snake_case keys for the body
- **Files modified:** src/lib/integrations/sheets.ts, src/lib/integrations/datacrazy.ts

**2. [Rule 2 - Security] Added AbortSignal.timeout per threat model T-03-02-03**
- **Found during:** Task 1, reading threat_model section
- **Issue:** Threat T-03-02-03 (DoS via hanging external call) required mitigation
- **Fix:** Added `signal: AbortSignal.timeout(10_000)` to fetch call in datacrazy.ts
- **Files modified:** src/lib/integrations/datacrazy.ts

**3. [Rule 1 - Bug] jest.mock() hoisting prevented mockAppend reference**
- **Found during:** Task 2 test run
- **Issue:** `const mockAppend = jest.fn()` defined before `jest.mock()` call but `jest.mock` is hoisted — variable not yet initialized when mock factory runs
- **Fix:** Moved mock factory to use inline `jest.fn()`, then extracted reference via `require('googleapis')` after mock is set up
- **Files modified:** src/lib/integrations/sheets.test.ts

## Verification Results

- `npx tsc --noEmit` — passes (only pre-existing `.next/` cache error unrelated to this plan)
- `npx jest src/lib/integrations/` — 9/9 tests pass across 3 suites

## Self-Check: PASSED

- src/lib/integrations/sheets.ts — FOUND
- src/lib/integrations/datacrazy.ts — FOUND
- src/lib/integrations/retry.ts — FOUND
- src/lib/integrations/trigger.ts — FOUND
- src/lib/integrations/sheets.test.ts — FOUND
- src/lib/integrations/datacrazy.test.ts — FOUND
- src/lib/integrations/retry.test.ts — FOUND
- jest.config.ts — FOUND
- Commit e196e11 — FOUND
- Commit e30aec8 — FOUND
