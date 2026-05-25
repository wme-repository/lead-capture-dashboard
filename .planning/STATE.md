# STATE — Lead Capture Dashboard

## Project Reference

**Core value**: Receive leads from multiple sites, guarantee none are lost, and provide immediate visibility on volume and origin.
**Stack**: Next.js (App Router) + SQLite (Prisma) + Google Sheets (Service Account) + DataCrazy (webhook POST)
**Deploy target**: VPS Hostinger 69.62.89.206, Traefik, subdomain on esqtools.com

## Current Position

**Phase**: 1 — Foundation
**Plan**: Not started
**Status**: Roadmap created, ready to plan Phase 1

```
Progress: [----------] 0% — 0/5 phases complete
```

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 1 - Foundation | Auth + infra running on VPS | Not started |
| 2 - Webhook Ingestion | Both sites can POST leads to SQLite | Not started |
| 3 - Integrations | Leads forwarded to Sheets + DataCrazy with retry | Not started |
| 4 - Config UI | Sources and destinations managed from browser | Not started |
| 5 - Analytics Dashboard | Lead volume, origin, quality visible in real time | Not started |

## Performance Metrics

- Phases complete: 0/5
- Requirements delivered: 0/22
- Plans run: 0

## Accumulated Context

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js App Router | Fullstack single app — API Routes for webhooks, SSR for dashboard |
| SQLite + Prisma | Zero-config local DB, ideal for standalone VPS |
| Google Sheets via Service Account | No browser OAuth, fixed credential in .env |
| DataCrazy as configurable webhook POST | API undocumented — treat as simple configurable endpoint |
| Multi-site as "sources" | Each source has its own schema, Sheets destination, and CRM destination |

### Blockers

None yet.

### Todos

- Define subdomain on esqtools.com before Phase 1 deploy
- Obtain Google Service Account credentials before Phase 3
- Clarify DataCrazy field mapping expectations before Phase 3

## Session Continuity

**Last updated**: 2026-05-24 — roadmap created
**Next action**: `/gsd-plan-phase 1` to plan Phase 1: Foundation
