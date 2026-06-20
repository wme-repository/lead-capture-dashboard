# STATE — Lead Capture Dashboard

## Project Reference

**Core value**: Receive leads from multiple sites, guarantee none are lost, and provide immediate visibility on volume and origin.
**Stack**: Next.js (App Router) + PostgreSQL/Supabase (Prisma) + Google Sheets (Service Account) + DataCrazy (webhook POST)
**Deploy target**: VPS 178.104.14.40, Easypanel + Traefik, `leads.esqtools.com`

## Current Position

**Phase**: 3 — Integrations
**Plan**: Not started
**Status**: Phase 2 complete — webhook ingestion live and verified

```
Progress: [#####-----] 40% — 2/5 phases complete
```

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 1 - Foundation | Auth + infra running on VPS | ✅ Complete (2026-05-25) |
| 2 - Webhook Ingestion | Both sites can POST leads to PostgreSQL | ✅ Complete (2026-05-25) |
| 3 - Integrations | Leads forwarded to Sheets + DataCrazy with retry | Not started |
| 4 - Config UI | Sources and destinations managed from browser | Not started |
| 5 - Analytics Dashboard | Lead volume, origin, quality visible in real time | Not started |

## Performance Metrics

- Phases complete: 2/5
- Requirements delivered: 9/22 (AUTH-01, AUTH-02, AUTH-03, HOOK-01, HOOK-02, HOOK-03, HOOK-04, DATA-01, DATA-02)
- Plans run: 7

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-foundation | 01 | 8 min | 3/3 | 9 created |
| 01-foundation | 02 | 5 min | 3/3 | 5 created |
| 01-foundation | 03 | 15 min | 2/2 | 4 created |
| 01-foundation | 04 | 2 days | deploy | VPS live |
| 02-webhook-ingestion | 01 | 5 min | 2/2 | 2 created |
| 02-webhook-ingestion | 02 | 10 min | 2/2 | 2 created |
| 02-webhook-ingestion | 03 | 15 min | 2/2 | E2E verified (6/6 tests) |

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
| Test source seeded via SQL | Source slug="test", token="test-webhook-token-change-me", schemaType="standard" |
| Questionnaire source via DB insert | Source slug="quest", token="quest-webhook-token", schemaType="questionnaire" |

### Infrastructure Notes

- Container: Swarm service `app_leads_01leads`, PORT=80 (Easypanel override)
- Traefik: `leads-custom.yaml` at `/etc/easypanel/traefik/config/` routes `leads.esqtools.com` → `app_leads_01leads:80`
- Database: Supabase PostgreSQL, tables created via raw SQL (migration tooling doesn't work with Transaction pooler)
- Admin seed: `admin@esqtools.com` / `ChangeMe123!` (must change on first login)
- VPS access: root@178.104.14.40, SSH key not configured — use password

### Blockers

None.

### Todos

- Obtain Google Service Account credentials before Phase 3
- Clarify DataCrazy field mapping expectations before Phase 3

## Session Continuity

**Last updated**: 2026-05-25 — Phase 2 complete, all 6 E2E tests passed
**Stopped at**: Phase 2 verified, ready for Phase 3 planning
**Resume**: Run /gsd-plan-phase for Phase 3 — Integrations (Google Sheets + DataCrazy forwarding with retry)
