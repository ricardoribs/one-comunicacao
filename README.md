# ONE Comunicacao Integrada

Plataforma full stack para agencia de marketing digital, integrada sobre o HTML existente com backend real em Node.js, Express, PostgreSQL, JWT e RBAC.

## Estrutura

- `frontend/`
  - `index.html`: site institucional
  - `area-cliente.html`: portal do cliente
  - `painel-interno.html`: painel administrativo e interno
  - `assets/js/index-app.js`
  - `assets/js/client-app.js`
  - `assets/js/admin-app.js`
- `backend/`
  - `src/routes`, `src/controllers`, `src/services`, `src/models`, `src/middlewares`
  - `src/db/pgmigrations/`
  - `src/db/bootstrap-admin.js`
  - `src/db/seed.js`
  - `uploads/`

## Stack

- frontend: HTML + JavaScript com `fetch`
- backend: Node.js + Express
- banco: PostgreSQL
- autenticacao: JWT + bcrypt
- uploads: `multer` + Cloudinary opcional

## Funcionalidades

- login com JWT e perfis `client`, `admin`, `designer`, `gestor`, `comercial` e `dev`
- area do cliente com dashboard, campanhas, relatorios, materiais, faturas e mensagens
- painel interno com CRM, campanhas, kanban, producao, midia, analytics, financeiro e controle de acesso
- CRM com leads, conversao em cliente e cobrancas manuais
- API RESTful com validacao e RBAC

## Guia funcional da plataforma

Para um tutorial completo de uso da plataforma, por perfil e por modulo, consulte [GUIA-DA-PLATAFORMA.md](GUIA-DA-PLATAFORMA.md).

Para uma versao mais executiva, voltada a treinamento da equipe comercial e operacional, consulte [GUIA-OPERACIONAL-EQUIPE.md](GUIA-OPERACIONAL-EQUIPE.md).

Para onboarding rapido de novos colaboradores, consulte [PLAYBOOK-ONBOARDING.md](PLAYBOOK-ONBOARDING.md).

## Como rodar localmente

1. Copie `.env.example` para `.env`.
2. Ajuste `DATABASE_URL` e `JWT_SECRET`.
3. Instale as dependencias:

```bash
npm run install:backend
```

4. Rode bootstrap de banco:

```bash
npm run db:init
```

5. Se quiser dados demo locais, rode apenas em `development`:

```bash
npm run db:seed
```

6. Suba a aplicacao:

```bash
npm run dev
```

7. Acesse:

- `http://localhost:3000/`
- `http://localhost:3000/area-cliente.html`
- `http://localhost:3000/painel-interno.html`

## Bootstrap seguro do primeiro admin

Para ambiente sem dados demo:

```bash
ALLOW_ADMIN_BOOTSTRAP=true \
BOOTSTRAP_ADMIN_NAME="Admin ONE" \
BOOTSTRAP_ADMIN_EMAIL="admin@one.local" \
BOOTSTRAP_ADMIN_PASSWORD="SenhaForte@123" \
npm run bootstrap:admin
```

## Variaveis de ambiente

Veja `.env.example`. As principais:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `APP_BASE_URL`
- `CORS_ORIGINS`
- `UPLOAD_PROVIDER`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Producao

- `JWT_SECRET` nao pode permanecer no valor padrao em producao
- `CORS_ORIGINS` deve listar os dominios publicados, separados por virgula
- `UPLOAD_PROVIDER=cloudinary` e o recomendado para producao
- o health check esta disponivel em `GET /api/health`
- a prontidao completa esta disponivel em `GET /api/ready`
- RLS esta versionado nas migrations e deve ser validado com `npm run verify:rls`

Passo a passo operacional em [PRODUCTION.md](PRODUCTION.md).
Separacao de ambientes em [ENVIRONMENTS.md](ENVIRONMENTS.md).
Backup e restore em [RUNBOOK-BACKUP-RESTORE.md](RUNBOOK-BACKUP-RESTORE.md).

## Smoke test

Para validar um deploy publicado:

```bash
SMOKE_BASE_URL=https://seu-dominio.onrender.com \
SMOKE_EMAIL=admin@seudominio.com \
SMOKE_PASSWORD='SenhaForte@123' \
npm run smoke
```

O smoke verifica:

- `/api/health`
- `/api/ready`
- login
- `/api/auth/me`

## Endpoints principais

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET /api/clients`
- `GET /api/campaigns`
- `GET /api/tasks`
- `GET /api/contacts`
- `GET /api/charges`
- `GET /api/invoices`
- `GET /api/metrics`
- `GET /api/files`

## Validacao feita

- `node --check` nos arquivos principais do backend e frontend alterados
- auditoria de tenant guard com `npm run audit:tenant --prefix backend`
- validacao de scripts do frontend com `npm run check:frontend`
