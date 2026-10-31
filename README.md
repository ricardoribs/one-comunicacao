# ONE Comunicação Integrada

Plataforma web interna da ONE para organizar o relacionamento com clientes e a operação da equipe. Reúne CRM, campanhas, produção, calendário, análises, financeiro e controle de acesso.

## Visão geral

O site público e o painel interno são servidos pela mesma aplicação. A plataforma usa uma API Node.js, banco PostgreSQL e uma interface web em HTML, CSS e JavaScript.

### Principais módulos

- CRM e gestão de clientes;
- campanhas, tarefas e produção;
- calendário e integração com o Google Calendar;
- análises e financeiro;
- autenticação, perfis e controle de acesso.

### Stack

- **Backend:** Node.js, Express, PostgreSQL e `node-pg-migrate`.
- **Frontend:** HTML, CSS e JavaScript, servido pelo Express.
- **Autenticação:** JWT, refresh token em cookie `HttpOnly` e MFA/TOTP para perfis críticos.
- **Uploads:** Cloudinary em produção e armazenamento local em desenvolvimento.
- **Observabilidade:** logs estruturados com Pino e monitoramento com Sentry, conforme o ambiente.
- **Publicação:** serviço web no Render, definido em [`render.yaml`](render.yaml).

## Estrutura do repositório

```text
backend/
  src/                  API, rotas, modelos, serviços e migrações
  scripts/              testes rápidos, validação de ambiente, backup e RLS
  test/                 testes automatizados
frontend/
  assets/               JavaScript, CSS, SVGs, imagens e mídia
  index.html            site público
  painel-interno.html   painel da equipe
docs/
  openapi.yaml          contrato da API HTTP
scripts/
  audit-tenant.js       verifica o escopo de tenant nas consultas
  check-frontend.js     verifica a sintaxe dos arquivos JavaScript
render.yaml             configuração do serviço no Render
```

## Executar localmente

### Pré-requisitos

- Node.js 24 (versão recomendada);
- PostgreSQL 16 ou superior;
- npm.

### Instalação

Na raiz do repositório, execute:

```bash
cp .env.example .env
npm ci --prefix backend
npm run db:migrate --prefix backend
npm run bootstrap:admin --prefix backend
npm run dev --prefix backend
```

Configure no arquivo `.env` as credenciais do PostgreSQL e os demais valores necessários ao ambiente local antes de iniciar a aplicação.

Depois que o servidor iniciar, acesse:

- **Site público:** <http://localhost:3000/>
- **Painel interno:** <http://localhost:3000/app/io>

## Comandos úteis

Execute os comandos a partir da raiz do repositório:

| Objetivo | Comando |
| --- | --- |
| Verificar o JavaScript do frontend | `npm run check:frontend` |
| Executar o lint do backend | `npm run lint --prefix backend` |
| Executar os testes do backend | `npm test --prefix backend` |
| Aplicar migrações do banco | `npm run db:migrate --prefix backend` |
| Verificar o isolamento por tenant (RLS) | `npm run verify:rls --prefix backend` |
| Validar as variáveis de ambiente | `npm run validate:env --prefix backend` |
| Executar o smoke test | `npm run smoke --prefix backend` |

## Publicação no Render

O serviço é configurado pelo blueprint [`render.yaml`](render.yaml), com ambiente de execução Node.js. O frontend e a API são publicados juntos no mesmo serviço.

- **Comando de build:** `npm run install:backend:prod && npm run predeploy:render --prefix backend`
- **Comando de inicialização:** `npm run start`
- **Verificação de saúde:** `/api/health`
- **Publicação automática:** commits na branch conectada ao serviço.

### Variáveis de ambiente

Configure os valores e segredos no painel do Render. Não coloque credenciais reais no repositório.

**Aplicação:**

```env
NODE_ENV=production
APP_BASE_URL=https://one-comunicacao-staging.onrender.com
CORS_ORIGINS=https://one-comunicacao-staging.onrender.com
TRUST_PROXY=1
```

**PostgreSQL:**

```env
DATABASE_HOST=aws-1-us-east-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=<configurado no Render>
DATABASE_PASSWORD=<configurado no Render>
DATABASE_SSL_REQUIRED=true
DATABASE_SSL_CA_FILE=/etc/secrets/prod-ca-2021.crt
```

**Autenticação e criptografia:**

```env
JWT_SECRET=<segredo com pelo menos 64 caracteres>
JWT_EXPIRES_IN=15m
BCRYPT_ROUNDS=12
MFA_ENCRYPTION_KEY=<chave com pelo menos 32 caracteres>
FINANCIAL_ENCRYPTION_KEY=<chave com pelo menos 32 caracteres>
GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY=<chave com pelo menos 32 caracteres, se o Google Calendar estiver ativo>
```

A chave de criptografia do Google Calendar deve ser diferente de `JWT_SECRET` e `FINANCIAL_ENCRYPTION_KEY`. Se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estiverem configurados, configure também `GOOGLE_REDIRECT_URI`.

**Uploads:**

```env
UPLOAD_PROVIDER=cloudinary
UPLOAD_REQUIRE_MALWARE_SCAN=false
MALWARE_SCAN_PROVIDER=none
CLOUDINARY_CLOUD_NAME=<configurado no Render>
CLOUDINARY_API_KEY=<configurado no Render>
CLOUDINARY_API_SECRET=<configurado no Render>
CLOUDINARY_REQUIRE_PRIVATE_UPLOAD=true
```

**E-mail e observabilidade:**

```env
EMAIL_PROVIDER=resend
EMAIL_FROM=<configurado no Render>
RESEND_API_KEY=<configurado no Render>

SENTRY_DSN=<configurado no Render>
SENTRY_REQUIRED=true
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
MAINTENANCE_MODE=false
```

### Verificações da publicação

O teste autenticado de verificação rápida deve ser executado no CI ou após a publicação, não durante o build do Render. Para executá-lo manualmente no PowerShell:

```powershell
$env:SMOKE_BASE_URL = "https://one-comunicacao-staging.onrender.com"
$env:SMOKE_EMAIL = "<usuário interno>"
$env:SMOKE_PASSWORD = "<senha>"
npm run postdeploy:smoke --prefix backend
```

A verificação de RLS precisa de `VERIFY_DATABASE_URL` com permissão para criar um papel temporário e testar o isolamento. Configure essa variável no Render para que a verificação executada durante o build funcione. Use a string de conexão do **Session Pooler** do Supabase, na porta `5432`, com usuário no formato `postgres.<project-ref>`. A conexão direta do Supabase pode aceitar apenas IPv6 e não estar acessível pelo Render.

Para executar a verificação manualmente no PowerShell:

```powershell
$env:VERIFY_DATABASE_URL = "<string de conexão do Session Pooler do Supabase>"
npm run verify:rls --prefix backend
```

### Serviços externos pendentes

- **Verificação de malware:** quando um scanner real estiver disponível, configure `UPLOAD_REQUIRE_MALWARE_SCAN=true`, `MALWARE_SCAN_PROVIDER=clamav`, `CLAMAV_HOST=<host>` e `CLAMAV_PORT=3310`. Enquanto isso, o aplicativo bloqueia tipos de arquivo arriscados quando a verificação está desativada.
- **Webhook de alertas:** quando houver um endpoint disponível, configure `SECURITY_ALERT_WEBHOOK_URL`. Até lá, os alertas de segurança são registrados nos logs estruturados.

## Antes e depois da publicação

Antes de publicar, execute:

```bash
npm run validate:env --prefix backend
npm run lint --prefix backend
npm test --prefix backend
npm run check:frontend
```

Após a publicação, verifique:

- `GET /api/health`;
- `GET /api/ready`;
- login no painel interno;
- fluxos básicos de clientes, campanhas, tarefas e calendário.

## Documentação

- [Arquitetura](ARCHITECTURE.md)
- [Changelog](CHANGELOG.md)
- [Runbook operacional](RUNBOOK.md)
- [Backup e restauração](RUNBOOK-BACKUP-RESTORE.md)
- [Checklist de auditoria de produção](AUDITORIA-CHECKLIST-PRODUCAO.md)
- [Guia da plataforma](GUIA-DA-PLATAFORMA.md)
- [Guia operacional da equipe](GUIA-OPERACIONAL-EQUIPE.md)
- [Playbook de onboarding](PLAYBOOK-ONBOARDING.md)
- [Matriz de permissões](PERMISSIONS-MATRIX.md)
- [Mapeamento de equipe e acessos](MAPEAMENTO-EQUIPE-ACESSOS.md)
- [Contrato da API](docs/openapi.yaml)
