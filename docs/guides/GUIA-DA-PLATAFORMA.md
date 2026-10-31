# Guia da Plataforma ONE

Este guia descreve a estrutura atual da plataforma, os perfis de acesso e os fluxos principais do sistema em linguagem objetiva e alinhada ao comportamento real do produto.

## 1. Visão geral

A plataforma ONE possui duas frentes ativas:

- site institucional: apresentação da agência e captação de leads;
- painel interno: ambiente operacional da equipe.

O painel interno concentra:

- visão geral
- meu perfil
- kanban
- calendário da equipe
- CRM e leads
- campanhas
- produção
- analytics
- financeiro
- controle de acesso

## 2. Estrutura da aplicação

### Frontend

- `frontend/index.html`: site institucional
- `frontend/painel-interno.html`: painel interno
- `frontend/assets/js/index-app.js`: fluxos do site
- `frontend/assets/js/admin-app.js`: lógica do painel interno

### Backend

- `backend/src/routes/`: rotas da API
- `backend/src/controllers/`: camada HTTP
- `backend/src/services/`: regras de negócio
- `backend/src/models/`: acesso ao banco
- `backend/src/middlewares/`: autenticação, autorização, validação e segurança
- `backend/src/db/pgmigrations/`: migrations versionadas

## 3. Perfis de acesso

O backend é a fonte real de autorização. O frontend apenas organiza a interface conforme o perfil.

### `admin`

Pode:

- acessar todos os módulos internos;
- gerenciar usuários, perfis e acessos;
- criar, editar e remover clientes, campanhas, tarefas, materiais, arquivos, cobranças e faturas;
- visualizar indicadores operacionais e financeiros completos;
- criar eventos no calendário da equipe.

### `gestor`

Pode:

- operar a própria carteira;
- distribuir tarefas, inclusive com múltiplos responsáveis;
- acompanhar CRM, campanhas, produção, analytics e cobranças do próprio escopo;
- criar eventos no calendário da equipe.

Não pode:

- administrar usuários;
- operar o financeiro interno completo por faturas fora do próprio escopo.

### `designer`

Pode:

- acompanhar tarefas atribuídas;
- operar o kanban;
- acompanhar produção, relatórios e arquivos do próprio escopo;
- visualizar o calendário e o perfil pessoal.

Não pode:

- operar CRM;
- gerenciar usuários;
- criar eventos no calendário;
- operar cobrança e faturamento.

### `comercial`

Pode:

- operar CRM e campanhas;
- converter leads em clientes;
- acompanhar tarefas, produção, cobranças e faturas;
- visualizar o calendário e o perfil pessoal.

Não pode:

- administrar usuários;
- operar módulos técnicos.

### `dev`

Pode:

- acompanhar o kanban;
- acessar analytics e integrações;
- visualizar calendário, relatórios e arquivos do escopo;
- manter o próprio perfil.

Não pode:

- operar CRM;
- gerenciar clientes comercialmente;
- operar cobrança e faturamento.

### `client`

Perfil legado, sem portal público ativo.

## 4. Endereços principais

Em ambiente local:

- site: `http://localhost:3000/`
- painel interno: `http://localhost:3000/painel-interno.html`
- API: `http://localhost:3000/api`

## 5. Fluxo de autenticação

### Login

O login usa:

- access token JWT;
- refresh token em cookie `HttpOnly`;
- autorização por perfil e capacidade;
- escopo por tenant no backend.

### Sessão

O frontend mantém o access token apenas em memória. Em caso de expiração, o refresh token é usado para renovar a sessão.

### Recuperação de acesso

Existem fluxos para:

- redefinição de senha;
- verificação de e-mail;
- logout local;
- logout global.

## 6. O que o site institucional faz

O site institucional:

- apresenta a agência;
- capta leads;
- direciona o acesso ao painel interno;
- apoia o fluxo comercial.

O formulário principal coleta:

- nome
- WhatsApp
- e-mail
- empresa
- serviço de interesse
- mensagem

## 7. Módulos do painel interno

### Visão Geral

Resumo operacional por perfil, com KPIs, tarefas urgentes e leituras resumidas.

### Meu Perfil

Cada usuário pode consultar e editar:

- nome
- e-mail
- telefone
- avatar
- senha
- último acesso
- localização
- permissões do perfil
- atividade recente

### Kanban

O Kanban suporta:

- colunas de fluxo operacional;
- múltiplos responsáveis por tarefa;
- checklist diário;
- histórico do checklist;
- manual da marca por cliente;
- drag and drop entre colunas.

### Calendário

Todos os perfis internos podem visualizar o calendário da equipe.

`admin` e `gestor` podem:

- criar eventos;
- editar eventos;
- excluir eventos.

O sistema envia lembretes automáticos para eventos próximos.

### CRM / Leads

O CRM inclui:

- pipeline de leads;
- conversão em cliente;
- clientes ativos;
- histórico comercial.

### Campanhas

Permite:

- cadastrar campanhas;
- acompanhar orçamento;
- acompanhar leads e resultados;
- vincular campanhas a clientes.

### Produção

Concentra:

- materiais;
- arquivos;
- status de aprovação;
- entregas vinculadas a cliente e campanha.

### Analytics

Mostra:

- métricas;
- relatórios;
- integrações por cliente;
- status de sincronização.

### Financeiro

Permite acompanhar:

- cobranças;
- faturas;
- margens;
- resumo financeiro por cliente.

### Controle de Acesso

Exclusivo do `admin`, com:

- membros;
- perfis e permissões;
- último acesso;
- presença;
- localização;
- status da conta.

## 8. Notificações internas

O sino do painel interno concentra notificações para:

- nova tarefa atribuída;
- tarefa concluída;
- lembretes de calendário;
- leitura de itens pendentes do fluxo operacional.

## 9. Fluxos principais

### Fluxo comercial

1. O lead entra pelo site ou é cadastrado manualmente.
2. O time comercial acompanha o pipeline no CRM.
3. O lead evolui de etapa.
4. O lead é convertido em cliente.
5. O cliente passa a ter campanhas, tarefas, produção e financeiro vinculados.

### Fluxo operacional

1. O cliente é cadastrado.
2. As campanhas e tarefas são criadas.
3. O Kanban organiza a execução.
4. A produção publica os materiais.
5. As notificações ajudam a coordenar entrega, revisão e conclusão.

### Fluxo de calendário

1. `admin` ou `gestor` cria um evento.
2. O evento entra na agenda semanal.
3. O sistema envia lembrete quando a janela de aviso é atingida.
4. A equipe acompanha o compromisso no painel.

## 10. API principal

### Autenticação

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/verify-email`
- `GET /api/auth/me`

### Perfil do usuário

- `GET /api/users/me/profile`
- `PATCH /api/users/me/profile`
- `PATCH /api/users/me/password`

### Operação

- `GET /api/dashboard`
- `GET /api/users/team`
- `GET /api/users/assignable`
- `GET /api/tasks`
- `GET /api/checklists/daily`
- `DELETE /api/checklists/daily/history`
- `GET /api/calendar-events`
- `GET /api/notifications`
- `GET /api/notifications/unread-count`

### Comercial

- `GET /api/clients`
- `GET /api/contacts`
- `GET /api/campaigns`

### Produção e analytics

- `GET /api/materials`
- `GET /api/files`
- `GET /api/reports`
- `GET /api/metrics`
- `GET /api/integrations`

### Financeiro

- `GET /api/charges`
- `GET /api/invoices`

## 11. Como rodar localmente

1. Copie `.env.example` para `.env`.
2. Ajuste as variáveis.
3. Instale o backend:

```bash
npm run install:backend
```

4. Rode as migrations:

```bash
npm run db:migrate
```

5. Se quiser dados de demonstração:

```bash
npm run db:seed
```

6. Suba a aplicação:

```bash
npm run dev
```

## 12. Boas práticas de operação

- Não trate autorização apenas pelo frontend.
- Não publique material sem revisar o arquivo final.
- Não deixe lead, campanha ou tarefa sem responsável.
- Não use planilhas paralelas para dados já existentes na plataforma.
- Não ignore notificações operacionais e lembretes do calendário.

## 13. Documentos complementares

- [README do repositório](../../README.md)
- [GUIA-OPERACIONAL-EQUIPE.md](GUIA-OPERACIONAL-EQUIPE.md)
- [PLAYBOOK-ONBOARDING.md](PLAYBOOK-ONBOARDING.md)
- [MATRIZ-PERFIS-ACESSO.md](../security/MATRIZ-PERFIS-ACESSO.md)
- [PERMISSIONS-MATRIX.md](../security/PERMISSIONS-MATRIX.md)
- [RUNBOOK.md](../operations/RUNBOOK.md)
- [RUNBOOK-BACKUP-RESTORE.md](../operations/RUNBOOK-BACKUP-RESTORE.md)
- [AUDITORIA-CHECKLIST-PRODUCAO.md](../security/AUDITORIA-CHECKLIST-PRODUCAO.md)
