# Arquitetura

## Componentes

- `frontend/`: páginas HTML, estilos e scripts do site e do painel interno
- `backend/src/routes`: definição dos endpoints da API
- `backend/src/controllers`: camada HTTP
- `backend/src/services`: regras de negócio e integrações
- `backend/src/models`: acesso ao PostgreSQL
- `backend/src/middlewares`: autenticação, autorização, validação, segurança e observabilidade
- `backend/src/db/pgmigrations`: migrations versionadas

## Fluxo de autenticação

1. O usuário faz login em `POST /api/auth/login`.
2. O backend valida credenciais, bloqueio por tentativas e estado da conta.
3. O backend devolve:
   - access token de curta duração
   - refresh token em cookie `HttpOnly`
4. O frontend mantém o access token em memória.
5. Em caso de expiração, o frontend usa `POST /api/auth/refresh`.
6. Logout e logout global revogam os refresh tokens válidos.

## Modelo de dados principal

- `users`
- `clients`
- `contacts`
- `campaigns`
- `tasks`
- `task_assignees`
- `user_daily_checklists`
- `notifications`
- `calendar_events`
- `calendar_event_reminders`
- `materials`
- `files`
- `reports`
- `metrics`
- `client_integrations`
- `charges`
- `invoices`
- `refresh_tokens`
- `email_verification_tokens`
- `password_reset_tokens`

## Regras de autorização

- autenticação sempre no backend
- autorização por capacidade, não apenas por tela
- isolamento por tenant no banco
- proteção adicional com RLS e contexto por usuário/cliente

## Módulos do painel interno

- Visão Geral
- Meu Perfil
- Kanban
- Calendário
- CRM / Leads
- Campanhas
- Produção
- Analytics
- Financeiro
- Controle de Acesso

## Eventos recentes refletidos na arquitetura

- notificações internas para tarefas e eventos
- presença de usuário com último acesso e localização
- múltiplos responsáveis por tarefa
- checklist diário persistido por usuário
- calendário compartilhado com lembretes automáticos
