-- sql/02-webhook-tables.sql
-- Run in Supabase SQL editor: Dashboard > SQL Editor > New query
-- DO NOT run prisma db push or prisma migrate deploy — they hang on Transaction pooler.

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
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "leadId"       TEXT        NOT NULL REFERENCES "Lead"("id"),
  "destination"  TEXT        NOT NULL,
  "status"       TEXT        NOT NULL DEFAULT 'pending',
  "error"        TEXT,
  "attemptCount" INTEGER     NOT NULL DEFAULT 0,
  "nextRetryAt"  TIMESTAMPTZ,
  "attemptedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed one test source for manual verification
INSERT INTO "Source" ("id", "name", "slug", "token", "schemaType")
VALUES (
  'src_test_001',
  'Test Source',
  'test',
  'test-webhook-token-change-me',
  'standard'
) ON CONFLICT DO NOTHING;
