# Matriz de Permissões

Este documento resume o papel de cada perfil, os limites de acesso e as principais rotas protegidas da plataforma ONE.

## Perfis e responsabilidades

### `admin`

- Administra a plataforma de ponta a ponta.
- Acessa todos os módulos internos.
- Gerencia usuários, perfis, permissões e diretório interno.
- Cria, edita e remove clientes, campanhas, tarefas, materiais, arquivos, cobranças e faturas.
- Enxerga indicadores financeiros e operacionais completos.

### `gestor`

- Opera a carteira do próprio escopo.
- Acompanha dashboard interno, equipe habilitada, clientes, CRM, campanhas, tarefas, produção, relatórios, analytics e cobranças.
- Cria e edita clientes, contatos, campanhas, tarefas, materiais, arquivos e cobranças.
- Não administra usuários nem o financeiro interno completo por faturas.

### `designer`

- Atua na execução operacional.
- Usa principalmente dashboard, kanban, produção, campanhas do escopo, relatórios e arquivos.
- Cria e atualiza tarefas, materiais e arquivos.
- Não acessa CRM, cobranças, faturas, métricas financeiras nem dados sensíveis de clientes.

### `comercial`

- Atua em pipeline, relacionamento e receita.
- Usa dashboard, CRM, campanhas, relatórios e financeiro.
- Cria e atualiza clientes, contatos, campanhas, cobranças e faturas.
- Consulta tarefas e materiais, mas não gerencia execução operacional completa.
- Não administra usuários nem módulos técnicos.

### `dev` (Desenvolvimento)

- Atua em suporte técnico, leitura operacional e analytics.
- Usa dashboard, kanban, analytics e diretório interno.
- Pode criar e atualizar tarefas.
- Consulta métricas e integrações quando aplicável ao trabalho técnico.
- Não acessa CRM, clientes, campanhas, materiais, arquivos, cobranças ou faturas.

### `client` (Cliente)

- Perfil legado, sem portal público ativo.
- O atendimento ocorre pela operação interna da ONE conforme o escopo contratado.
- Não acessa o painel interno.
- Não altera registros internos da operação.

## Visão rápida por módulo

| Módulo | `admin` | `gestor` | `designer` | `comercial` | `dev` | `client` |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard interno | Total | Escopo | Operacional | Comercial | Técnico | Não |
| Equipe habilitada | Sim | Sim | Não | Não | Não | Não |
| Diretório interno | Sim | Sim | Sim | Sim | Sim | Não |
| Clientes | Gestão total | Gestão do escopo | Leitura limitada | Gestão comercial | Não | Não |
| CRM / contatos | Total | Escopo | Não | Escopo | Não | Não |
| Campanhas | Total | Escopo | Leitura do escopo | Escopo | Não | Leitura do próprio cliente |
| Tarefas / kanban | Total | Gestão do escopo | Execução | Leitura | Execução técnica | Não |
| Produção / materiais | Total | Gestão do escopo | Execução | Leitura | Não | Aprovação no portal |
| Arquivos | Total | Escopo | Escopo | Não | Não | Não |
| Relatórios | Total | Escopo | Escopo | Escopo | Não | Próprio cliente |
| Métricas / analytics | Total | Escopo | Não | Não | Técnico | Não |
| Cobranças | Total | Escopo | Não | Escopo | Não | Leitura do próprio cliente |
| Faturas | Total | Não | Não | Escopo | Não | Leitura do próprio cliente |
| Controle de acesso | Total | Não | Não | Não | Não | Não |

## Rotas principais

### Autenticação

- `POST /api/auth/login`: público
- `POST /api/auth/refresh`: público com cookie de refresh
- `POST /api/auth/logout`: autenticado
- `POST /api/auth/logout-all`: autenticado
- `POST /api/auth/forgot-password`: público
- `POST /api/auth/reset-password`: público com token
- `GET /api/auth/verify-email`: público com token
- `GET /api/auth/me`: autenticado
- `POST /api/auth/register`: `admin`

### Equipe e usuários

- `GET /api/users`: `admin`
- `POST /api/users`: `admin`
- `PATCH /api/users/:id`: `admin`
- `PUT /api/users/:id`: `admin`
- `DELETE /api/users/:id`: `admin`
- `GET /api/users/team`: `admin`, `gestor`
- `GET /api/users/assignable`: perfis internos autenticados

### Clientes e CRM

- `GET /api/clients`: perfis com `view_clients`, respeitando escopo
- `POST /api/clients`: perfis com `manage_clients`
- `PUT /api/clients/:id`: perfis com `manage_clients`
- `DELETE /api/clients/:id`: `admin`
- `GET /api/contacts`: perfis com `view_contacts`, respeitando escopo
- `POST /api/contacts`: público
- `PUT/PATCH /api/contacts/:id`: perfis com `manage_contacts`
- `DELETE /api/contacts/:id`: perfis com `manage_contacts`
- `POST /api/contacts/:id/convert`: perfis com `manage_contacts`

### Campanhas e operação

- `GET /api/campaigns`: perfis com `view_campaigns`, respeitando escopo
- `POST /api/campaigns`: `admin`, `gestor`, `comercial`
- `PUT /api/campaigns/:id`: `admin`, `gestor`, `comercial`
- `DELETE /api/campaigns/:id`: `admin`
- `GET /api/tasks`: perfis com `view_tasks`, respeitando escopo
- `POST /api/tasks`: perfis com `manage_tasks`
- `PUT /api/tasks/:id`: perfis com `manage_tasks`
- `DELETE /api/tasks/:id`: `admin`
- `GET /api/materials`: perfis com `view_materials`, respeitando escopo
- `POST /api/materials`: perfis com `manage_materials`
- `PATCH /api/materials/:id/status`: perfis com `manage_materials`
- `PUT /api/materials/:id`: perfis com `manage_materials`
- `DELETE /api/materials/:id`: perfis com `manage_materials`

### Financeiro

- `GET /api/charges`: perfis com `view_charges`, respeitando escopo
- `POST /api/charges`: perfis com `manage_charges`
- `PATCH /api/charges/:id`: perfis com `manage_charges`
- `GET /api/invoices`: perfis com `view_invoices`, respeitando escopo
- `POST /api/invoices`: perfis com `manage_invoices`
- `PUT /api/invoices/:id`: perfis com `manage_invoices`
- `PATCH /api/invoices/:id/status`: perfis com `manage_invoices`

### Arquivos, relatórios e analytics

- `GET /api/files`: perfis com `view_files`, respeitando escopo
- `GET /api/files/:id/access-url`: perfis com `view_files`, respeitando escopo
- `POST /api/files`: perfis com `manage_files`
- `DELETE /api/files/:id`: perfis com `manage_files`
- `GET /api/reports`: perfis com `view_reports`, respeitando escopo
- `GET /api/metrics`: perfis com `view_metrics`, respeitando escopo
- `GET /api/integrations`: perfis com `view_metrics`, respeitando escopo
- `POST /api/integrations`: `admin`, `gestor`
- `PUT /api/integrations/:id`: `admin`, `gestor`
- `DELETE /api/integrations/:id`: `admin`, `gestor`

## Regra de escopo

- `admin` enxerga todos os registros.
- `client` enxerga apenas o `client_id` do próprio token.
- Perfis internos (`gestor`, `designer`, `comercial`, `dev`) operam somente o escopo permitido pelo backend, considerando relacionamento com cliente, atribuição de tarefa, ownership e demais regras de acesso.
- O frontend adapta a interface, mas a decisão final de acesso sempre acontece no backend.
