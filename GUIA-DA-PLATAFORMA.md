# Guia da Plataforma ONE

Este documento apresenta a estrutura da plataforma ONE, os perfis de acesso e os fluxos principais de operação em linguagem direta e alinhada ao comportamento real do sistema.

## 1. Visão geral

A plataforma é composta por três frentes:

- Site institucional: apresenta a agência, capta leads e direciona acessos.
- Área do Cliente: portal em que cada cliente acompanha campanhas, relatórios, materiais, faturas, cobranças e mensagens do próprio escopo.
- Painel interno: ambiente de operação da equipe com dashboard, kanban, CRM, campanhas, produção, analytics, financeiro e gestão de acesso.

## 2. Estrutura da aplicação

### Frontend

- `frontend/index.html`: site institucional
- `frontend/area-cliente.html`: portal do cliente
- `frontend/painel-interno.html`: painel interno
- `frontend/assets/js/index-app.js`: fluxos da home e handoff de login
- `frontend/assets/js/client-app.js`: lógica da Área do Cliente
- `frontend/assets/js/admin-app.js`: lógica do painel interno

### Backend

- `backend/src/routes/`: definição das rotas da API
- `backend/src/controllers/`: entrada das requisições
- `backend/src/services/`: regras de negócio
- `backend/src/models/`: acesso ao banco de dados
- `backend/src/middlewares/`: autenticação, autorização, validação e segurança
- `backend/src/db/pgmigrations/`: migrations versionadas

## 3. Perfis de acesso

Os perfis são controlados no backend. O frontend apenas organiza a interface conforme o papel do usuário.

### `admin`

Responsabilidade principal:

- administrar a plataforma de ponta a ponta

Pode fazer:

- acessar todos os módulos internos
- ver indicadores operacionais e financeiros completos
- listar, criar, editar e remover usuários
- gerenciar clientes, contatos, campanhas, tarefas, materiais, arquivos, cobranças e faturas
- consultar equipe habilitada e diretório interno

### `gestor`

Responsabilidade principal:

- conduzir a operação da própria carteira

Pode fazer:

- acessar dashboard interno, equipe habilitada e diretório interno
- gerenciar clientes, contatos, campanhas, tarefas, materiais, arquivos e cobranças do próprio escopo
- acompanhar relatórios, métricas e analytics
- distribuir atividades e acompanhar execução

Não faz:

- gestão completa de usuários
- gestão de faturas internas

### `designer`

Responsabilidade principal:

- executar entregas e manter a produção organizada

Pode fazer:

- acessar dashboard operacional, kanban e produção
- criar e atualizar tarefas
- criar, editar e remover materiais do escopo
- enviar e remover arquivos do escopo
- consultar campanhas, relatórios e clientes sem dados sensíveis

Não faz:

- gestão de CRM
- cobrança e faturamento
- leitura de métricas financeiras

### `comercial`

Responsabilidade principal:

- gerar receita e manter o pipeline atualizado

Pode fazer:

- acessar dashboard comercial e financeiro
- gerenciar clientes, contatos e campanhas do próprio escopo
- criar e atualizar cobranças e faturas
- consultar tarefas, materiais e relatórios para acompanhar o andamento

Não faz:

- controle de acesso
- gestão técnica de arquivos e produção

### `dev` (Desenvolvimento)

Responsabilidade principal:

- apoiar a operação técnica e a leitura analítica

Pode fazer:

- acessar dashboard técnico, kanban e analytics
- criar e atualizar tarefas
- consultar métricas e integrações técnicas quando aplicável
- usar o diretório interno

Não faz:

- gestão comercial
- gestão de clientes e campanhas
- cobrança, faturamento ou produção

### `client` (Cliente)

Responsabilidade principal:

- acompanhar a operação do próprio cliente

Pode fazer:

- acessar somente a Área do Cliente
- consultar campanhas, relatórios, faturas, cobranças e mensagens do próprio escopo
- aprovar ou solicitar revisão de materiais publicados no portal

Não faz:

- acessar o painel interno
- alterar dados internos da operação

## 4. Endereços principais

Em ambiente local:

- Site: `http://localhost:3000/`
- Área do Cliente: `http://localhost:3000/area-cliente.html`
- Painel interno: `http://localhost:3000/painel-interno.html`
- API: `http://localhost:3000/api`

## 5. Fluxo de autenticação

### Login

O login usa:

- JWT de acesso
- refresh token em cookie
- autorização por perfil
- escopo de tenant no backend

### Recuperação de senha

O usuário pode:

- solicitar redefinição por e-mail
- receber link com expiração
- definir nova senha segura

### Encerramento de sessão

Existem fluxos de:

- logout da sessão atual
- logout global

## 6. O que o site institucional faz

O site institucional não é apenas uma vitrine. Ele também inicia fluxos operacionais.

### Captação de leads

O formulário principal coleta:

- nome
- WhatsApp
- e-mail
- empresa
- serviço de interesse
- mensagem

Esses dados entram na API de contatos para tratamento comercial posterior.

### Acesso aos portais

Pela home, o usuário pode:

- abrir a Área do Cliente
- abrir o painel interno
- iniciar o fluxo de login

## 7. Área do Cliente

### O que o cliente vê

Ao entrar, o portal monta um dashboard com dados do próprio cliente:

- faturamento
- leads consolidados do escopo
- ROI
- campanhas
- relatórios
- materiais em aprovação
- faturas e cobranças
- mensagens

### Ações disponíveis

O cliente pode:

- consultar campanhas ativas e históricas
- abrir relatórios publicados
- aprovar ou pedir revisão de materiais
- acompanhar faturas e cobranças
- trocar mensagens com a equipe

## 8. Painel interno

### Módulos principais

- Visão Geral: resumo operacional e financeiro conforme o perfil
- Kanban: tarefas em andamento por cliente e responsável
- CRM: leads, carteira ativa e conversões
- Campanhas: cadastro e acompanhamento de campanhas
- Produção: materiais, arquivos e aprovações
- Analytics: indicadores consolidados e integrações
- Financeiro: cobranças, faturas e indicadores financeiros
- Acesso: gestão de membros e perfis, exclusivo do `admin`

### Regra prática

- o perfil define quais páginas aparecem
- o backend define o que realmente pode ser lido ou alterado
- o escopo de cliente nunca deve ser controlado apenas pela interface

## 9. Fluxos principais

### Fluxo comercial

1. O lead entra pelo site ou é cadastrado manualmente.
2. O time comercial acompanha o pipeline no CRM.
3. O lead evolui de etapa.
4. O lead é convertido em cliente.
5. O cliente passa a ter campanhas, materiais, relatórios e financeiro no portal.

### Fluxo de produção

1. Cliente e campanha são cadastrados.
2. Tarefas são criadas no kanban.
3. A equipe produz os materiais.
4. Arquivos e entregas são publicados.
5. O cliente aprova ou pede revisão no portal.

### Fluxo financeiro

1. `admin`, `gestor` ou `comercial` geram cobrança conforme o escopo.
2. `admin` ou `comercial` geram e atualizam faturas.
3. O financeiro acompanha retorno por link, boleto ou Pix.
4. Os indicadores são refletidos no painel conforme o perfil.

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
- `POST /api/auth/register`

### Operação

- `GET /api/dashboard`
- `GET /api/users/team`
- `GET /api/users/assignable`
- `GET /api/clients`
- `GET /api/contacts`
- `GET /api/campaigns`
- `GET /api/tasks`
- `GET /api/materials`
- `GET /api/reports`
- `GET /api/messages`
- `GET /api/files`
- `GET /api/metrics`
- `GET /api/integrations`

### Financeiro

- `GET /api/charges`
- `POST /api/charges`
- `PATCH /api/charges/:id`
- `GET /api/invoices`
- `POST /api/invoices`
- `PATCH /api/invoices/:id/status`

### Conta

- `GET /api/account/export`
- `DELETE /api/account`

## 11. Como rodar localmente

1. Copie `.env.example` para `.env`.
2. Ajuste as variáveis necessárias.
3. Instale as dependências:

```bash
npm run install:backend
```

4. Rode as migrations:

```bash
npm run db:migrate
```

5. Se quiser massa de demonstração em ambiente local:

```bash
npm run db:seed
```

6. Suba a aplicação:

```bash
npm run dev
```

## 12. Bootstrap do primeiro administrador

Use o bootstrap seguro quando o ambiente ainda não tiver usuários:

```bash
ALLOW_ADMIN_BOOTSTRAP=true \
BOOTSTRAP_ADMIN_NAME="Admin ONE" \
BOOTSTRAP_ADMIN_EMAIL="admin@one.local" \
BOOTSTRAP_ADMIN_PASSWORD="SenhaForte@123" \
npm run bootstrap:admin
```

## 13. Boas práticas de operação

- Não trate permissão apenas pelo frontend.
- Não publique material para o cliente sem revisar o arquivo final.
- Não deixe lead, tarefa ou campanha sem responsável claro.
- Não gere cobrança ou fatura fora do escopo correto.
- Não use planilhas paralelas para dados que já existem na plataforma.

## 14. Documentos complementares

- [README.md](README.md)
- [PLAYBOOK-ONBOARDING.md](PLAYBOOK-ONBOARDING.md)
- [GUIA-OPERACIONAL-EQUIPE.md](GUIA-OPERACIONAL-EQUIPE.md)
- [PRODUCTION.md](PRODUCTION.md)
- [DEPLOY.md](DEPLOY.md)
- [ENVIRONMENTS.md](ENVIRONMENTS.md)
- [PERMISSIONS-MATRIX.md](PERMISSIONS-MATRIX.md)
- [RUNBOOK-BACKUP-RESTORE.md](RUNBOOK-BACKUP-RESTORE.md)
