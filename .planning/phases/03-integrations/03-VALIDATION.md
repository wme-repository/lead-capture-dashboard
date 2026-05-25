---
phase: 3
slug: integrations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (installed in Plan 03-02 Wave 2) |
| **Config file** | jest.config.ts — Wave 2 installs |
| **Quick run command** | `npx jest --passWithNoTests -x` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --passWithNoTests -x`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | INT-01, INT-02 | — | N/A | structural | `grep -n "sheetsId\|dataCrazyUrl\|fieldMapping" prisma/schema.prisma` | ✅ | ⬜ pending |
| 3-01-02 | 01 | 1 | INT-01, INT-02 | — | N/A | manual | Supabase SQL Editor: confirm columns exist | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | INT-01 | T-03-02-01 | Service Account JWT auth; no user credentials exposed | unit | `npx jest src/lib/integrations/sheets.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | INT-02 | T-03-02-02 | AbortSignal timeout prevents hanging; URL from DB only | unit | `npx jest src/lib/integrations/datacrazy.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 2 | INT-03 | — | N/A | unit | `npx jest src/lib/integrations/retry.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 3 | INT-03 | T-03-03-01 | X-Cron-Secret header required; 401 without it | unit | `npx jest src/app/api/cron/retry/route.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 3 | INT-04 | — | N/A | unit | `npx jest src/app/api/leads/route.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 4 | INT-01, INT-02 | — | N/A | manual | curl E2E against production | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/integrations/sheets.test.ts` — unit tests for INT-01 (mock googleapis)
- [ ] `src/lib/integrations/datacrazy.test.ts` — unit tests for INT-02 (mock fetch)
- [ ] `src/lib/integrations/retry.test.ts` — unit tests for INT-03 (exponential backoff)
- [ ] `src/app/api/cron/retry/route.test.ts` — cron route auth + retry dispatch
- [ ] `src/app/api/leads/route.test.ts` — leads API with syncLog status
- [ ] `jest.config.ts` + jest/ts-jest install — if not already present

Plan 03-02 (Wave 2) creates all test files as part of its tasks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase SQL: Source columns added | INT-01, INT-02 | Transaction pooler blocks prisma db push | Run sql/03-source-migration.sql in Supabase SQL Editor; confirm columns in Table Editor |
| Google Sheets row appended | INT-01 | Requires live GCP credentials + real spreadsheet | curl test with valid lead + check spreadsheet row in Google Sheets UI |
| DataCrazy POST received | INT-02 | Requires real DataCrazy URL (external) | curl test + check DataCrazy dashboard for received lead |
| cron-job.org retry fires | INT-03 | External HTTP cron — cannot be unit tested | Manually fail a SyncLog row; wait for cron schedule; verify status changes to `done` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
