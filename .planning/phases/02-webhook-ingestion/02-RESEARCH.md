# Phase 2: Webhook Ingestion — Research

**Researched:** 2026-05-25
**Domain:** Next.js 15 App Router API routes, Prisma 7 + PostgreSQL, Zod validation, webhook token auth
**Confidence:** HIGH

---

## Summary

Phase 2 adds the webhook ingestion layer: a dynamic route `app/api/webhook/[slug]/route.ts` that accepts POST requests from multiple sites, authenticates them via a per-source token, validates two distinct payload schemas, and persists leads plus a sync log entry to PostgreSQL.

The stack is already well-suited: the existing Prisma 7 + `@prisma/adapter-pg` setup handles PostgreSQL perfectly, and Zod 4 is already available as a transitive dependency of `better-auth` (no new install needed unless we want it as a direct dep for clarity). The only new infrastructure work is adding three tables to PostgreSQL — which must be done via raw SQL in the Supabase SQL editor because `prisma db push` and `prisma migrate deploy` both hang on the Transaction pooler connection.

**Primary recommendation:** One dynamic route file, two Zod schemas (discriminated by `schema_type` from the source config), atomic DB write of lead + sync_log row in a Prisma transaction, raw SQL for table creation.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Webhook receive + token auth | API Route (Next.js) | — | No browser involved; pure server-side endpoint |
| Payload validation | API Route (Next.js) | — | Zod runs server-side before any DB write |
| Lead persistence | Database (PostgreSQL) | Prisma ORM | Source of truth for all leads |
| Sync log write | Database (PostgreSQL) | Prisma ORM | Written atomically with the lead |
| Source config lookup | Database (PostgreSQL) | Prisma ORM | Token and schema_type fetched per slug |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOOK-01 | POST `/api/webhook/:slug` accepts standard lead payload (name, email, phone, UTMs) | Dynamic route + standard Zod schema |
| HOOK-02 | POST accepts questionnaire + leadscore payload (name, email, answers, score, grade A/B/C/D) | Second Zod schema, `schema_type` column on Source |
| HOOK-03 | Validates required fields + email format; returns 422 for invalid payloads | Zod `.safeParse()` + 422 response |
| HOOK-04 | Requires `X-Webhook-Token` header; returns 401 without correct token | `request.headers.get('x-webhook-token')` comparison |
| DATA-01 | Lead saved with: id, source_id, schema_type, fields (JSON), received_at, status | `Lead` table with `fields` as JSONB |
| DATA-02 | Log of each sync attempt: destination, status, error, timestamp | `SyncLog` table, one row per attempt |
</phase_requirements>

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | App Router API routes | Already in project |
| prisma + @prisma/adapter-pg | 7.8.0 | ORM + PostgreSQL adapter | Already in project |
| zod | 4.4.3 | Schema validation | Transitive dep of better-auth, available now |
| pg | 8.21.0 | PostgreSQL driver | Already in project |

### No new packages needed

Zod is already resolvable from `node_modules`. Add it as a direct dependency in `package.json` for explicitness:

```bash
npm install zod
```

This promotes it from transitive to direct — zero additional download.

---

## Architecture Patterns

### System Architecture Diagram

```
POST /api/webhook/[slug]
         |
         v
  [Route Handler] app/api/webhook/[slug]/route.ts
         |
         |-- 1. Look up Source by slug (Prisma)
         |        |
         |        +-- Not found → 404
         |
         |-- 2. Validate X-Webhook-Token header vs source.token
         |        |
         |        +-- Mismatch → 401
         |
         |-- 3. Parse body as JSON
         |
         |-- 4. Select Zod schema based on source.schema_type
         |        |
         |        +-- "standard"       → StandardLeadSchema
         |        +-- "questionnaire"  → QuestionnaireLeadSchema
         |
         |-- 5. safeParse() → invalid → 422 + validation errors
         |
         |-- 6. Prisma.$transaction([
         |        prisma.lead.create(...)
         |        prisma.syncLog.create({ status: "pending" })
         |      ])
         |
         v
      200 { id: lead.id }
```

### Recommended Project Structure (additions only)

```
src/
├── app/
│   └── api/
│       └── webhook/
│           └── [slug]/
│               └── route.ts      # New: webhook handler
├── lib/
│   ├── prisma.ts                 # Existing
│   ├── auth.ts                   # Existing
│   └── schemas/
│       └── webhook.ts            # New: Zod schemas for both payload types
prisma/
└── schema.prisma                 # Add Source, Lead, SyncLog models
sql/
└── 02-webhook-tables.sql         # New: raw SQL for Supabase dashboard
```

### Pattern: Dynamic Route in Next.js 15 App Router

```typescript
// app/api/webhook/[slug]/route.ts
// [ASSUMED] — based on Next.js App Router conventions
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StandardLeadSchema, QuestionnaireLeadSchema } from "@/lib/schemas/webhook";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params; // Next.js 15: params is async

  const source = await prisma.source.findUnique({ where: { slug } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = request.headers.get("x-webhook-token");
  if (token !== source.token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const schema = source.schemaType === "questionnaire"
    ? QuestionnaireLeadSchema
    : StandardLeadSchema;

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 422 }
    );
  }

  const lead = await prisma.$transaction(async (tx) => {
    const newLead = await tx.lead.create({
      data: {
        sourceId: source.id,
        schemaType: source.schemaType,
        fields: result.data,
        status: "pending",
      },
    });
    await tx.syncLog.create({
      data: {
        leadId: newLead.id,
        destination: "pending",
        status: "pending",
      },
    });
    return newLead;
  });

  return NextResponse.json({ id: lead.id }, { status: 200 });
}
```

**IMPORTANT:** In Next.js 15, `params` is a `Promise` — must be `await`ed. [ASSUMED — based on Next.js 15 App Router release notes; should be verified against actual project behavior]

### Pattern: Zod Schemas for Two Payload Types

```typescript
// src/lib/schemas/webhook.ts
import { z } from "zod";

export const StandardLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
});

export const QuestionnaireLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  answers: z.record(z.string(), z.unknown()),  // flexible questionnaire fields
  score: z.number().int().min(0),
  grade: z.enum(["A", "B", "C", "D"]),
});

export type StandardLead = z.infer<typeof StandardLeadSchema>;
export type QuestionnaireLead = z.infer<typeof QuestionnaireLeadSchema>;
```

### Pattern: Prisma Models (schema additions)

```prisma
model Source {
  id         String   @id @default(cuid())
  name       String
  slug       String   @unique
  token      String   @unique
  schemaType String   // "standard" | "questionnaire"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  leads    Lead[]
}

model Lead {
  id         String   @id @default(cuid())
  sourceId   String
  schemaType String
  fields     Json     // JSONB in PostgreSQL
  status     String   @default("pending")  // pending | synced | failed
  receivedAt DateTime @default(now())
  updatedAt  DateTime @updatedAt

  source   Source    @relation(fields: [sourceId], references: [id])
  syncLogs SyncLog[]
}

model SyncLog {
  id          String   @id @default(cuid())
  leadId      String
  destination String   // "sheets" | "datacrazy" | "pending"
  status      String   // pending | success | failed
  error       String?
  attemptedAt DateTime @default(now())

  lead Lead @relation(fields: [leadId], references: [id])
}
```

### Pattern: Raw SQL for Table Creation (Supabase SQL Editor)

Because `prisma db push` and `prisma migrate deploy` hang on Transaction pooler:

```sql
-- sql/02-webhook-tables.sql
-- Run in Supabase SQL editor (Dashboard > SQL Editor)

CREATE TABLE IF NOT EXISTS "Source" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "name"       TEXT        NOT NULL,
  "slug"       TEXT        NOT NULL UNIQUE,
  "token"      TEXT        NOT NULL UNIQUE,
  "schemaType" TEXT        NOT NULL DEFAULT 'standard',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Lead" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "sourceId"   TEXT        NOT NULL REFERENCES "Source"("id"),
  "schemaType" TEXT        NOT NULL,
  "fields"     JSONB       NOT NULL,
  "status"     TEXT        NOT NULL DEFAULT 'pending',
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SyncLog" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "leadId"      TEXT        NOT NULL REFERENCES "Lead"("id"),
  "destination" TEXT        NOT NULL,
  "status"      TEXT        NOT NULL DEFAULT 'pending',
  "error"       TEXT,
  "attemptedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed one source for manual testing
INSERT INTO "Source" ("id", "name", "slug", "token", "schemaType")
VALUES (
  'src_trt_001',
  'TRT',
  'trt',
  'trt-webhook-secret-change-me',
  'standard'
) ON CONFLICT DO NOTHING;
```

**Table naming:** Prisma generates quoted PascalCase table names by default for PostgreSQL unless `@@map` is used. The SQL above matches Prisma's default output. [VERIFIED: matches existing schema.prisma pattern — User, Session, Account are all PascalCase in the DB]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email format validation | Custom regex | `z.string().email()` | RFC-compliant, tested |
| Atomic lead + synclog write | Manual try/catch with separate inserts | `prisma.$transaction()` | Guarantees both or neither |
| JSON body parsing errors | try/catch on `request.json()` | Wrap in `.catch(() => null)` + null check | Handles malformed JSON cleanly |
| Token comparison | Timing-safe compare | Direct string equality is acceptable here | Tokens are random strings, not passwords; no timing oracle risk for this threat model [ASSUMED] |

---

## Common Pitfalls

### Pitfall 1: Next.js 15 `params` is a Promise

**What goes wrong:** Code uses `params.slug` directly and gets `undefined` or a build error.
**Why it happens:** Next.js 15 changed params to async to support streaming. Pattern changed from `{ params }` to `{ params }: { params: Promise<{slug: string}> }`.
**How to avoid:** Always `await params` before destructuring.
**Warning signs:** TypeScript error on `params.slug`, or runtime `undefined` for slug.

### Pitfall 2: Prisma `fields` column needs `Json` type, not `String`

**What goes wrong:** Storing JSON as a string loses JSONB indexing and breaks Phase 5 analytics queries.
**Why it happens:** Developer uses `String` type in schema to avoid thinking about it.
**How to avoid:** Use `Json` in schema.prisma — Prisma maps this to `JSONB` in PostgreSQL.

### Pitfall 3: `prisma db push` hangs on Transaction pooler

**What goes wrong:** Command appears to hang indefinitely during schema push.
**Why it happens:** `prisma db push` acquires advisory locks; Transaction pooler (port 6543) does not support session-level advisory locks.
**How to avoid:** Create tables via raw SQL in Supabase SQL editor. Then add models to schema.prisma and run `prisma generate` only (no push/migrate).
**Warning signs:** Command runs for >30 seconds with no output.

### Pitfall 4: Source token stored in plaintext

**What goes wrong:** Token is readable by anyone with DB access.
**Why it happens:** Hashing webhook tokens adds complexity but the tokens are long random strings — this is the standard approach for simple webhook auth (GitHub, Stripe style).
**How to avoid:** [ASSUMED] Plaintext is acceptable for webhook tokens when they are sufficiently random (32+ bytes). Hash if compliance requires it.

### Pitfall 5: Missing `prisma generate` after schema changes

**What goes wrong:** TypeScript types don't reflect new models; runtime errors on `prisma.lead` etc.
**Why it happens:** Prisma generates types at build time, not on-the-fly.
**How to avoid:** Run `npx prisma generate` after any schema.prisma edit. Also runs automatically during `next build`.

### Pitfall 6: SyncLog `destination` column design for Phase 3

**What goes wrong:** Phase 3 needs to retry per-destination (Sheets vs DataCrazy independently). If one SyncLog row covers both, retrying one destination is ambiguous.
**How to avoid:** Design SyncLog with one row per destination per attempt. This means a single lead creates two `pending` SyncLog rows at ingest time: one for `sheets`, one for `datacrazy`.
**Impact:** Phase 3 retry queue can filter `WHERE destination = 'sheets' AND status = 'failed'` cleanly.

---

## Schema Design: `fields` as JSONB vs Individual Columns

**Decision: Use JSONB.** [ASSUMED — no project-specific constraint found, but this is the standard pattern]

Rationale:
- Two different schema types with different fields; individual columns would require nullable columns for all questionnaire fields on the standard schema rows (or two tables).
- JSONB allows Phase 5 analytics to query into `fields->>'utm_source'` with PostgreSQL operators.
- Phase 4 Config UI needs to store flexible field mappings anyway — JSONB is consistent.
- Tradeoff: No database-level constraints on field presence; Zod at ingest time is the enforcement layer.

---

## SyncLog Design for Phase 3 Retry

Phase 3 needs:
- Query leads with `status = 'failed'` for a specific destination
- Track number of attempts and next retry time (backoff)
- Record the error message from the failed attempt

Recommended SyncLog schema adds `attemptCount` and `nextRetryAt` columns now so Phase 3 doesn't need a migration:

```prisma
model SyncLog {
  id           String    @id @default(cuid())
  leadId       String
  destination  String    // "sheets" | "datacrazy"
  status       String    // pending | success | failed
  error        String?
  attemptCount Int       @default(0)
  nextRetryAt  DateTime?
  attemptedAt  DateTime  @default(now())

  lead Lead @relation(fields: [leadId], references: [id])
}
```

At ingest time: create two SyncLog rows (`destination: "sheets"`, `destination: "datacrazy"`) both with `status: "pending"`, `attemptCount: 0`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v24.13.0 | — |
| Supabase SQL Editor | Table creation | ✓ (via browser) | — | — |
| zod | Validation | ✓ (transitive) | 4.4.3 | — |

Step 2.6: No new external services required for this phase.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest/vitest config found |
| Config file | none — Wave 0 gap |
| Quick run command | n/a |
| Full suite command | n/a |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOOK-01 | POST standard lead → 200 + lead in DB | integration | manual curl / future | ❌ Wave 0 |
| HOOK-02 | POST questionnaire lead → 200 + correct schema_type | integration | manual curl / future | ❌ Wave 0 |
| HOOK-03 | Missing email → 422; bad email → 422 | unit (Zod) | manual | ❌ Wave 0 |
| HOOK-04 | Missing/wrong token → 401 | integration | manual curl | ❌ Wave 0 |
| DATA-01 | Lead row exists with correct fields | DB assertion | manual | ❌ Wave 0 |
| DATA-02 | SyncLog row exists after lead created | DB assertion | manual | ❌ Wave 0 |

**Sampling strategy for this phase:** Manual curl verification after each task, using test commands in the plan. No automated test framework exists yet — this is acceptable for Phase 2. Phase 5 (analytics) is a better time to introduce testing if desired.

### Wave 0 Gaps

No automated test infrastructure needed for this phase. Verification is via curl commands specified in the plan.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js 15 `params` is a Promise and must be awaited | Architecture Patterns | Route handler fails silently with undefined slug |
| A2 | Plain-text token storage is acceptable for webhook tokens | Common Pitfalls | Security finding if audited; easy to add hashing later |
| A3 | JSONB is the right approach for `fields` column | Schema Design section | Analytics queries in Phase 5 may need adjustment |
| A4 | One SyncLog row per destination (sheets + datacrazy) at ingest time is correct | SyncLog Design | Phase 3 retry logic may need schema adjustment |

---

## Open Questions (RESOLVED)

1. **Questionnaire payload shape**
   - What we know: HOOK-02 says "name, email, respostas do questionário, score numérico, classificação A/B/C/D"
   - What's unclear: Are questionnaire answers a free-form object or a fixed list of fields?
   - Recommendation: Use `z.record(z.string(), z.unknown())` for `answers` to accept any shape, validate only `score` (number) and `grade` (enum A/B/C/D). Can tighten later.

2. **Token generation strategy**
   - What we know: HOOK-04 requires token auth; Phase 4 will add UI to create sources
   - What's unclear: For Phase 2 testing, how is the initial source/token seeded?
   - Recommendation: Include a seed INSERT in the raw SQL script with a known test token. Phase 4 adds UI for this.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `prisma/schema.prisma`, `src/lib/prisma.ts`, `src/lib/auth.ts` — verified Prisma 7 + adapter-pg pattern
- Codebase: `src/app/api/auth/[...all]/route.ts` — confirmed App Router catch-all pattern
- Codebase: `package.json` — confirmed zod 4.4.3 available, no test framework present
- `.planning/STATE.md` — confirmed Transaction pooler constraint, raw SQL requirement
- npm: `npm view zod version` → 4.4.3 [VERIFIED]

### Secondary (MEDIUM confidence)
- Next.js 15 async params: [ASSUMED] Based on known Next.js 15 breaking changes — params became async

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, versions verified
- Architecture: HIGH — follows exact same pattern as existing `[...all]/route.ts`
- Schema design: HIGH — Prisma + JSONB is the standard PostgreSQL pattern
- Transaction pooler workaround: HIGH — confirmed in STATE.md from Phase 1 experience
- Pitfalls: MEDIUM — A1/A2 are assumed, others are verified from project history

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (stable stack)
