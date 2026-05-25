# STATE — Lead Capture Dashboard

## Project Reference

**Core value**: Receive leads from multiple sites, guarantee none are lost, and provide immediate visibility on volume and origin.
**Stack**: Next.js (App Router) + SQLite (Prisma) + Google Sheets (Service Account) + DataCrazy (webhook POST)
**Deploy target**: VPS Hostinger 69.62.89.206, Traefik, subdomain on esqtools.com

## Current Position

**Phase**: 1 — Foundation
**Plan**: 2 of 4 complete
**Status**: Plan 01-02 complete — middleware, login page, dashboard shell, role guards built

```
Progress: [----------] 10% — 0/5 phases complete (2/4 plans in Phase 1)
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
- Requirements delivered: 2/22 (AUTH-01, AUTH-03 UI + route guards delivered)
- Plans run: 1

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-foundation | 01 | 8 min | 3/3 | 9 created |
| 01-foundation | 02 | 5 min | 3/3 | 5 created |

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

**Last updated**: 2026-05-24 — plan 01-02 complete
**Stopped at**: Plan 01-02 complete; next is 01-03-PLAN.md (Admin user management page + seed script)
**Resume file**: .planning/phases/01-foundation/01-03-PLAN.md
