# Lead Capture Dashboard

## What This Is

Sistema de captação de leads com interface visual web — recebe webhooks de sites, salva em banco local (SQLite), sincroniza para Google Sheets e CRM DataCrazy, e exibe analytics em tempo real. Substitui fluxos n8n por uma aplicação standalone Next.js.

## Core Value

**Receber leads de múltiplos sites, garantir que nenhum se perca, e oferecer visibilidade imediata sobre volume e origem.**

## Context

- **Stack:** Next.js (App Router) + SQLite (via Prisma) + Google Sheets API (Service Account) + DataCrazy (webhook POST)
- **Deploy:** VPS Hostinger 178.104.14.40 com Traefik; subdomínio: `leads.esqtools.com` (DNS-only, sem proxy Cloudflare)
- **Roteamento:** um app, múltiplas captações por slug — `leads.esqtools.com/trt`, `leads.esqtools.com/outra-campanha`; webhooks em `/api/webhook/:slug`
- **Auth:** Multi-usuário (login simples admin + usuários)
- **Fontes de lead:** 2 sites com schemas distintos:
  - Site 1: name, email, phone, UTMs (captação padrão)
  - Site 2: name, email + questionário com lead score (A/B/C/D + numérico)

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Receber webhook POST com dados de lead (name, email, phone, UTMs)
- [ ] Suportar segundo schema com questionário e leadscore (A/B/C/D + número)
- [ ] Salvar leads em SQLite local com timestamp e fonte
- [ ] Sincronizar lead para planilha Google Sheets configurada
- [ ] Enviar lead para DataCrazy via webhook POST
- [ ] Interface visual: aba "Configuração" com URL do webhook, path da planilha, mapeamento de campos
- [ ] Interface visual: aba "Analytics" com leads/hora, leads/dia, breakdown por UTM source
- [ ] Lista em tempo real dos leads mais recentes
- [ ] Cálculo de leadscore automático (pesos por resposta, classificação A/B/C/D)
- [ ] Exibição de score no dashboard com filtros por classificação
- [ ] Autenticação multi-usuário (admin + usuários)
- [ ] Retry automático se Google Sheets ou DataCrazy falhar
- [ ] Configuração por site/campanha (múltiplos destinos, cada um com planilha própria)

### Out of Scope

- Pixel tracking / contador de visitas — não é responsabilidade deste sistema
- n8n — este sistema substitui os fluxos, não os integra
- Email marketing / nurturing — fora do escopo v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js (App Router) | Fullstack único, API Routes para webhook, SSR para dashboard | — Pending |
| SQLite + Prisma | Banco local zero-config, perfeito para VPS standalone | — Pending |
| Service Account Google | Sem OAuth browser, credencial fixa no .env | — Pending |
| DataCrazy via POST | API não documentada — integrar como webhook simples configurável | — Pending |
| Multi-site como "fontes" configuráveis | Cada fonte tem schema, planilha e CRM destino próprios | — Pending |

## Evolution

Este documento evolui a cada transição de fase e milestone.

**Após cada fase:** invalidar, validar ou adicionar requisitos conforme descobertas.

---
*Last updated: 2026-05-24 — initialization*
