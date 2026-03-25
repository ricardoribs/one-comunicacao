# Matriz de Permissoes

## Perfis

- `admin`: acesso total
- `gestor`: acesso operacional aos clientes atribuídos
- `designer`: produção e tarefas
- `comercial`: CRM, campanhas e financeiro
- `client`: apenas dados do proprio tenant

## Rotas principais

### Auth

- `POST /api/auth/login`: publico
- `POST /api/auth/refresh`: publico com cookie
- `POST /api/auth/logout`: autenticado
- `POST /api/auth/logout-all`: autenticado
- `POST /api/auth/forgot-password`: publico
- `POST /api/auth/reset-password`: publico com token
- `GET /api/auth/verify-email`: publico com token
- `GET /api/auth/me`: autenticado
- `POST /api/auth/register`: `admin`

### Gestao

- `GET /api/users`: `admin`
- `POST /api/users`: `admin`
- `PATCH/PUT /api/users/:id`: `admin`
- `DELETE /api/users/:id`: `admin`

### CRM e operacao

- `GET /api/clients`: autenticado com filtro por escopo
- `POST /api/clients`: `admin`, `gestor`, `comercial`
- `GET /api/campaigns`: autenticado com filtro por escopo
- `POST /api/campaigns`: `admin`, `gestor`, `comercial`
- `GET /api/tasks`: autenticado com filtro por escopo
- `POST /api/tasks`: `admin`, `gestor`, `designer`, `dev`
- `GET /api/contacts`: `admin`, `gestor`, `comercial`, `designer`, `dev`
- `POST /api/contacts`: publico
- `POST /api/contacts/:id/convert`: `admin`, `gestor`, `comercial`

### Financeiro

- `GET /api/charges`: `admin`, `gestor`, `comercial`, `client`
- `POST /api/charges`: `admin`, `gestor`, `comercial`
- `PATCH /api/charges/:id`: `admin`, `gestor`, `comercial`
- `GET /api/invoices`: autenticado com filtro por escopo
- `PATCH /api/invoices/:id/status`: `admin`, `comercial`

### Arquivos

- `GET /api/files`: autenticado com filtro por escopo
- `POST /api/files`: `admin`, `gestor`, `designer`, `dev`
- `DELETE /api/files/:id`: `admin`, `gestor`, `designer`, `dev`

## Regra de escopo

- `admin` ve todos os tenants
- `gestor` ve apenas clientes onde `manager_id = user.id`
- `client` ve apenas `client_id` do proprio token
- as decisoes de acesso sao feitas no backend; o frontend apenas esconde UI
