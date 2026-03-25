# Production

## Objetivo

Checklist operacional e tecnico para publicar a aplicacao com backend Express, PostgreSQL, JWT, uploads protegidos e observabilidade.

## 1. Segredos e variaveis obrigatorias

Gere o segredo JWT fora do repositorio:

```bash
openssl rand -hex 64
```

Configure no provedor:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
JWT_SECRET=<resultado do openssl rand -hex 64>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
APP_BASE_URL=https://seu-dominio.onrender.com
CORS_ORIGINS=https://seu-dominio.onrender.com,https://www.seu-dominio.com
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=no-reply@seudominio.com
SENTRY_DSN=...
SENTRY_ENVIRONMENT=production
PAYMENT_PROVIDER=manual
MAINTENANCE_MODE=false
```

Em producao, nao use arquivos `.env`. Todas as variaveis devem ser injetadas pelo provedor.

## 2. Banco e bootstrap

1. Crie um PostgreSQL dedicado para producao.
2. Crie um PostgreSQL dedicado para staging.
3. Aplique migrations:

```bash
npm run db:init
```

4. Crie o primeiro administrador:

```bash
ALLOW_ADMIN_BOOTSTRAP=true \
BOOTSTRAP_ADMIN_NAME="Admin ONE" \
BOOTSTRAP_ADMIN_EMAIL="admin@seudominio.com" \
BOOTSTRAP_ADMIN_PASSWORD="SenhaForte@123" \
npm run bootstrap:admin
```

5. Nao rode `db:seed` em producao.

## 3. Render

Arquivo de referencia: [render.yaml](/c:/Users/ricar/Downloads/Projeto%20One/render.yaml)

Configuracao esperada:

- Plan: `starter` ou superior
- Build Command: `npm run install:backend:prod`
- Start Command: `npm run start`
- Health Check Path: `/api/health`
- Auto deploy: `true`
- `JWT_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `SENTRY_DSN` e `CLOUDINARY_*` como segredos

## 4. E-mail transacional

Use Resend com dominio proprio do cliente.

1. Adicione o dominio no Resend.
2. Publique SPF, DKIM e DMARC no DNS do dominio.
3. Valide os registros externamente:
   - SPF/DKIM/DMARC: https://mxtoolbox.com/
   - Documentacao Resend: https://resend.com/docs/dashboard/domains/introduction

Checklist minimo:

- SPF publicado
- DKIM publicado
- DMARC publicado
- dominio verificado no Resend
- `EMAIL_FROM` usando o dominio validado

## 5. RLS no PostgreSQL

SQL de referencia para habilitar RLS nas tabelas multi-tenant:

```sql
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_role() RETURNS TEXT
LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('app.current_role', true), '');
$$;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS INTEGER
LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
$$;

CREATE OR REPLACE FUNCTION app.current_client_id() RETURNS INTEGER
LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('app.current_client_id', true), '')::INTEGER;
$$;

CREATE OR REPLACE FUNCTION app.is_admin() RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT app.current_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION app.is_client() RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT app.current_role() = 'client';
$$;

CREATE OR REPLACE FUNCTION app.is_internal() RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT app.current_role() IN ('designer', 'gestor', 'comercial', 'dev');
$$;

CREATE OR REPLACE FUNCTION app.can_access_client(target_client_id INTEGER) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT
    app.is_admin()
    OR (app.is_client() AND target_client_id = app.current_client_id())
    OR (
      app.is_internal()
      AND EXISTS (
        SELECT 1
        FROM clients c
        WHERE c.id = target_client_id
          AND c.manager_id = app.current_user_id()
      )
    );
$$;
```

Policies prontas para copiar:

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
CREATE POLICY clients_tenant_isolation ON clients
  FOR ALL
  USING (
    app.is_admin()
    OR (app.is_client() AND id = app.current_client_id())
    OR (app.is_internal() AND manager_id = app.current_user_id())
  )
  WITH CHECK (
    app.is_admin()
    OR (app.is_client() AND id = app.current_client_id())
    OR (app.is_internal() AND manager_id = app.current_user_id())
  );

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaigns_tenant_isolation ON campaigns;
CREATE POLICY campaigns_tenant_isolation ON campaigns
  FOR ALL
  USING (app.can_access_client(client_id))
  WITH CHECK (app.can_access_client(client_id));

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
CREATE POLICY invoices_tenant_isolation ON invoices
  FOR ALL
  USING (app.can_access_client(client_id))
  WITH CHECK (app.can_access_client(client_id));

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_tenant_isolation ON reports;
CREATE POLICY reports_tenant_isolation ON reports
  FOR ALL
  USING (app.can_access_client(client_id))
  WITH CHECK (app.can_access_client(client_id));
```

Referencia completa versionada: [006_row_level_security.js](/c:/Users/ricar/Downloads/Projeto%20One/backend/src/db/pgmigrations/006_row_level_security.js)

Validacao obrigatoria:

```bash
npm run verify:rls
```

## 6. Observabilidade

- `SENTRY_DSN` configurado
- alertas para `GET /api/health`, `GET /api/ready` e taxa de 5xx
- monitoramento de disponibilidade do Render
- logger central consumindo `request_id`

## 7. 2FA e ownership de contas

2FA obrigatorio:

- Render: https://dashboard.render.com/
- Supabase: https://supabase.com/dashboard
- Cloudinary: https://console.cloudinary.com/
- Registradora / DNS do dominio do cliente

Checklist:

- 2FA habilitado em todas as contas de infra
- contas de producao no nome do cliente, nunca no nome do desenvolvedor
- acessos compartilhados por grupo/equipe, nao por conta pessoal unica

## 8. Staging e backup

- staging separado de producao
- segredos separados por ambiente
- banco separado por ambiente
- backup automatico diario habilitado
- restore drill validado em ambiente isolado

Runbook: [RUNBOOK-BACKUP-RESTORE.md](/c:/Users/ricar/Downloads/Projeto%20One/RUNBOOK-BACKUP-RESTORE.md)

## 9. Validacao pos-deploy

Teste manual:

1. `GET /api/health`
2. `GET /api/ready`
3. login no painel interno
4. login do cliente
5. CRUD de cliente, campanha e tarefa
6. upload de arquivo
7. criacao de cobranca
8. logout local e logout global

Smoke automatizado:

```bash
SMOKE_BASE_URL=https://seu-dominio.onrender.com \
SMOKE_EMAIL=admin@seudominio.com \
SMOKE_PASSWORD='SenhaForte@123' \
npm run smoke
```

O smoke testa:

- liveness
- readiness
- login
- `/api/auth/me`

## 10. Go-live final

- [ ] `JWT_SECRET` gerado com `openssl rand -hex 64`
- [ ] `JWT_EXPIRES_IN=15m`
- [ ] `audit:tenant` sem violacoes
- [ ] `verify:rls` validado em staging
- [ ] `RESEND_API_KEY`, `EMAIL_FROM` e `SENTRY_DSN` reais configurados
- [ ] Cloudinary configurado
- [ ] SPF, DKIM e DMARC verificados no MXToolbox
- [ ] contas de infra em nome do cliente
- [ ] 2FA habilitado em Render, Supabase, Cloudinary e registradora
- [ ] staging separado e aprovado
- [ ] backup automatico habilitado
- [ ] `npm run smoke` executado com sucesso
