---
phase: 01-foundation
plan: "03"
subsystem: auth-admin
tags: [admin, seed, server-actions, better-auth]
dependency_graph:
  requires: [01-01]
  provides: [admin-page, seed-script]
  affects: []
tech_stack:
  added: [tsx (seed runner)]
  patterns: [Server Actions with admin role guard, idempotent seed via signUpEmail + role promotion]
key_files:
  created:
    - prisma/seed.ts
    - prisma/tsconfig.seed.json
    - src/app/(dashboard)/admin/page.tsx
    - src/app/(dashboard)/admin/actions.ts
  modified:
    - package.json
    - prisma.config.ts
    - .env.example
decisions:
  - "Use signUpEmail + Prisma role update for seeding: auth.api.createUser requires an active admin session, which does not exist before first seed"
  - "tsx over ts-node for seed runner: simpler config, no tsconfig.seed.json needed at runtime"
metrics:
  duration: "15 min"
  completed: "2026-05-24"
  tasks: 2/2
  files: 4 created, 3 modified
---

# Phase 1 Plan 03: Admin User Management + Seed Script Summary

Admin user management page with create/deactivate actions and an idempotent seed script that bootstraps the first admin user via better-auth.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Seed script for initial admin user | 2afc563 | prisma/seed.ts, prisma/tsconfig.seed.json, package.json, prisma.config.ts, .env.example |
| 2 | Admin user management page and server actions | 6ffbe83 | src/app/(dashboard)/admin/page.tsx, src/app/(dashboard)/admin/actions.ts |

## Verification Results

- `npx prisma db seed` — "Admin user already exists: admin@esqtools.com — skipping seed." (idempotency confirmed)
- `npx tsc --noEmit` — exits 0, no TypeScript errors

## Acceptance Criteria

- [x] `npx prisma db seed` runs without error
- [x] Seed is idempotent (second run prints "already exists")
- [x] package.json has `"prisma": { "seed": "tsx prisma/seed.ts" }`
- [x] .env.example has SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME
- [x] actions.ts starts with `"use server"`
- [x] Both createUserAction and banUserAction verify `session.user.role !== "admin"`
- [x] banUserAction prevents admin from banning themselves
- [x] admin/page.tsx is a Server Component (no `"use client"`)
- [x] User list shows "Ativo" / "Desativado" status in Portuguese

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The temporary password `TempPassword123!` is intentional and documented in the UI — no self-service password reset in Phase 1 (per plan spec).

## Threat Surface Scan

No new network endpoints introduced. Admin actions are Server Actions (same-origin POST). Trust boundaries match the plan's threat model (T-03-01 through T-03-04 all mitigated).

## Self-Check: PASSED

- prisma/seed.ts: FOUND
- prisma/tsconfig.seed.json: FOUND
- src/app/(dashboard)/admin/actions.ts: FOUND
- src/app/(dashboard)/admin/page.tsx: FOUND
- Commit 2afc563: FOUND
- Commit 6ffbe83: FOUND
