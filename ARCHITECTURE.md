# Arquitetura

## Componentes

- `frontend/`: páginas HTML e scripts de integração.
- `backend/src/routes`: definição de endpoints.
- `backend/src/controllers`: orquestração HTTP.
- `backend/src/services`: regras de negócio e integrações externas.
- `backend/src/models`: acesso ao PostgreSQL.
- `backend/src/middlewares`: autenticação, autorização, validação e observabilidade.

## Fluxo de autenticação

1. O usuário faz login em `POST /api/auth/login`.
2. O backend valida senha, bloqueio temporário, e-mail verificado e emite:
   - access token de 15 minutos;
   - refresh token em cookie `HttpOnly`.
3. O frontend usa o access token apenas em memória de sessão.
4. Ao receber `401`, tenta `POST /api/auth/refresh`.
5. O backend rotaciona o refresh token e devolve um novo access token.
6. O logout revoga o token atual; o logout global revoga todos os tokens ativos.

## Modelo de dados

- `users`
- `clients`
- `campaigns`
- `metrics`
- `messages`
- `invoices`
- `tasks`
- `reports`
- `materials`
- `files`
- `contacts`
- `charges`
- `refresh_tokens`
- `email_verification_tokens`
- `password_reset_tokens`

## Fluxo de autorização

- autenticação via bearer token no backend;
- RBAC por middleware;
- escopo por tenant aplicado nos models e utilitários de acesso.
