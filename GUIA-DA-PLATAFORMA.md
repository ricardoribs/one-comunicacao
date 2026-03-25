# Guia da Plataforma ONE

Este documento funciona como manual operacional da plataforma ONE Comunicacao Integrada. A ideia e mostrar, de forma pratica, o que a plataforma faz, quem pode usar cada modulo e como executar as rotinas principais no dia a dia.

## 1. Visao geral

A plataforma e composta por tres frentes principais:

- Site institucional: apresenta a agencia, capta leads e direciona acessos.
- Area do cliente: portal em que cada cliente acompanha campanhas, relatorios, materiais, faturas e mensagens.
- Painel interno: operacao da agencia com dashboard, kanban, CRM, campanhas, producao, trafego, analytics, financeiro e controle de acesso.

## 2. Estrutura da aplicacao

### Frontend

- `frontend/index.html`: home institucional
- `frontend/area-cliente.html`: portal do cliente
- `frontend/painel-interno.html`: painel interno
- `frontend/assets/js/index-app.js`: interacoes da home e handoff de login
- `frontend/assets/js/client-app.js`: logica do portal do cliente
- `frontend/assets/js/admin-app.js`: logica do painel interno

### Backend

- `backend/src/routes/`: rotas da API
- `backend/src/controllers/`: entrada das requisicoes
- `backend/src/services/`: regras de negocio
- `backend/src/models/`: acesso ao banco
- `backend/src/middlewares/`: autenticacao, validacao, seguranca e contexto
- `backend/src/db/pgmigrations/`: migrations versionadas

## 3. Perfis de acesso

Os perfis sao controlados no backend. O frontend apenas adapta a interface; a regra de verdade esta nas rotas e nas capacidades.

### Admin

Pode acessar tudo:

- dashboard interno
- kanban
- CRM
- campanhas
- producao
- trafego pago
- analytics
- financeiro
- controle de acesso
- cadastro, edicao e remocao de usuarios

### Gestor

Pode operar clientes do proprio escopo:

- dashboard interno
- kanban
- CRM
- campanhas
- producao
- trafego pago
- analytics
- cobrancas

Nao possui acesso ao controle administrativo total de usuarios nem ao financeiro interno completo.

### Designer

Foco em entrega e operacao:

- dashboard interno
- kanban
- producao
- leitura de campanhas relacionadas ao proprio escopo
- materiais, relatorios e arquivos do proprio escopo

Nao acessa financeiro, CRM completo, equipe habilitada ou cobrancas.

### Comercial

Foco em pipeline e receita:

- dashboard interno
- CRM
- campanhas
- financeiro
- leads
- conversao de lead em cliente
- cobrancas e faturas

Nao possui controle de acesso administrativo completo.

### Dev

Foco em manutencao e leitura tecnica:

- dashboard interno
- kanban
- analytics

Nao acessa financeiro, CRM comercial nem dados sensiveis desnecessarios.

### Cliente

Acesso somente ao proprio tenant:

- dashboard
- campanhas
- relatorios
- materiais para aprovacao
- faturas
- mensagens

## 4. Enderecos principais

Em ambiente local:

- Site: `http://localhost:3000/`
- Area do cliente: `http://localhost:3000/area-cliente.html`
- Painel interno: `http://localhost:3000/painel-interno.html`
- API: `http://localhost:3000/api`

## 5. Fluxo de autenticacao

### Login

O login usa:

- JWT de acesso
- refresh token em cookie
- RBAC por perfil
- escopo por tenant no backend

### Recuperacao de senha

O usuario pode:

- solicitar redefinicao por e-mail
- receber link com expiracao
- definir nova senha segura

### Encerramento de sessao

Existem fluxos de:

- logout da sessao atual
- logout global

## 6. O que o site institucional faz

O site institucional nao e apenas uma pagina de apresentacao. Ele cumpre funcoes operacionais de entrada.

### Captacao de leads

O formulario principal permite:

- nome
- whatsapp
- e-mail
- empresa
- servico de interesse
- mensagem

Esses dados entram na API de contatos para posterior tratamento comercial.

### Acesso aos portais

Pela home, o usuario pode:

- abrir a area do cliente
- abrir o painel interno
- iniciar o fluxo de login

## 7. Tutorial da area do cliente

## 7.1 Como entrar

1. Acesse `area-cliente.html`.
2. Informe e-mail e senha.
3. Caso tenha esquecido a senha, use a opcao de recuperacao.

## 7.2 O que o cliente ve ao entrar

O portal monta um dashboard com KPI e listas do proprio cliente:

- faturamento
- leads
- ROI
- campanhas

Esses numeros sao filtrados pelo tenant do usuario autenticado.

## 7.3 Campanhas

No modulo de campanhas o cliente consegue:

- ver campanhas ativas e historicas
- identificar canal, cliente e ROI
- abrir detalhes resumidos

## 7.4 Relatorios

No modulo de relatorios o cliente consegue:

- visualizar relatorios disponiveis
- abrir arquivos e links publicados
- consultar resumo e periodo do relatorio

## 7.5 Materiais para aprovacao

No modulo de materiais o cliente consegue:

- ver entregas pendentes
- aprovar materiais
- solicitar revisao
- abrir o material vinculado

Esse fluxo atualiza o status do material na API.

## 7.6 Faturas

No modulo de faturas o cliente consegue:

- listar valores
- ver vencimento
- ver status da fatura
- abrir o detalhe basico

## 7.7 Mensagens

O cliente pode:

- ler o historico de mensagens do proprio escopo
- escrever novas mensagens
- acompanhar data de envio

## 8. Tutorial do painel interno

## 8.1 Como entrar

1. Acesse `painel-interno.html`.
2. Informe credenciais internas.
3. Usuarios com perfil `client` sao bloqueados neste painel.

## 8.2 Visao geral

A home interna consolida indicadores e blocos rapidos de operacao.

Dependendo do perfil, podem aparecer:

- clientes ativos
- campanhas
- tarefas abertas
- faturamento
- pipeline resumido
- equipe habilitada
- relatorios recentes
- blocos operacionais e financeiros

## 8.3 Kanban

O modulo de kanban serve para gestao de tarefas em tempo real.

O usuario pode:

- filtrar por cliente
- ver backlog, a fazer, em progresso e concluido
- criar tarefa
- editar tarefa
- remover tarefa, quando o perfil permitir

Campos principais da tarefa:

- titulo
- cliente
- responsavel
- status
- coluna
- prazo
- descricao

## 8.4 CRM / Leads

O CRM concentra pipeline e base ativa.

O usuario pode:

- cadastrar lead
- editar lead
- consultar pipeline
- ver clientes ativos
- consultar historico
- converter lead em cliente

Campos principais do lead:

- nome
- empresa
- servico
- telefone
- whatsapp
- e-mail
- origem
- owner
- responsavel
- etapa
- valor estimado
- endereco
- observacoes

## 8.5 Clientes

No fluxo interno o cadastro de cliente permite:

- criar cliente
- editar cliente
- associar gestor
- definir plano
- registrar MRR
- registrar segmento
- cadastrar dados de contato e faturamento
- registrar endereco completo
- adicionar observacoes

## 8.6 Campanhas

O modulo de campanhas permite:

- criar campanha
- editar campanha
- remover campanha, quando permitido
- associar a um cliente
- definir canal
- publico
- objetivo
- orcamento
- data de inicio

## 8.7 Producao

O modulo de producao e voltado para design, copy e landing pages.

O usuario pode:

- cadastrar entrega
- editar entrega
- anexar arquivo
- associar entrega a cliente e campanha
- alterar status do material
- remover entrega, quando permitido

Campos principais da entrega:

- titulo
- cliente
- campanha
- status
- arquivo

## 8.8 Trafego pago

O modulo de trafego consolida campanhas por canal.

O usuario pode:

- acompanhar campanhas por plataforma
- comparar budget
- acompanhar distribuicao por cliente
- sincronizar a leitura do painel

## 8.9 Analytics

O modulo de analytics entrega visao consolidada de performance.

O usuario pode:

- filtrar por cliente
- filtrar por periodo
- ver receita
- ver impressoes
- ver CTR medio
- ver conversao
- consultar tabela detalhada por campanha e cliente

## 8.10 Financeiro

O modulo financeiro interno reune receita, cobrancas, faturas e custo operacional.

O usuario pode:

- ver receita bruta
- ver valor recebido
- ver cobrancas geradas
- ver lucro liquido
- acompanhar margem por cliente
- abrir cobranca por cliente
- exportar CSV financeiro
- abrir links de pagamento
- abrir boleto
- copiar Pix
- marcar cobranca como recebida ou pendente
- marcar fatura como paga ou em aberto

Tambem e possivel:

- criar fatura
- criar cobranca

Campos principais da fatura:

- cliente
- valor
- status
- vencimento

Campos principais da cobranca:

- cliente
- lead vinculado
- metodo
- valor
- vencimento
- referencia externa
- descricao

## 8.11 Controle de acesso

Este modulo e exclusivo do admin.

O admin pode:

- listar membros
- criar novo membro
- editar membro
- remover membro, quando permitido
- consultar perfis e permissoes

Campos principais do membro:

- nome
- e-mail
- perfil
- cliente vinculado
- senha

## 9. Gestao de arquivos e materiais

O backend possui modulos separados para:

- arquivos
- materiais
- relatorios

Fluxos principais:

- upload de arquivo
- vinculo do arquivo a cliente
- publicacao do material
- aprovacao ou revisao pelo cliente
- leitura de relatorios por escopo

## 10. Recursos de conta

Existem duas acoes de conta no backend:

- `GET /api/account/export`: exporta dados do usuario conforme o escopo permitido
- `DELETE /api/account`: anonimiza a conta e encerra a sessao

Esses fluxos sao importantes para compliance e privacidade.

## 11. API principal

### Autenticacao

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/verify-email`
- `GET /api/auth/me`
- `POST /api/auth/register` (admin)

### Dashboard e operacao

- `GET /api/dashboard`
- `GET /api/clients`
- `POST /api/clients`
- `GET /api/contacts`
- `POST /api/contacts`
- `POST /api/contacts/:id/convert`
- `GET /api/campaigns`
- `POST /api/campaigns`
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/materials`
- `POST /api/materials`
- `PATCH /api/materials/:id/status`
- `GET /api/reports`
- `GET /api/messages`
- `POST /api/messages`

### Financeiro

- `GET /api/charges`
- `POST /api/charges`
- `PATCH /api/charges/:id`
- `GET /api/invoices`
- `POST /api/invoices`
- `PATCH /api/invoices/:id/status`

### Arquivos e metricas

- `GET /api/files`
- `POST /api/files`
- `DELETE /api/files/:id`
- `GET /api/metrics`

### Conta

- `GET /api/account/export`
- `DELETE /api/account`

## 12. Como rodar localmente

1. Copie `.env.example` para `.env`.
2. Ajuste as variaveis necessarias.
3. Instale dependencias:

```bash
npm run install:backend
```

4. Rode as migrations:

```bash
npm run db:migrate
```

5. Se quiser massa demo apenas em ambiente local:

```bash
npm run db:seed
```

6. Suba a aplicacao:

```bash
npm run dev
```

## 13. Como criar o primeiro admin com seguranca

Use o bootstrap seguro quando o ambiente nao tiver usuarios:

```bash
ALLOW_ADMIN_BOOTSTRAP=true \
BOOTSTRAP_ADMIN_NAME="Demo Admin" \
BOOTSTRAP_ADMIN_EMAIL="admin@one.local" \
BOOTSTRAP_ADMIN_PASSWORD="SenhaForte@123" \
npm run bootstrap:admin
```

## 14. Checks tecnicos importantes

### Liveness

- `GET /api/health`

Confirma que o processo esta vivo.

### Readiness

- `GET /api/ready`

Confirma prontidao da aplicacao e das dependencias verificadas.

## 15. Fluxos operacionais recomendados

### Fluxo comercial

1. Lead entra pelo site ou e cadastrado manualmente.
2. Comercial acompanha no CRM.
3. Lead evolui de etapa.
4. Lead e convertido em cliente.
5. Cliente entra no painel e passa a ter campanhas, materiais, relatorios e financeiro.

### Fluxo de producao

1. Cliente e campanha sao cadastrados.
2. Tarefas sao criadas no kanban.
3. Equipe produz materiais.
4. Arquivos e entregas sao publicados.
5. Cliente aprova ou pede revisao no portal.

### Fluxo financeiro

1. Comercial ou admin gera cobranca.
2. Financeiro acompanha link, boleto ou Pix.
3. Fatura e atualizada.
4. Receita e margem aparecem no painel financeiro.

## 16. Documentos complementares

- [README.md](README.md)
- [PLAYBOOK-ONBOARDING.md](PLAYBOOK-ONBOARDING.md)
- [GUIA-OPERACIONAL-EQUIPE.md](GUIA-OPERACIONAL-EQUIPE.md)
- [PRODUCTION.md](PRODUCTION.md)
- [DEPLOY.md](DEPLOY.md)
- [ENVIRONMENTS.md](ENVIRONMENTS.md)
- [PERMISSIONS-MATRIX.md](PERMISSIONS-MATRIX.md)
- [RUNBOOK-BACKUP-RESTORE.md](RUNBOOK-BACKUP-RESTORE.md)

## 17. Resumo executivo

Em termos práticos, a plataforma ja suporta:

- captacao de leads
- autenticacao segura
- portal do cliente
- operacao interna por perfil
- CRM e conversao comercial
- campanhas e producao
- analytics
- financeiro
- cobrancas e faturas
- gestao de usuarios
- exportacao e exclusao de conta

Se a equipe precisar de um material unico para onboarding, treinamento e operacao diaria, este documento deve ser o ponto de partida.
