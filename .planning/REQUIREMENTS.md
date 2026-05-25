# Requirements — Lead Capture Dashboard

## v1 Requirements

### Webhook / Ingestão

- [ ] **HOOK-01**: Sistema aceita POST em `/api/webhook/:sourceId` com payload de lead padrão (name, email, phone, utm_source, utm_medium, utm_campaign, utm_term, utm_content)
- [ ] **HOOK-02**: Sistema aceita POST com schema de questionário + leadscore (name, email, respostas do questionário, score numérico, classificação A/B/C/D)
- [ ] **HOOK-03**: Webhook valida campos obrigatórios e formato de email; retorna 422 para payloads inválidos
- [ ] **HOOK-04**: Webhook exige token de autenticação no header `X-Webhook-Token`; retorna 401 sem token correto

### Persistência

- [ ] **DATA-01**: Lead recebido é salvo em SQLite com: id, source_id, schema_type, fields (JSON), received_at, status (pending/synced/failed)
- [ ] **DATA-02**: Sistema mantém log de cada tentativa de sincronização (destino, status, erro, timestamp)

### Integrações

- [ ] **INT-01**: Lead é enviado para planilha Google Sheets configurada para a fonte (append de nova linha)
- [ ] **INT-02**: Lead é enviado para DataCrazy via webhook POST com campos mapeados
- [ ] **INT-03**: Se Sheets ou DataCrazy falhar, lead entra em fila de retry com backoff exponencial
- [ ] **INT-04**: Interface exibe status de sincronização por lead (sincronizado / pendente / falhou)

### Interface — Aba Configuração

- [ ] **CFG-01**: Usuário pode criar e editar "fontes" (sites de origem) com nome, schema type e token do webhook
- [ ] **CFG-02**: Usuário configura Google Sheets por fonte: Spreadsheet ID, nome da aba, mapeamento de campos
- [ ] **CFG-03**: Usuário configura DataCrazy por fonte: URL do webhook e mapeamento de campos
- [ ] **CFG-04**: Interface exibe a URL do webhook pronta para copiar e usar no site

### Interface — Aba Analytics

- [ ] **ANL-01**: Dashboard exibe gráfico de leads por hora (últimas 24h)
- [ ] **ANL-02**: Dashboard exibe gráfico de leads por dia (últimos 30 dias)
- [ ] **ANL-03**: Dashboard exibe breakdown por UTM source (quantos leads de cada canal)
- [ ] **ANL-04**: Dashboard exibe lista paginada dos leads mais recentes com campos principais
- [ ] **ANL-05**: Dashboard exibe distribuição de leadscore A/B/C/D para fontes com questionário
- [ ] **ANL-06**: Dashboard atualiza sem recarregar a página (polling ou SSE)

### Autenticação

- [ ] **AUTH-01**: Sistema tem login com email + senha
- [ ] **AUTH-02**: Admin pode criar/desativar usuários
- [ ] **AUTH-03**: Usuários não-admin têm acesso read-only ao dashboard (não podem alterar configurações)

## v2 Requirements (Deferred)

- Alertas por email/WhatsApp quando lead entra
- Export CSV de leads filtrado por período/fonte/score
- Integração com outros CRMs (HubSpot, RD Station)
- Webhook de saída configurável para terceiros
- Dashboard com taxa de conversão (requer pixel externo)

## Out of Scope

- n8n — este sistema substitui, não integra
- Pixel tracking / contagem de visitas — fora do escopo v1
- Email marketing / nurturing — fora do escopo v1
- App mobile — interface web responsiva é suficiente

## Traceability

| REQ-ID | Phase |
|--------|-------|
| HOOK-01, HOOK-02, HOOK-03, HOOK-04 | Phase 2 |
| DATA-01, DATA-02 | Phase 2 |
| INT-01, INT-02, INT-03, INT-04 | Phase 3 |
| CFG-01, CFG-02, CFG-03, CFG-04 | Phase 4 |
| ANL-01…ANL-06 | Phase 5 |
| AUTH-01, AUTH-02, AUTH-03 | Phase 1 |
