-- sql/03b-lead-extra-columns.sql
-- Adiciona campos pagina_captura, pesquisa, grupo à tabela Lead
-- Run in Supabase SQL editor: Dashboard > SQL Editor > New query

ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "paginaCaptura" TEXT,
  ADD COLUMN IF NOT EXISTS "pesquisa"      TEXT,
  ADD COLUMN IF NOT EXISTS "grupo"         TEXT;
