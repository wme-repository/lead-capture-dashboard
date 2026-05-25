---
phase: 03-integrations
plan: "01"
type: summary
status: complete
completed_at: 2026-05-25
---

# Phase 03-01 Summary — Schema: Source Integration Fields + Lead Columns

## What was done

### Source table — integration config columns
Four nullable columns added to the `Source` model to support downstream integrations (Google Sheets, DataCrazy):

| Column | Type | Purpose |
|--------|------|---------|
| `sheetsId` | `String?` / `TEXT` | Google Sheets spreadsheet ID |
| `sheetTab` | `String?` / `TEXT` | Target sheet tab name |
| `dataCrazyUrl` | `String?` / `TEXT` | DataCrazy webhook/API URL |
| `fieldMapping` | `Json?` / `JSONB` | Lead field → destination column mapping |

SQL executed in Supabase SQL Editor (no `prisma db push` — hangs on Transaction pooler):
```sql
ALTER TABLE "Source"
  ADD COLUMN IF NOT EXISTS "sheetsId"     TEXT,
  ADD COLUMN IF NOT EXISTS "sheetTab"     TEXT,
  ADD COLUMN IF NOT EXISTS "dataCrazyUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "fieldMapping" JSONB;
```

### Lead table — individual columns (replaces monolithic `fields` JSONB)
The `Lead.fields` blob was replaced with flat, queryable columns. SQL saved to `sql/03-lead-columns.sql` and executed:

```
name, email, phone, utmSource, utmMedium, utmCampaign, utmTerm, utmContent  — TEXT
score       — INTEGER
grade       — TEXT
answers     — JSONB
```

Existing rows migrated from `fields` JSONB → individual columns; `fields` column dropped.

### Prisma client
- `prisma/schema.prisma` — `Source` model updated with four new nullable fields; `Lead` model updated with individual columns
- `npx prisma generate` completed without errors
- Generated client at `src/generated/prisma` includes all new types

### Webhook route update
`src/app/api/webhook/[slug]/route.ts` updated to write to the new individual Lead columns instead of the monolithic `fields` JSONB blob.

## Artifacts

| Path | Description |
|------|-------------|
| `prisma/schema.prisma` | Source + Lead models with new columns |
| `sql/03-lead-columns.sql` | Raw SQL for Lead column expansion + data migration |
| `src/generated/prisma/` | Regenerated Prisma client |
| `src/app/api/webhook/[slug]/route.ts` | Updated to use flat Lead columns |

## Success criteria — all met

- [x] Source table has sheetsId, sheetTab, dataCrazyUrl, fieldMapping in Supabase
- [x] Lead table has individual columns (name, email, phone, utm*, score, grade, answers)
- [x] SQL executed successfully in Supabase SQL Editor
- [x] `npx prisma generate` completes without error
- [x] Generated Prisma client reflects all new fields
