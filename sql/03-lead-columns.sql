-- sql/03-lead-columns.sql
-- Migra Lead.fields (JSONB monolítico) para colunas individuais
-- Run in Supabase SQL editor: Dashboard > SQL Editor > New query
-- DO NOT run prisma db push — hangs on Transaction pooler.

-- 1. Adiciona colunas individuais
ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "name"        TEXT,
  ADD COLUMN IF NOT EXISTS "email"       TEXT,
  ADD COLUMN IF NOT EXISTS "phone"       TEXT,
  ADD COLUMN IF NOT EXISTS "utmSource"   TEXT,
  ADD COLUMN IF NOT EXISTS "utmMedium"   TEXT,
  ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT,
  ADD COLUMN IF NOT EXISTS "utmTerm"     TEXT,
  ADD COLUMN IF NOT EXISTS "utmContent"  TEXT,
  ADD COLUMN IF NOT EXISTS "score"       INTEGER,
  ADD COLUMN IF NOT EXISTS "grade"       TEXT,
  ADD COLUMN IF NOT EXISTS "answers"     JSONB;

-- 2. Migra dados existentes de fields → colunas individuais
UPDATE "Lead" SET
  "name"        = "fields"->>'name',
  "email"       = "fields"->>'email',
  "phone"       = "fields"->>'phone',
  "utmSource"   = "fields"->>'utm_source',
  "utmMedium"   = "fields"->>'utm_medium',
  "utmCampaign" = "fields"->>'utm_campaign',
  "utmTerm"     = "fields"->>'utm_term',
  "utmContent"  = "fields"->>'utm_content',
  "score"       = ("fields"->>'score')::INTEGER,
  "grade"       = "fields"->>'grade',
  "answers"     = "fields"->'answers'
WHERE "fields" IS NOT NULL;

-- 3. Remove coluna antiga (opcional — comente se quiser manter por segurança)
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "fields";
