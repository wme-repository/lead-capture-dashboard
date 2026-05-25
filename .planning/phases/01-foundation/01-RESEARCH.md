# Phase 1: Foundation - Research

**Researched:** 2026-05-24
**Domain:** Next.js App Router + better-auth + Prisma/SQLite + Easypanel/Traefik VPS deploy
**Confidence:** HIGH

---

## Summary

Phase 1 builds the deployable shell of the Lead Capture Dashboard: a Next.js 15 App Router application with multi-user authentication (admin + read-only roles), persisted in SQLite via Prisma, running on the existing VPS behind the Easypanel-managed Traefik instance.

The most important infrastructure finding: **Traefik on this VPS is file-configured, not label-configured.** New services must be added manually as router + service entries in `/etc/easypanel/traefik/config/main.yaml` on the host. Docker Compose labels are irrelevant and will be silently ignored. This is the single biggest operational pitfall for this phase.

For authentication, `better-auth` v1.6.11 is the right choice: it has a first-class Prisma adapter, a built-in Admin plugin that handles user creation and banning (the deactivation mechanism), and clean Next.js App Router integration. No need for NextAuth v5/Auth.js, Lucia, or custom JWT.

**Primary recommendation:** Scaffold the app with `create-next-app`, install better-auth + prisma + better-sqlite3, run `npx @better-auth/cli generate` to get the schema, deploy as a Docker container in Easypanel, and add routing entries to main.yaml manually.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Login form + redirect | Browser / Client | Frontend Server (SSR) | Form runs client-side, redirect after auth is server action |
| Session validation | API / Backend | Frontend Server (SSR) | better-auth validates via `auth.api.getSession()` in Server Components and middleware |
| Route protection (redirect unauthenticated) | Frontend Server (middleware) | — | Middleware runs at edge, checks session cookie presence |
| Role enforcement (admin vs user) | API / Backend | Frontend Server (layout) | Roles must be enforced at the data access layer, not just UI |
| User CRUD (admin creates/bans users) | API / Backend | — | Server Actions calling `auth.api.*` with admin session |
| SQLite persistence | Database / Storage | — | Prisma ORM, single container, named volume |
| TLS termination + routing | CDN / Static (Traefik) | — | Traefik at edge, file-based config on this VPS |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Login with email + password | better-auth `emailAndPassword: { enabled: true }` + `signIn.email()` client |
| AUTH-02 | Admin can create/deactivate users | better-auth Admin plugin: `auth.api.createUser`, `auth.api.banUser` |
| AUTH-03 | Non-admin users are read-only, cannot access config | Role stored in `user.role`; middleware redirects non-admin away from `/config` prefix |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | Fullstack framework (App Router) | Project decision; includes API routes for webhooks |
| better-auth | 1.6.11 | Auth + user management | Prisma adapter, Admin plugin, Next.js helpers built-in |
| prisma | 7.8.0 | ORM + migrations | Type-safe queries, SQLite support, CLI schema generation |
| @prisma/client | 7.8.0 | Runtime DB client | Paired with prisma |
| better-sqlite3 | latest | better-auth direct SQLite driver | Required by better-auth for SQLite mode |

> Versions verified via `npm view` on 2026-05-24. [VERIFIED: npm registry]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @better-auth/cli | latest | Generate Prisma schema from auth config | Run once during setup: `npx @better-auth/cli generate` |
| bcryptjs | latest | Password hashing (bundled by better-auth, but may need separate install) | If better-auth doesn't bundle it |
| zod | latest | Input validation for Server Actions | Validating admin forms |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-auth | NextAuth v5 (Auth.js) | Auth.js is more mature but has worse Prisma integration and no built-in admin user management; requires more custom code for role CRUD |
| better-auth | Lucia | Lucia v3 is lower-level, more code to write, no admin plugin |
| SQLite | PostgreSQL | No advantage for single-server, single-container deployment; SQLite is simpler here |

**Installation:**
```bash
npm install better-auth prisma @prisma/client better-sqlite3
npm install -D @types/better-sqlite3
npx prisma init --datasource-provider sqlite
npx @better-auth/cli generate
```

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ▼
Traefik (file-based, /etc/easypanel/traefik/config/main.yaml)
  │  Host: leads.esqtools.com → http://leads_app:3000/
  ▼
Next.js App (Docker container, port 3000)
  │
  ├── middleware.ts
  │     checks session cookie → redirects / (unauthenticated)
  │     checks role in session → redirects / (non-admin to /config)
  │
  ├── app/(auth)/login/page.tsx
  │     client form → authClient.signIn.email()
  │
  ├── app/(dashboard)/layout.tsx
  │     Server Component: auth.api.getSession(headers)
  │     passes user to children
  │
  ├── app/(dashboard)/page.tsx        ← read-only dashboard (all roles)
  ├── app/(dashboard)/config/page.tsx ← admin-only config stub
  ├── app/(dashboard)/admin/page.tsx  ← admin user management
  │
  ├── app/api/auth/[...all]/route.ts  ← better-auth handler
  │
  └── lib/
        auth.ts           ← betterAuth({...}) with admin plugin
        auth-client.ts    ← createAuthClient()
        prisma.ts         ← PrismaClient singleton
        └── db/
              dev.db        ← SQLite file (bind-mounted named volume)
```

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx       # Login form
│   ├── (dashboard)/
│   │   ├── layout.tsx         # Session guard + nav
│   │   ├── page.tsx           # Dashboard stub (Phase 5 fills this)
│   │   ├── config/
│   │   │   └── page.tsx       # Admin-only config stub
│   │   └── admin/
│   │       └── page.tsx       # User management (create/ban)
│   └── api/
│       └── auth/
│           └── [...all]/
│               └── route.ts   # better-auth handler
├── lib/
│   ├── auth.ts                # betterAuth server config
│   ├── auth-client.ts         # createAuthClient
│   └── prisma.ts              # PrismaClient singleton
├── middleware.ts               # Route protection
└── prisma/
    └── schema.prisma          # Generated by @better-auth/cli
```

### Pattern 1: better-auth Server Setup

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  plugins: [
    admin(),       // Adds createUser, banUser, listUsers, etc.
    nextCookies(), // Enables cookie-setting in Server Actions
  ],
});
```
[CITED: https://better-auth.com/docs/integrations/next]

### Pattern 2: better-auth Next.js Route Handler

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```
[CITED: https://better-auth.com/docs/integrations/next]

### Pattern 3: Session Check in Server Component

```typescript
// src/app/(dashboard)/layout.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <>{children}</>;
}
```
[CITED: https://better-auth.com/docs/integrations/next]

### Pattern 4: Middleware for Route Protection

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|login|_next).*)"],
};
```

**Note on CVE-2025-29927:** Never rely on middleware alone for auth. Always verify session in Server Components and Server Actions. Middleware is for UX redirection only. [CITED: https://workos.com/blog/nextjs-app-router-authentication-guide-2026]

### Pattern 5: Admin User Creation via Server Action

```typescript
// Server Action — admin creates a user
"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function createUserAction(email: string, name: string, role: "admin" | "user") {
  // auth.api.createUser requires a valid admin session
  await auth.api.createUser({
    body: { email, name, password: "TempPassword123!", role },
    headers: await headers(),
  });
}
```
[CITED: https://better-auth.com/docs/plugins/admin]

### Pattern 6: Ban/Deactivate User

```typescript
// deactivate == permanent ban with no expiry
await auth.api.banUser({
  body: { userId: "user-id", banReason: "Deactivated by admin" },
  headers: await headers(),
});
```
[CITED: https://better-auth.com/docs/plugins/admin]

### Pattern 7: Traefik File Entry for New Service

Add these two router entries and one service entry to `/etc/easypanel/traefik/config/main.yaml` on the VPS host. Traefik auto-reloads (no restart needed).

```json
"routers": {
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
},
"services": {
  "leads_app-0": {
    "loadBalancer": {
      "servers": [{ "url": "http://leads_app:3000/" }],
      "passHostHeader": true
    }
  }
}
```

[VERIFIED: /c/Users/wagne/Documents/Claude Code/Hostinger-VPS/traefik/config/main.yaml — all existing services follow this exact pattern]

### Anti-Patterns to Avoid

- **Docker Compose labels for Traefik routing:** This VPS uses Easypanel file-based Traefik config. Labels on the container are read by Easypanel's own provider, not the standard Docker provider. Adding Traefik labels to docker-compose.yml will have no effect.
- **Relying on middleware alone for auth:** CVE-2025-29927 — always double-check in Server Components and Server Actions.
- **Role checks only in UI:** Admin-only features must also enforce role server-side in Server Actions, not just hide buttons.
- **`prisma migrate dev` in Docker entrypoint:** Use `prisma migrate deploy` (non-interactive) for production containers.
- **Sharing SQLite file across containers:** Only one container should write to the db file. [CITED: https://oneuptime.com/blog/post/2026-02-08-how-to-run-sqlite-in-docker-when-and-how/view]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session tokens + cookie management | Custom JWT + cookie logic | better-auth (built-in) | Edge cases in cookie rotation, CSRF, httpOnly flags |
| Password hashing | Custom bcrypt wrapper | better-auth (built-in) | Salt rounds, timing attacks |
| Admin user CRUD API | Custom REST endpoints for create/ban | better-auth Admin plugin | Already handles `createUser`, `banUser`, `listUsers`, session revocation |
| Role storage + retrieval | Custom `roles` table | better-auth `user.role` field (Admin plugin adds it) | Integrated with session cookie; no extra query needed |
| DB migrations in Docker | Custom SQL runner in entrypoint | `prisma migrate deploy` | Handles idempotent migrations, tracking |

---

## Common Pitfalls

### Pitfall 1: Traefik Labels Silently Ignored

**What goes wrong:** Developer adds `traefik.*` labels to `docker-compose.yml`. App deploys but is unreachable on `leads.esqtools.com`. No error, no log.
**Why it happens:** Easypanel uses the file provider for Traefik config, not the Docker provider. Labels are never read.
**How to avoid:** ALWAYS add routing entries to `/etc/easypanel/traefik/config/main.yaml` on the host manually. Follow the exact JSON structure of existing entries.
**Warning signs:** Container runs on port 3000 locally but domain returns 404 or Easypanel error page.

### Pitfall 2: `prisma migrate dev` Fails in Docker

**What goes wrong:** Entrypoint runs `prisma migrate dev`, Docker hangs waiting for interactive input.
**Why it happens:** `migrate dev` requires a TTY and interactive confirmation.
**How to avoid:** Use `prisma migrate deploy` in production/Docker entrypoints. Reserve `migrate dev` for local development only.
**Warning signs:** Container starts then exits without error.

### Pitfall 3: SQLite Lock Under Write Concurrency

**What goes wrong:** Webhook endpoint (Phase 2) causes `SQLITE_BUSY` errors under concurrent requests.
**Why it happens:** Default journal mode is rollback, which serializes writes aggressively.
**How to avoid:** Enable WAL mode via a Prisma migration or startup pragma: `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;`. In Prisma, add this to `datasource.url`: `?mode=rwc&_journal_mode=WAL`.
**Warning signs:** Intermittent 500 errors on simultaneous requests; db.wal file not appearing.

### Pitfall 4: Admin Plugin Requires Admin Session Cookie

**What goes wrong:** Server Action calls `auth.api.banUser` and gets a 401 UNAUTHORIZED.
**Why it happens:** The Admin plugin validates the caller is actually an admin using the session in the request headers/cookies.
**How to avoid:** Always pass `headers: await headers()` when calling Admin plugin methods server-side.
**Warning signs:** `UNAUTHORIZED` error with status 401 on admin API calls.

### Pitfall 5: Next.js 15 `headers()` is Async

**What goes wrong:** Code calls `headers()` without `await` and gets a Promise object instead of headers.
**Why it happens:** Next.js 15 made `headers()`, `cookies()`, and `params` async.
**How to avoid:** Always `await headers()` before passing to `auth.api.getSession`.
**Warning signs:** TypeScript errors or runtime crash: "Cannot read properties of Promise".

### Pitfall 5: better-auth `nextCookies()` Plugin is Required for Server Actions

**What goes wrong:** Login Server Action completes without error but user session is not established (browser stays on login page).
**Why it happens:** Without `nextCookies()` plugin, better-auth cannot set cookies during Server Action execution.
**How to avoid:** Add `nextCookies()` to the plugins array in `auth.ts`.
**Warning signs:** `signIn.email()` resolves successfully but no `better-auth.session_token` cookie appears in DevTools.

---

## Prisma Schema (better-auth generated)

The `@better-auth/cli generate` command produces this base schema (Admin plugin adds `role`, `banned`, `banReason`, `banExpires`):

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  role          String?   // "admin" | "user" — added by admin plugin
  banned        Boolean?  // added by admin plugin
  banReason     String?   // added by admin plugin
  banExpires    DateTime? // added by admin plugin

  sessions      Session[]
  accounts      Account[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  expiresAt             DateTime?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

[CITED: https://deepwiki.com/codinginflow/better-auth-tutorial/7.1-database-schema-design + https://better-auth.com/docs/adapters/prisma]

**Later phases schema extension:** `Source`, `Lead`, `SyncLog` tables plug into this schema by adding a `sourceId` field. The `User` table needs no changes for Phase 2–5.

---

## Docker Setup for Easypanel

The app will be deployed as a Docker container in Easypanel. Key choices:

1. **Network:** Container must be on the same Docker network as Traefik (`easypanel` network or whatever network Easypanel uses). Easypanel manages this automatically when you deploy through its UI.
2. **Container name:** Easypanel names containers as `{project}_{service}`. If the project is named `leads` and the service `app`, the container resolves as `leads_app` inside the Docker network — matching the Traefik service URL `http://leads_app:3000/`.
3. **Volume for SQLite:** Mount a named volume to `/app/prisma/` (or wherever `DATABASE_URL` points) so data survives container restarts.
4. **Environment variables:** `DATABASE_URL`, `BETTER_AUTH_SECRET` (random 32+ char string), `BETTER_AUTH_URL` (https://leads.esqtools.com).

**Dockerfile pattern:**
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000

# Run migrations before start
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

**Note:** Next.js standalone output (`output: 'standalone'` in next.config.ts) is required for the slim Docker image pattern.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Container deploy | ✓ | Running on VPS | — |
| Traefik (Easypanel) | HTTPS routing | ✓ | Active, file-based config | — |
| leads.esqtools.com DNS | Public access | ✓ [ASSUMED] | A record created per brief | — |
| Node.js (local dev) | Build/test | ✓ | 22.x [ASSUMED] | — |
| Let's Encrypt via Traefik | TLS cert | ✓ | Used by all existing services | — |

**Missing dependencies with no fallback:** None identified.

[VERIFIED: VPS Traefik config and existing services — /c/Users/wagne/Documents/Claude Code/Hostinger-VPS/traefik/config/main.yaml]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth v4 | better-auth v1 or Auth.js v5 | 2024-2025 | better-auth has cleaner Prisma integration and admin plugin |
| `headers()` sync | `await headers()` (async) | Next.js 15 | Forgetting await causes silent bugs |
| Middleware-only auth | Layered auth (middleware + server component + action) | CVE-2025-29927 (March 2025) | Single-layer middleware auth is exploitable |
| `prisma migrate dev` in prod | `prisma migrate deploy` | Always | `migrate dev` requires TTY |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DNS A record for `leads.esqtools.com` already points to 69.62.89.206 | Environment Availability | Phase 4 (accessible via domain) will fail until corrected |
| A2 | Node.js 22.x available locally for development | Environment Availability | Dev environment setup; minor |
| A3 | Easypanel project/service naming results in container name `leads_app` (matches Traefik service URL) | Traefik Pattern | Wrong name means 502 error; must verify at deploy time |
| A4 | better-auth `nextCookies()` plugin is required for Server Actions cookie-setting in Next.js 15 | Pattern 6 | Login via Server Action won't persist session |

---

## Open Questions

1. **Easypanel container naming convention**
   - What we know: Existing containers follow `{project}_{service}` pattern (e.g., `esqtools_n8n`)
   - What's unclear: If the Easypanel project is named `leads` and service `app`, container resolves as `leads_app` — needs confirmation at deploy time before writing Traefik config
   - Recommendation: Create the Easypanel project first, note the container name Easypanel assigns, then add Traefik entry.

2. **Initial admin user seeding**
   - What we know: better-auth doesn't seed a default admin
   - What's unclear: How the first admin account gets created — a seed script is needed
   - Recommendation: Add a `prisma/seed.ts` that creates the first admin user; run via `prisma db seed` during setup.

---

## Validation Architecture

No automated test infrastructure exists yet (greenfield project).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| AUTH-01 | Login with valid credentials succeeds | Manual smoke | Automated e2e (Playwright) deferred to later |
| AUTH-01 | Login with wrong password returns error | Manual smoke | — |
| AUTH-02 | Admin creates a new user account | Manual smoke | — |
| AUTH-02 | Admin deactivates (bans) a user | Manual smoke | — |
| AUTH-03 | Non-admin user cannot access `/config` | Manual smoke | Verify redirect happens |
| AUTH-03 | Admin can access `/config` | Manual smoke | — |
| Infra | `https://leads.esqtools.com` resolves with valid TLS | Manual smoke | Check cert, 200 response |

### Wave 0 Gaps

- [ ] No test framework configured — for Phase 1 all validation is manual smoke testing per the success criteria
- [ ] A seed script (`prisma/seed.ts`) is needed before any smoke test is possible

*(Automated testing infrastructure to be added when Phase 5 analytics are built and the app structure stabilizes.)*

---

## Sources

### Primary (HIGH confidence)
- [Better Auth Next.js Integration](https://better-auth.com/docs/integrations/next) — route handler, session, middleware patterns
- [Better Auth Admin Plugin](https://better-auth.com/docs/plugins/admin) — createUser, banUser, roles
- [Better Auth Installation](https://better-auth.com/docs/installation) — Prisma adapter setup
- [VPS Traefik config file](file:///c/Users/wagne/Documents/Claude%20Code/Hostinger-VPS/traefik/config/main.yaml) — verified file-based config, all existing service patterns
- `npm view` — verified package versions 2026-05-24

### Secondary (MEDIUM confidence)
- [Prisma + Better Auth + Next.js (Prisma Docs)](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs) — schema and integration walkthrough
- [better-auth Tutorial DB Schema Design](https://deepwiki.com/codinginflow/better-auth-tutorial/7.1-database-schema-design) — Prisma model fields including admin plugin extensions
- [WorkOS — Next.js App Router Auth Guide 2026](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) — CVE-2025-29927 + layered auth pattern
- [SQLite in Docker](https://oneuptime.com/blog/post/2026-02-08-how-to-run-sqlite-in-docker-when-and-how/view) — single-container guidance
- [Prisma SQLite WAL pitfalls](https://github.com/prisma/prisma/issues/3303) — concurrency configuration

### Tertiary (LOW confidence)
- None — all critical claims verified via primary or secondary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm view; better-auth docs fetched directly
- Architecture: HIGH — Traefik config verified from local file copy; better-auth patterns from official docs
- Pitfalls: HIGH — Traefik pitfall verified from actual VPS config; CVE from official sources; SQLite/Prisma from official issue trackers

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (better-auth moves fast; verify admin plugin API if >30 days)
