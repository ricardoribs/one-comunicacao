# ONE Comunicacao Integrada

Plataforma interna da ONE para CRM, campanhas, producao, calendario, analytics, financeiro e controle de acesso.

## Stack

- Backend: Node.js, Express, PostgreSQL e `node-pg-migrate`.
- Frontend: HTML, CSS e JavaScript vanilla servido pelo proprio Express.
- Autenticacao: JWT, refresh token em cookie HttpOnly e MFA/TOTP para perfis criticos.
- Uploads: Cloudinary em producao, local em desenvolvimento.
- Observabilidade: logs estruturados com Pino e Sentry opcional/obrigatorio por ambiente.
- Deploy atual: Render Web Service via `render.yaml`.

## Estrutura

```text
backend/
  src/                  API, rotas, modelos, servicos e migrations
  scripts/              smoke test, validacao de env, backup e RLS
  test/                 testes automatizados
frontend/
  assets/               JS, CSS, SVGs, imagens e midia
  index.html            site publico
  painel-interno.html   painel da equipe
docs/
  openapi.yaml          contrato HTTP
scripts/
  audit-tenant.js       guarda contra queries fora do escopo tenant
  check-frontend.js     validacao sintatica dos JS do frontend
render.yaml             blueprint Render
```

## Rodar Localmente

Prerequisitos:

- Node.js 24 recomendado.
- PostgreSQL 16+.
- npm.

Passos:

```bash
cp .env.example .env
npm ci --prefix backend
npm run db:migrate --prefix backend
npm run bootstrap:admin --prefix backend
npm run dev --prefix backend
```

Acesse:

- Site: `http://localhost:3000/`
- Painel interno: `http://localhost:3000/app/io`

## Comandos

```bash
npm run check:frontend
npm run lint --prefix backend
npm test --prefix backend
npm run db:migrate --prefix backend
npm run verify:rls --prefix backend
npm run validate:env --prefix backend
npm run smoke --prefix backend
```

## Deploy no Render

O deploy atual usa `render.yaml` com runtime Node nativo. O frontend e a API sobem no mesmo servico Render.

Configuracao principal:

- Build Command: `npm run install:backend:prod && npm run predeploy:render --prefix backend`
- Start Command: `npm run start`
- Health Check Path: `/api/health`
- Auto deploy: commits na branch conectada

Variaveis obrigatorias no Render:

```env
NODE_ENV=production
APP_BASE_URL=https://one-comunicacao-staging.onrender.com
CORS_ORIGINS=https://one-comunicacao-staging.onrender.com
TRUST_PROXY=1

DATABASE_HOST=aws-1-us-east-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=<valor no Render>
DATABASE_PASSWORD=<valor no Render>
DATABASE_SSL_REQUIRED=true
DATABASE_SSL_CA_FILE=/etc/secrets/prod-ca-2021.crt
VERIFY_DATABASE_URL=<direct connection do Supabase para verify:rls>

JWT_SECRET=<64+ caracteres>
JWT_EXPIRES_IN=15m
BCRYPT_ROUNDS=12
MFA_ENCRYPTION_KEY=<32+ caracteres>
FINANCIAL_ENCRYPTION_KEY=<32+ caracteres>

UPLOAD_PROVIDER=cloudinary
UPLOAD_REQUIRE_MALWARE_SCAN=false
MALWARE_SCAN_PROVIDER=none
CLOUDINARY_CLOUD_NAME=<valor no Render>
CLOUDINARY_API_KEY=<valor no Render>
CLOUDINARY_API_SECRET=<valor no Render>
CLOUDINARY_REQUIRE_PRIVATE_UPLOAD=true

EMAIL_PROVIDER=resend
EMAIL_FROM=<valor no Render>
RESEND_API_KEY=<valor no Render>

SENTRY_DSN=<valor no Render>
SENTRY_REQUIRED=true
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
MAINTENANCE_MODE=false
```

O smoke autenticado deve rodar no CI ou no pos-deploy, nao no build do Render. Para executar manualmente:

```bash
SMOKE_BASE_URL=https://one-comunicacao-staging.onrender.com SMOKE_EMAIL=<usuario interno> SMOKE_PASSWORD=<senha> npm run postdeploy:smoke --prefix backend
```

Backlog operacional de servicos externos:

- ClamAV: quando houver scanner real, trocar `UPLOAD_REQUIRE_MALWARE_SCAN=true`, `MALWARE_SCAN_PROVIDER=clamav`, `CLAMAV_HOST=<host>` e `CLAMAV_PORT=3310`. Ate la, o app bloqueia tipos de upload arriscados quando o scan esta inativo.
- Webhook de alerta: quando houver endpoint real, configurar `SECURITY_ALERT_WEBHOOK_URL`. Ate la, os alertas de seguranca seguem em log estruturado.

Antes de publicar:

```bash
npm run validate:env --prefix backend
npm run lint --prefix backend
npm test --prefix backend
npm run check:frontend
```

Depois do deploy:

- `GET /api/health`
- `GET /api/ready`
- login no painel interno
- fluxo basico de cliente, campanha, tarefa e calendario

## Documentacao Mantida

- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `RUNBOOK.md`
- `RUNBOOK-BACKUP-RESTORE.md`
- `AUDITORIA-CHECKLIST-PRODUCAO.md`
- `GUIA-DA-PLATAFORMA.md`
- `GUIA-OPERACIONAL-EQUIPE.md`
- `PLAYBOOK-ONBOARDING.md`
- `PERMISSIONS-MATRIX.md`
- `MAPEAMENTO-EQUIPE-ACESSOS.md`
- `docs/openapi.yaml`
