# Checklist de Implementação

## Decisões adotadas

- Perfis finais:
  - `client` para área do cliente
  - `admin`, `designer`, `gestor`, `comercial`, `dev` para área interna
- Regra de escopo:
  - `admin` vê tudo
  - `client` vê apenas o próprio `client_id`
  - perfis internos não-admin usam escopo principal por `clients.manager_id`
  - tarefas e arquivos também consideram vínculo direto por `assigned_to` / `uploaded_by`
- JWT:
  - access token único com expiração de `1h`
  - refresh token não implementado nesta etapa
- Uploads:
  - base local com `multer` para desenvolvimento
  - decisão de produção documentada para migrar para Cloudinary
- Banco em produção:
  - Supabase PostgreSQL recomendado

## Status

### Decisões antes de codar

- [x] Definir perfis finais
- [x] Documentar regra de acesso por perfil e por cliente
- [x] Definir estratégia JWT
- [x] Definir direção de uploads
- [x] Definir banco de produção recomendado

### Schema e banco

- [x] Corrigir `users` com perfis finais
- [x] Corrigir `clients` com `plan`, `mrr`, `segment`, `manager_id`, `started_at`
- [x] Corrigir `tasks` com `client_id`, `deadline`, `type`, `column_name`
- [x] Corrigir `messages` com `context_type` e `context_id`
- [x] Corrigir `metrics` com `period`
- [x] Corrigir `materials` com `campaign_id`, `uploaded_by`, `filename`, `url`, `status`, `feedback`
- [x] Escrever migration SQL inicial
- [ ] Rodar migrations no banco real e validar estrutura

### Backend

- [x] Estrutura em camadas
- [x] Express com `cors`, `helmet`, `dotenv`, `morgan`
- [x] PostgreSQL com `pg`
- [x] `POST /auth/login`
- [x] `POST /auth/register`
- [x] Middleware de autenticação
- [x] Middleware RBAC
- [x] Rate limit no login
- [x] Validação de inputs com Zod
- [ ] Testar com Insomnia/Postman

### Endpoints

- [x] `GET /dashboard`
- [x] CRUD de `clients`
- [x] CRUD de `campaigns`
- [x] CRUD de `tasks`
- [x] `GET /metrics?campaign_id=&period=`
- [x] `POST /materials`
- [x] `PATCH /materials/:id/status`
- [x] `GET /invoices`
- [x] `PATCH /invoices/:id/status`
- [x] `GET /messages` com filtro de contexto
- [x] `POST /messages`
- [x] `GET /users`
- [x] `PATCH /users/:id`

### Frontend

- [x] Login real via API
- [x] JWT em `localStorage`
- [x] Dashboard do cliente consumindo API
- [x] Kanban consumindo API
- [x] CRM consumindo API
- [x] Campanhas consumindo API
- [x] Produção consumindo API
- [x] Analytics consumindo API
- [x] Financeiro consumindo API
- [x] Controle de acesso consumindo API
- [x] Logout real
- [x] Modais com POST/PUT/PATCH
- [x] Tratamento básico de erros com feedback visual

### Qualidade e segurança

- [x] Não retornar `password`
- [x] Variáveis de ambiente para segredos
- [x] Filtragem por perfil aplicada nas queries principais
- [ ] Testar manualmente com pelo menos 2 perfis

### Deploy

- [ ] Criar projeto no Supabase
- [ ] Rodar migrations em produção
- [ ] Deploy do backend no Render
- [ ] Configurar variáveis no Render
- [ ] Deploy do frontend no Vercel/Render Static
- [ ] Ajustar URL da API para produção
- [ ] Testar fluxo completo em produção
