# Deploy

Este documento resume o fluxo recomendado para publicar a plataforma ONE em `staging` e em `production`.

## Topologia recomendada

- Banco: PostgreSQL gerenciado
- Backend: Render Web Service
- Frontend:
  - opção mais simples: servido pelo próprio backend Express
  - opção separada: Vercel, apontando para a API
- Uploads: Cloudinary
- E-mail: Resend

## Scripts usados no deploy

Na raiz do repositório:

```bash
npm run install:backend:prod
npm run db:migrate
npm run bootstrap:admin
npm run test
npm run check:frontend
```

No backend:

```bash
npm run db:migrate
npm run audit:tenant
npm run smoke
```

## Variáveis principais

Backend:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
JWT_SECRET=uma-chave-forte-com-64-caracteres-ou-mais
JWT_EXPIRES_IN=15m
APP_BASE_URL=https://seu-backend.onrender.com
UPLOAD_PROVIDER=cloudinary
EMAIL_PROVIDER=resend
EMAIL_FROM=no-reply@seudominio.com
SENTRY_DSN=...
DB_POOL_MAX=8
```

Frontend separado:

```html
<script>
  window.__ONE_API_BASE__ = "https://seu-backend.onrender.com/api";
</script>
```

## Fluxo recomendado para `staging`

1. Atualizar a branch de `staging`.
2. Executar:

```bash
npm run install:backend:prod
npm run db:migrate
npm run test
npm run check:frontend
```

3. Fazer o deploy no Render.
4. Confirmar se o boot completou:
   - migrations;
   - reconciliação de schema;
   - `audit:tenant`.
5. Executar smoke test:
   - login;
   - visão geral;
   - Kanban;
   - calendário;
   - CRM;
   - campanhas;
   - produção.

## Fluxo recomendado para `production`

1. Confirmar que a `staging` está validada.
2. Validar segredos e integrações.
3. Executar migrations.
4. Criar apenas o primeiro administrador, se necessário.
5. Publicar o backend.
6. Validar o painel interno.
7. Liberar acesso da equipe.

## Bootstrap do primeiro administrador

Use apenas quando a base ainda não tiver um administrador ativo.

```env
ALLOW_ADMIN_BOOTSTRAP=true
BOOTSTRAP_ADMIN_NAME=Demo Admin
BOOTSTRAP_ADMIN_EMAIL=admin@seudominio.com
BOOTSTRAP_ADMIN_PASSWORD=SenhaForte@123
```

Comando:

```bash
npm run bootstrap:admin
```

Não rode `db:seed` em produção.

## Render

Arquivo de referência: [render.yaml](/c:/Users/ricar/Downloads/Projeto%20One/render.yaml)

Parâmetros esperados:

- Build Command: `npm run install:backend:prod`
- Start Command: `npm run start`
- Health Check Path: `/api/health`
- Auto deploy: conforme a política da equipe

## Validação pós-deploy

- `GET /api/health`
- `GET /api/ready`
- login no painel interno
- abertura de `Meu Perfil`
- leitura de notificações
- criação de cliente
- criação de campanha
- criação de tarefa com múltiplos responsáveis
- criação de evento no calendário
- limpeza do histórico do checklist
- logout

## Checklist antes de abrir para a equipe

- `npm run audit:tenant --prefix backend`
- `npm run test --prefix backend`
- `npm run check:frontend`
- revisar logs do deploy
- revisar variáveis obrigatórias
- validar backup e restore conforme [RUNBOOK-BACKUP-RESTORE.md](/c:/Users/ricar/Downloads/Projeto%20One/RUNBOOK-BACKUP-RESTORE.md)
