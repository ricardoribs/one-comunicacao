# ONE Comunicação Integrada

Plataforma full stack da ONE para operação interna, CRM, campanhas, produção, analytics e financeiro.

## Visão geral

A plataforma é composta por duas frentes:

- `frontend/index.html`: site institucional
- `frontend/painel-interno.html`: painel interno da equipe
- `backend/`: API em Node.js, Express e PostgreSQL

O painel interno concentra:

- visão geral por perfil
- meu perfil
- kanban operacional
- calendário da equipe
- CRM e leads
- campanhas
- produção
- analytics
- financeiro
- controle de acesso

## Stack

- Frontend: HTML, CSS e JavaScript puro
- Backend: Node.js + Express
- Banco: PostgreSQL
- Autenticação: JWT + refresh token em cookie
- Segurança: RBAC, isolamento por tenant, validação de entrada e logs estruturados
- Uploads: provider local para desenvolvimento e Cloudinary para produção

## Funcionalidades principais

- login interno com perfis `admin`, `gestor`, `designer`, `comercial` e `dev`
- notificações internas para atribuição e conclusão de tarefas
- calendário compartilhado da equipe com lembretes automáticos
- kanban com múltiplos responsáveis por tarefa
- checklist diário com histórico e limpeza manual
- CRM com pipeline, conversão de lead e clientes ativos
- produção com materiais e arquivos protegidos
- analytics com integrações e métricas por cliente
- financeiro com cobranças, faturas e margens
- controle de acesso com presença, último acesso e localização
- página de perfil do usuário com edição de dados e troca de senha

## Estrutura do repositório

```text
frontend/
  index.html
  painel-interno.html
  assets/js/
  assets/css/

backend/
  src/routes/
  src/controllers/
  src/services/
  src/models/
  src/middlewares/
  src/db/pgmigrations/
```

## Como rodar localmente

1. Copie `.env.example` para `.env`.
2. Ajuste as variáveis obrigatórias.
3. Instale o backend:

```bash
npm run install:backend
```

4. Inicialize o banco:

```bash
npm run db:init
```

5. Se quiser massa de teste local:

```bash
npm run db:seed
```

6. Suba a aplicação:

```bash
npm run dev
```

7. Acesse:

- `http://localhost:3000/`
- `http://localhost:3000/painel-interno.html`

## Bootstrap do primeiro administrador

```bash
ALLOW_ADMIN_BOOTSTRAP=true \
BOOTSTRAP_ADMIN_NAME="Admin ONE" \
BOOTSTRAP_ADMIN_EMAIL="admin@one.local" \
BOOTSTRAP_ADMIN_PASSWORD="SenhaForte@123" \
npm run bootstrap:admin
```

## Variáveis de ambiente principais

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `APP_BASE_URL`
- `CORS_ORIGINS`
- `UPLOAD_PROVIDER`
- `EMAIL_PROVIDER`
- `SENTRY_DSN`

## Documentação

- [GUIA-DA-PLATAFORMA.md](GUIA-DA-PLATAFORMA.md)
- [GUIA-OPERACIONAL-EQUIPE.md](GUIA-OPERACIONAL-EQUIPE.md)
- [PLAYBOOK-ONBOARDING.md](PLAYBOOK-ONBOARDING.md)
- [MAPEAMENTO-EQUIPE-ACESSOS.md](MAPEAMENTO-EQUIPE-ACESSOS.md)
- [PERMISSIONS-MATRIX.md](PERMISSIONS-MATRIX.md)
- [DEPLOY.md](DEPLOY.md)
- [ENVIRONMENTS.md](ENVIRONMENTS.md)
- [PRODUCTION.md](PRODUCTION.md)
- [RUNBOOK.md](RUNBOOK.md)
- [RUNBOOK-BACKUP-RESTORE.md](RUNBOOK-BACKUP-RESTORE.md)

## Validações recomendadas

```bash
npm run check:frontend
npm test --prefix backend
npm run audit:tenant --prefix backend
```
