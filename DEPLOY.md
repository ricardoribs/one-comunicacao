# Deploy

## Producao recomendada

- Banco: PostgreSQL gerenciado
- Backend: Render Web Service
- Frontend:
  - opcao mais simples: servido pelo mesmo backend Express
  - opcao separada: Vercel
- Uploads: Cloudinary

## 1. Variaveis de ambiente

Backend:

```env
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=uma-chave-forte-com-64-caracteres-ou-mais
JWT_EXPIRES_IN=15m
UPLOAD_PROVIDER=cloudinary
APP_BASE_URL=https://seu-backend.onrender.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=no-reply@seudominio.com
```

Frontend separado:

```html
<script>
  window.__ONE_API_BASE__ = "https://seu-backend.onrender.com/api";
</script>
```

## 2. Migrations e bootstrap

Execute com variaveis injetadas no shell ou no painel do provedor. Nao use arquivos `.env.production`, `.env.staging` ou `backend/.env` versionados.

```bash
npm run install:backend:prod
npm run db:migrate
npm run bootstrap:admin
```

Variaveis obrigatorias para o bootstrap:

```env
ALLOW_ADMIN_BOOTSTRAP=true
BOOTSTRAP_ADMIN_NAME=Nome do Admin
BOOTSTRAP_ADMIN_EMAIL=admin@seudominio.com
BOOTSTRAP_ADMIN_PASSWORD=SenhaForte@123
```

Nao rode `db:seed` em producao.

## 3. Backend no Render

Use `render.yaml` como base ou configure manualmente:

- Build Command: `npm run install:backend:prod`
- Start Command: `npm run start`
- Auto deploy: desligado

## 4. Frontend

### Opcao A

Nao separar. Use apenas o backend no Render.

### Opcao B

Hospede `frontend/` no Vercel e injete `window.__ONE_API_BASE__` apontando para o backend.

## 5. Testes antes de abrir acesso

- `GET /api/health`
- `GET /api/ready`
- login como cliente
- login como admin
- criar cliente
- criar campanha
- criar tarefa
- aprovar material
- abrir analytics
- logout

## 6. Primeiro acesso

- crie apenas o primeiro administrador com `npm run bootstrap:admin`
- cadastre os demais usuarios pelo painel interno ou por rotina segura de provisionamento
- nao use contas demo ou senhas previsiveis em producao
- valide o isolamento multi-tenant com `npm run verify:rls` em staging ou CI antes do deploy final
- valide backup e restore conforme [RUNBOOK-BACKUP-RESTORE.md](/c:/Users/ricar/Downloads/Projeto%20One/RUNBOOK-BACKUP-RESTORE.md)
