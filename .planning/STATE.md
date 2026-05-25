# STATE — Lead Capture Dashboard

## Project Reference

**Core value**: Receive leads from multiple sites, guarantee none are lost, and provide immediate visibility on volume and origin.
**Stack**: Next.js (App Router) + SQLite (Prisma) + Google Sheets (Service Account) + DataCrazy (webhook POST)
**Deploy target**: VPS Hostinger 69.62.89.206, Traefik, subdomain on esqtools.com

## Current Position

**Phase**: 1 — Foundation
**Plan**: 1 of 4 complete
**Status**: Plan 01-01 complete — auth foundation built

```
Progress: [----------] 5% — 0/5 phases complete (1/4 plans in Phase 1)
```

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 1 - Foundation | Auth + infra running on VPS | In Progress (1/4 plans) |
| 2 - Webhook Ingestion | Both sites can POST leads to SQLite | Not started |
| 3 - Integrations | Leads forwarded to Sheets + DataCrazy with retry | Not started |
| 4 - Config UI | Sources and destinations managed from browser | Not started |
| 5 - Analytics Dashboard | Lead volume, origin, quality visible in real time | Not started |

## Performance Metrics

- Phases complete: 0/5
- Requirements delivered: 0/22 (AUTH-01, AUTH-02, AUTH-03 infrastructure in place)
- Plans run: 1

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-foundation | 01 | 8 min | 3/3 | 9 created |

## Accumulated Context

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js App Router | Fullstack single app — API Routes for webhooks, SSR for dashboard |
| SQLite + Prisma | Zero-config local DB, ideal for standalone VPS |
| Google Sheets via Service Account | No browser OAuth, fixed credential in .env |
| DataCrazy as configurable webhook POST | API undocumented — treat as simple configurable endpoint |
| Multi-site as "sources" | Each source has its own schema, Sheets destination, and CRM destination |
| Prisma 7.8.0 driver adapter pattern | Prisma 7 removed built-in query engine; must use @prisma/adapter-better-sqlite3 for SQLite |
| Prisma client at src/generated/prisma/client | Prisma 7 generates typed client locally; import from @/generated/prisma/client |

### Blockers

None.

### Todos

- Define subdomain on esqtools.com before Phase 1 deploy
- Obtain Google Service Account credentials before Phase 3
- Clarify DataCrazy field mapping expectations before Phase 3

## Session Continuity

**Last updated**: 2026-05-25 — plan 01-01 complete
**Stopped at**: Plan 01-01 complete; next is 01-02-PLAN.md (Middleware + login page + dashboard shell + role guards)
**Resume file**: .planning/phases/01-foundation/01-02-PLAN.md
