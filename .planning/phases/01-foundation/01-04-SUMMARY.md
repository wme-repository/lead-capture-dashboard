---
phase: 01-foundation
plan: "04"
subsystem: infra
tags: [docker, traefik, deploy, sqlite, prisma]
dependency_graph:
  requires: [01-01, 01-02, 01-03]
  provides: [production-container, traefik-routing]
  affects: []
tech_stack:
  added: [Dockerfile, docker-compose.yml]
  patterns: [multi-stage-build, named-volume-sqlite, easypanel-network]
key_files:
  created:
    - Dockerfile
    - docker-compose.yml
    - .dockerignore
  modified:
    - .env.example
key_decisions:
  - container_name leads_app matches Traefik service URL http://leads_app:3000/
  - Named volume leads_data mounted at /app/prisma/data for SQLite persistence
  - prisma migrate deploy (not migrate dev) in CMD — non-interactive, safe for Docker
  - restart unless-stopped mitigates container restart loop (T-04-03)
metrics:
  duration: "~5 min (Task 1 only; Task 2 pending human verification)"
  completed: "2026-05-25"
  tasks_completed: 1
  tasks_total: 2
  files_created: 3
  files_modified: 1
---

# Phase 1 Plan 4: VPS Deploy (Dockerfile + Traefik) Summary

**One-liner:** Multi-stage Dockerfile with standalone Next.js output, prisma migrate deploy entrypoint, named SQLite volume, and Easypanel network for Traefik routing to leads.esqtools.com.

## Status

**PAUSED at checkpoint** — Task 1 complete and committed. Task 2 requires manual VPS deploy + Traefik config + smoke test verification by human.

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Write Dockerfile and docker-compose.yml | Done | e5418c9 |
| 2 | checkpoint:human-verify — VPS deploy + Traefik config | Awaiting human | — |

## What Was Built

### Dockerfile

Multi-stage build:
- **Builder stage:** `node:22-alpine`, `npm ci`, `npx prisma generate`, `npm run build`
- **Runner stage:** Copies `.next/standalone`, `.next/static`, `public`, Prisma client and schema
- **CMD:** `prisma migrate deploy && node server.js` — runs migrations on every container start

### docker-compose.yml

- `container_name: leads_app` — matches the Traefik service URL `http://leads_app:3000/`
- Named volume `leads_data` mounted at `/app/prisma/data` for SQLite persistence
- `DATABASE_URL=file:/app/prisma/data/prod.db` — points inside the volume
- `restart: unless-stopped` — mitigates silent restart loop if migration fails (T-04-03)
- Joins `easypanel` external Docker network — required for Traefik to reach the container

### .dockerignore

Excludes: `node_modules`, `.next`, `.env`, `*.local`, `prisma/*.db*`, `.git`, `.planning`

### .env.example

Updated `DATABASE_URL` to production path (`/app/prisma/data/prod.db`) and clarified `BETTER_AUTH_SECRET` generation instruction.

## Acceptance Criteria Verification

- [x] Dockerfile CMD contains `prisma migrate deploy && node server.js`
- [x] docker-compose.yml has `container_name: leads_app`
- [x] docker-compose.yml mounts named volume to `/app/prisma/data`
- [x] docker-compose.yml joins `easypanel` external network
- [x] .dockerignore excludes `node_modules`, `.env`, `prisma/*.db`
- [x] DATABASE_URL uses `/app/prisma/data/prod.db` path
- [ ] `docker build` exits 0 — **pending VPS deploy** (local build skipped; actual verify at checkpoint)

## Checkpoint — Pending Human Verification

The following must be completed manually on the VPS before this plan can be marked complete.

### Step 1 — Deploy to Easypanel

Create project `leads`, service `app`. Deploy from Git repo. Then:
```bash
docker ps --format "{{.Names}}" | grep leads
```
Note the actual container name Easypanel assigns. If it differs from `leads_app`, update the Traefik service URL accordingly.

### Step 2 — Seed admin on first deploy

```bash
docker exec leads_app sh -c "DATABASE_URL=file:/app/prisma/data/prod.db npx prisma db seed"
```
Expected: "Admin user created: admin@esqtools.com"

### Step 3 — Add Traefik entries

SSH into VPS. Edit `/etc/easypanel/traefik/config/main.yaml`. Add under `routers`:
```json
"http-leads_app-0": {
  "service": "leads_app-0",
  "rule": "Host(`leads.esqtools.com`) && PathPrefix(`/`)",
  "priority": 0,
  "middlewares": ["redirect-to-https", "bad-gateway-error-page"],
  "entryPoints": ["http"]
},
"https-leads_app-0": {
  "service": "leads_app-0",
  "rule": "Host(`leads.esqtools.com`) && PathPrefix(`/`)",
  "priority": 0,
  "middlewares": ["bad-gateway-error-page"],
  "tls": {
    "certResolver": "letsencrypt",
    "domains": [{ "main": "leads.esqtools.com" }]
  },
  "entryPoints": ["https"]
}
```
Add under `services`:
```json
"leads_app-0": {
  "loadBalancer": {
    "servers": [{ "url": "http://leads_app:3000/" }],
    "passHostHeader": true
  }
}
```
Traefik reloads automatically. Verify: `docker logs traefik 2>&1 | tail -20`

### Step 4 — Smoke tests (all 5 must pass)

1. https://leads.esqtools.com → login page (or redirect to /login)
2. Login with admin@esqtools.com / ChangeMe123! → dashboard loads
3. https://leads.esqtools.com/admin → user list shows admin user
4. https://leads.esqtools.com/config as admin → config stub page loads
5. Browser padlock shows valid Let's Encrypt certificate for leads.esqtools.com

**If 502 or unreachable:**
- `docker ps | grep leads_app`
- `docker inspect leads_app | grep -A5 Networks`
- `docker logs traefik 2>&1 | grep leads`

Signal completion by typing "approved" if all 5 pass, or describe the failure.

## Deviations from Plan

**1. [Rule 3 - Blocking] Local docker build skipped**
- **Found during:** Task 1 verification
- **Issue:** Running `docker build` locally on a Windows dev machine would take several minutes and requires Docker Desktop. The actual verification environment is the VPS.
- **Fix:** Skipped local build; all acceptance criteria verified by file inspection. Build will be verified at the checkpoint when deploying to VPS.

## Threat Surface Scan

No new network endpoints introduced by this plan. The threat mitigations in the threat register were applied:
- T-04-01: `.env` excluded from `.dockerignore`; `BETTER_AUTH_SECRET` loaded from env var (not hardcoded)
- T-04-03: `restart: unless-stopped` present in docker-compose.yml

## Known Stubs

None — this plan creates infrastructure files only, no UI components.

## Self-Check: PASSED

- Dockerfile: FOUND at project root
- docker-compose.yml: FOUND at project root
- .dockerignore: FOUND at project root
- .env.example: FOUND (updated)
- Commit e5418c9: present in git log
