# Matriz de Permissões

Este documento resume os perfis internos, os limites de acesso e os principais módulos protegidos da plataforma ONE.

## Perfis e responsabilidades

### `admin`

- administra a plataforma de ponta a ponta;
- acessa todos os módulos internos;
- gerencia usuários, permissões, clientes, campanhas, tarefas, eventos, cobranças e faturas;
- visualiza indicadores financeiros e operacionais completos;
- cria e administra o calendário da equipe.

### `gestor`

- coordena o escopo operacional da carteira;
- acompanha dashboard, CRM, campanhas, tarefas, produção, relatórios, analytics, notificações e calendário;
- cria e edita clientes, contatos, campanhas, tarefas, materiais, arquivos, cobranças e eventos;
- não acessa o controle completo de membros nem o financeiro administrativo por faturas.

### `designer`

- atua na execução operacional;
- usa Kanban, Produção, Arquivos, Relatórios, Checklist diário, notificações, calendário e Meu Perfil;
- cria e atualiza tarefas, materiais e arquivos do escopo;
- não acessa CRM, cobranças, faturas nem controle de acesso.

### `comercial`

- atua em pipeline, relacionamento e receita;
- usa CRM, campanhas, relatórios, financeiro comercial, notificações e Meu Perfil;
- cria e atualiza clientes, contatos, campanhas, cobranças e faturas do escopo;
- não administra a operação completa do time.

### `dev`

- atua em suporte técnico, analytics e integrações;
- usa Kanban, calendário, analytics, integrações, notificações e Meu Perfil;
- pode criar e atualizar tarefas do escopo técnico;
- não acessa CRM, faturamento e controle de acesso.

## Visão rápida por módulo

| Módulo             | `admin`      | `gestor`         | `designer`        | `comercial`         | `dev`            |
| ------------------ | ------------ | ---------------- | ----------------- | ------------------- | ---------------- |
| Visão Geral        | Total        | Escopo           | Operacional       | Comercial           | Técnico          |
| Meu Perfil         | Sim          | Sim              | Sim               | Sim                 | Sim              |
| Notificações       | Total        | Escopo           | Escopo            | Escopo              | Escopo           |
| Calendário         | Gestão total | Gestão do escopo | Leitura           | Leitura             | Leitura          |
| Kanban             | Total        | Gestão do escopo | Execução          | Leitura operacional | Execução técnica |
| Checklist diário   | Sim          | Sim              | Sim               | Sim                 | Sim              |
| Clientes           | Gestão total | Gestão do escopo | Leitura limitada  | Gestão comercial    | Não              |
| CRM / Leads        | Total        | Escopo           | Não               | Escopo              | Não              |
| Campanhas          | Total        | Escopo           | Leitura do escopo | Escopo              | Não              |
| Produção           | Total        | Gestão do escopo | Execução          | Leitura             | Leitura          |
| Arquivos           | Total        | Escopo           | Escopo            | Leitura             | Leitura          |
| Relatórios         | Total        | Escopo           | Escopo            | Escopo              | Escopo           |
| Analytics          | Total        | Escopo           | Não               | Não                 | Técnico          |
| Integrações        | Total        | Escopo           | Não               | Não                 | Escopo técnico   |
| Cobranças          | Total        | Escopo           | Não               | Escopo              | Não              |
| Faturas            | Total        | Não              | Não               | Escopo              | Não              |
| Controle de Acesso | Total        | Não              | Não               | Não                 | Não              |

## Rotas principais

### Autenticação

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/verify-email`
- `GET /api/auth/me`

### Meu Perfil

- `GET /api/users/me/profile`
- `PATCH /api/users/me/profile`
- `PATCH /api/users/me/password`

### Equipe e acessos

- `GET /api/users`: `admin`
- `POST /api/users`: `admin`
- `PUT /api/users/:id`: `admin`
- `DELETE /api/users/:id`: `admin`
- `GET /api/users/team`: `admin` e `gestor`
- `GET /api/users/assignable`: perfis internos autenticados
- `GET /api/users/access-overview`: `admin`

### Operação

- `GET /api/tasks`: perfis com leitura de tarefas
- `POST /api/tasks`: perfis com gestão de tarefas
- `PUT /api/tasks/:id`: perfis com gestão de tarefas
- `GET /api/checklists/daily`: perfis internos autenticados
- `DELETE /api/checklists/daily/history`: perfis internos autenticados
- `GET /api/calendar-events`: perfis internos autenticados
- `POST /api/calendar-events`: `admin` e `gestor`
- `GET /api/notifications`: perfis internos autenticados

### Comercial

- `GET /api/clients`
- `POST /api/clients`
- `PUT /api/clients/:id`
- `GET /api/contacts`
- `POST /api/contacts`
- `PUT /api/contacts/:id`
- `POST /api/contacts/:id/convert`
- `GET /api/campaigns`
- `POST /api/campaigns`
- `PUT /api/campaigns/:id`

### Produção, arquivos e analytics

- `GET /api/materials`
- `POST /api/materials`
- `PUT /api/materials/:id`
- `GET /api/files`
- `GET /api/files/:id/access-url`
- `POST /api/files`
- `GET /api/reports`
- `GET /api/metrics`
- `GET /api/integrations`

### Financeiro

- `GET /api/charges`
- `POST /api/charges`
- `PATCH /api/charges/:id`
- `GET /api/invoices`
- `POST /api/invoices`
- `PUT /api/invoices/:id`
- `PATCH /api/invoices/:id/status`

## Regras de escopo

- `admin` enxerga todos os registros.
- Os demais perfis operam apenas o escopo liberado pelo backend.
- O frontend adapta a interface, mas a decisão final de acesso sempre acontece no backend.
- Tarefas podem ter um responsável, múltiplos responsáveis ou ficar como `Todos da equipe`.
