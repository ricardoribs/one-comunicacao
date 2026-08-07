# Matriz de Permissoes

Fonte de verdade: `backend/src/utils/access.js`.

O frontend pode ocultar telas e acoes, mas a decisao final de acesso sempre acontece no backend via `authorize`, `authorizeCapability` e queries escopadas por usuario/tenant.

## Perfis

- `admin`: acesso total operacional, comercial, financeiro, calendario, usuarios e configuracoes.
- `gestor`: gestao operacional e comercial do escopo; ve financeiro de campanhas/cobrancas, mas nao gerencia faturas.
- `designer`: execucao de tarefas, producao, arquivos e relatorios; ve clientes de forma limitada; nao acessa CRM nem financeiro.
- `comercial`: CRM, clientes, campanhas, tarefas e financeiro comercial; nao gerencia calendario nem arquivos/producao.
- `dev`: suporte tecnico; ve dashboard, clientes limitados, calendario, tarefas, materiais, arquivos, relatorios e metricas; nao acessa CRM nem financeiro.

## Capacidades

| Capability | admin | gestor | designer | comercial | dev |
| --- | --- | --- | --- | --- | --- |
| `view_dashboard` | sim | sim | sim | sim | sim |
| `view_dashboard_financial` | sim | nao | nao | sim | nao |
| `view_dashboard_team` | sim | sim | nao | nao | nao |
| `view_internal_directory` | sim | sim | sim | sim | sim |
| `view_calendar_events` | sim | sim | sim | sim | sim |
| `manage_calendar_events` | sim | sim | nao | nao | nao |
| `view_clients` | sim | sim | sim | sim | sim |
| `view_clients_sensitive` | sim | sim | nao | sim | nao |
| `manage_clients` | sim | sim | nao | sim | nao |
| `view_contacts` | sim | sim | nao | sim | nao |
| `manage_contacts` | sim | sim | nao | sim | nao |
| `view_campaigns` | sim | sim | sim | sim | nao |
| `view_campaign_financials` | sim | sim | nao | sim | nao |
| `manage_campaigns` | sim | sim | nao | sim | nao |
| `view_tasks` | sim | sim | sim | sim | sim |
| `manage_tasks` | sim | sim | sim | sim | sim |
| `view_materials` | sim | sim | sim | sim | sim |
| `manage_materials` | sim | sim | sim | nao | nao |
| `view_files` | sim | sim | sim | sim | sim |
| `manage_files` | sim | sim | sim | nao | nao |
| `view_reports` | sim | sim | sim | sim | sim |
| `view_metrics` | sim | sim | nao | nao | sim |
| `view_invoices` | sim | nao | nao | sim | nao |
| `manage_invoices` | sim | nao | nao | sim | nao |
| `view_charges` | sim | sim | nao | sim | nao |
| `manage_charges` | sim | sim | nao | sim | nao |
| `send_messages` | sim | sim | sim | sim | sim |

## Rotas Principais

| Area | Rotas | Regra |
| --- | --- | --- |
| Auth | `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/reset-password` | Publicas com validacao propria |
| Auth protegida | `/api/auth/me`, `/api/auth/logout-all` | Usuario interno autenticado |
| Meu perfil | `/api/users/me/*` | Usuario interno autenticado |
| Usuarios | `/api/users`, `/api/users/:id`, `/api/users/access-overview` | `admin` |
| Equipe | `/api/users/team` | `view_dashboard_team` |
| Diretorio interno | `/api/users/assignable` | `view_internal_directory` |
| Clientes | `/api/clients` | `view_clients` / `manage_clients`; delete somente `admin` |
| CRM | `/api/contacts` | `view_contacts` / `manage_contacts` |
| Campanhas | `/api/campaigns` | leitura por `view_campaigns`; escrita por `admin`, `gestor`, `comercial`; delete somente `admin` |
| Kanban/checklist | `/api/tasks`, `/api/checklists/daily` | `view_tasks` / `manage_tasks`; delete de tarefa somente `admin` |
| Calendario | `/api/calendar-events` | `view_calendar_events` / `manage_calendar_events` |
| Producao | `/api/materials`, `/api/files`, `/api/reports` | `view_*` / `manage_*` conforme capability |
| Analytics | `/api/metrics`, `/api/integrations` | metricas por `view_metrics`; integracoes escrevem somente `admin` e `gestor` |
| Financeiro | `/api/charges`, `/api/invoices`, `/api/cost-entries` | charges/invoices por capabilities; custos por `admin` e `comercial` |

## Escopo

- `admin` enxerga todos os registros.
- Perfis internos sem acesso total passam por queries escopadas por `client_id`, responsavel ou permissao operacional.
- Campos sensiveis de cliente e financeiro sao mascarados quando o perfil nao tem a capability correspondente.
- Perfil `client` permanece bloqueado no painel interno.
