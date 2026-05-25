# STATE — Lead Capture Dashboard

## Project Reference

**Core value**: Receive leads from multiple sites, guarantee none are lost, and provide immediate visibility on volume and origin.
**Stack**: Next.js (App Router) + PostgreSQL/Supabase (Prisma) + Google Sheets (Service Account) + DataCrazy (webhook POST)
**Deploy target**: VPS 69.62.89.206, Easypanel + Traefik, `leads.esqtools.com`

## Current Position

**Phase**: 2 — Webhook Ingestion
**Plan**: 0 of ? (not started)
**Status**: Phase 1 complete — app live at https://leads.esqtools.com, login working

```
Progress: [##--------] 20% — 1/5 phases complete
```

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 1 - Foundation | Auth + infra running on VPS | ✅ Complete (2026-05-25) |
| 2 - Webhook Ingestion | Both sites can POST leads to PostgreSQL | In Progress |
| 3 - Integrations | Leads forwarded to Sheets + DataCrazy with retry | Not started |
| 4 - Config UI | Sources and destinations managed from browser | Not started |
| 5 - Analytics Dashboard | Lead volume, origin, quality visible in real time | Not started |

## Performance Metrics

- Phases complete: 1/5
- Requirements delivered: 3/22 (AUTH-01, AUTH-02, AUTH-03)
- Plans run: 4

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-foundation | 01 | 8 min | 3/3 | 9 created |
| 01-foundation | 02 | 5 min | 3/3 | 5 created |
| 01-foundation | 03 | 15 min | 2/2 | 4 created |
| 01-foundation | 04 | 2 days | deploy | VPS live |

## Accumulated Context

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| PostgreSQL via Supabase | Switched from SQLite mid-deploy — Supabase Transaction pooler (port 6543) for IPv4 VPS |
| Prisma 7.8.0 + @prisma/adapter-pg | Prisma 7 requires driver adapters; pg adapter for PostgreSQL |
| Easypanel deploy via "Implantar" button | Manages Docker Swarm service automatically; builds from GitHub |
| Traefik leads-custom.yaml | Separate file so Easypanel doesn't overwrite custom domain routing on redeploy |
| Seed uses signUpEmail + Prisma role update | auth.api.createUser requires active admin session; signUpEmail works without session |
| Next.js App Router | Fullstack single app — API Routes for webhooks, SSR for dashboard |
| Google Sheets via Service Account | No browser OAuth, fixed credential in .env |
| DataCrazy as configurable webhook POST | API undocumented — treat as simple configurable endpoint |
| Multi-site as "sources" | Each source has its own schema, Sheets destination, and CRM destination |

### Infrastructure Notes

- Container: Swarm service `app_leads_01leads`, PORT=80 (Easypanel override)
- Traefik: `leads-custom.yaml` at `/etc/easypanel/traefik/config/` routes `leads.esqtools.com` → `app_leads_01leads:80`
- Database: Supabase PostgreSQL, tables created via raw SQL (migration tooling doesn't work with Transaction pooler)
- Admin seed: `admin@esqtools.com` / `ChangeMe123!` (must change on first login)

### Blockers

None.

### Todos

- Obtain Google Service Account credentials before Phase 3
- Clarify DataCrazy field mapping expectations before Phase 3

## Session Continuity

**Last updated**: 2026-05-25 — Phase 1 complete, app live at leads.esqtools.com
**Stopped at**: Phase 2 planning not started
**Resume**: Run /gsd-plan-phase for Phase 2 — Webhook Ingestion
