# Produção

Este documento consolida o checklist operacional e técnico para publicar a plataforma ONE com backend Express, PostgreSQL, uploads protegidos, autenticação com refresh token, notificações, calendário interno e observabilidade.

## Objetivo

Garantir que a publicação em produção ocorra com:

- segredos fora do repositório;
- banco validado e com migrations aplicadas;
- autenticação e autorização auditadas;
- uploads e e-mails configurados;
- monitoramento, logs e backup revisados.

## Segredos e variáveis obrigatórias

Gere o segredo JWT fora do repositório:

```bash
openssl rand -hex 64
```

Configuração mínima esperada:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
DATABASE_HOST=aws-1-us-east-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=postgres.<project_ref>
DATABASE_PASSWORD=<senha do banco>
DATABASE_SSL_CA_FILE=/etc/secrets/prod-ca-2021.crt
DB_POOL_MAX=8
JWT_SECRET=<resultado do openssl rand -hex 64>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
APP_BASE_URL=https://seu-dominio.onrender.com
CORS_ORIGINS=https://seu-dominio.onrender.com,https://www.seu-dominio.com
GEO_LOOKUP_ENABLED=true
GEO_LOOKUP_TIMEOUT_MS=1200
GEO_LOOKUP_CACHE_TTL_MS=21600000
GEO_LOOKUP_URL_TEMPLATE=https://ipwho.is/{ip}?fields=success,country_code,country,region,city
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=no-reply@seudominio.com
SENTRY_DSN=...
SENTRY_ENVIRONMENT=production
PAYMENT_PROVIDER=manual
MAINTENANCE_MODE=false
```

Em produção, não use arquivos `.env` versionados. Todas as variáveis devem ser injetadas pelo provedor.

## Banco, migrations e bootstrap

1. Usar um PostgreSQL dedicado para `production`.
2. Manter outro PostgreSQL dedicado para `staging`.
3. Aplicar migrations:

```bash
npm run db:migrate
```

4. Validar o tenant guard:

```bash
npm run audit:tenant --prefix backend
```

5. Criar o primeiro administrador apenas se a base ainda estiver vazia:

```bash
ALLOW_ADMIN_BOOTSTRAP=true \
BOOTSTRAP_ADMIN_NAME="Demo Admin" \
BOOTSTRAP_ADMIN_EMAIL="admin@seudominio.com" \
BOOTSTRAP_ADMIN_PASSWORD="SenhaForte@123" \
npm run bootstrap:admin
```

6. Não rodar `db:seed` em produção.

## Render

Arquivo de referência: [render.yaml](/c:/Users/ricar/Downloads/Projeto%20One/render.yaml)

Configuração esperada:

- plano `starter` ou superior;
- Build Command: `npm run install:backend:prod`;
- Start Command: `npm run start`;
- Health Check Path: `/api/health`;
- `JWT_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `SENTRY_DSN` e `CLOUDINARY_*` como segredos;
- certificado CA do banco adicionado como Secret File no Render, com `DATABASE_SSL_CA_FILE=/etc/secrets/prod-ca-2021.crt`.

## Geolocalização de acesso e presença

O painel interno exibe:

- último acesso real;
- presença com `Online` baseada em atividade recente;
- localização de acesso quando disponível.

Fluxo recomendado:

1. Colocar o domínio atrás do Cloudflare.
2. Ativar `IP Geolocation`.
3. Ativar `Add visitor location headers`.

Headers aceitos:

- `cf-ipcity`
- `cf-region`
- `cf-ipcountry`
- `x-vercel-ip-city`
- `x-vercel-ip-country-region`
- `x-vercel-ip-country`

Comportamento do backend:

- usa headers de borda quando existirem;
- faz fallback por IP quando os headers não vierem;
- usa timeout curto e cache;
- ignora IP local e IP privado.

Regras operacionais:

- não confiar em header enviado pelo frontend;
- preferir CDN ou proxy confiável;
- quando a geolocalização não estiver disponível, o painel mostra `Localização não identificada`.

## E-mail transacional

Use Resend com domínio próprio.

Checklist:

- SPF publicado;
- DKIM publicado;
- DMARC publicado;
- domínio validado no Resend;
- `EMAIL_FROM` apontando para o domínio validado.

## Uploads

Configuração esperada:

- `UPLOAD_PROVIDER=cloudinary`;
- arquivos privados servidos por URL autenticada ou assinada;
- uploads locais apenas em desenvolvimento;
- validação por magic bytes ativa;
- tamanho máximo de upload configurado.

## Segurança obrigatória

- `helmet` ativo com CSP e HSTS em produção;
- CORS por allowlist explícita;
- refresh token em cookie `HttpOnly`;
- rate limiting global e de autenticação;
- queries parametrizadas;
- logs sem stack trace exposta ao cliente;
- `X-Powered-By` desativado;
- `request_id` por requisição;
- `npm audit --omit=dev --prefix backend` sem falhas altas ou críticas;
- `npm run audit:tenant --prefix backend` com zero violações.

## Operação mínima antes do go-live

- validar login e refresh;
- validar criação e edição de cliente;
- validar criação de campanha;
- validar Kanban com múltiplos responsáveis;
- validar checklist diário e limpeza do histórico;
- validar notificações;
- validar calendário e lembretes;
- validar uploads;
- validar logout.

## Observabilidade

- Sentry configurado com DSN real;
- logs estruturados com Pino;
- monitoramento externo de uptime;
- revisão dos logs de boot e health check;
- rotina documentada em [RUNBOOK.md](/c:/Users/ricar/Downloads/Projeto%20One/RUNBOOK.md).

## Backup e restauração

- confirmar backup diário automático no provedor do banco;
- executar restore de teste periodicamente;
- registrar responsável pela operação;
- seguir o procedimento descrito em [RUNBOOK-BACKUP-RESTORE.md](/c:/Users/ricar/Downloads/Projeto%20One/RUNBOOK-BACKUP-RESTORE.md).

## Go-live

Antes de liberar o uso para a equipe:

1. Confirmar variáveis de ambiente.
2. Confirmar migrations e reconciliação de schema.
3. Confirmar `audit:tenant`.
4. Validar o primeiro login.
5. Revisar calendário, notificações e presença.
6. Revisar checklist, Kanban, CRM e campanhas.
7. Confirmar backup, e-mail e upload.
8. Registrar a data do go-live no changelog.

## Reforcos de seguranca obrigatorios

Variaveis adicionais para o go-live seguro:

```env
TRUST_PROXY=1
JWT_ALGORITHM=HS256
DATABASE_SSL_REQUIRED=true
SENTRY_REQUIRED=true
MFA_REQUIRED_ROLES=admin,gestor,comercial
MFA_ENCRYPTION_KEY=<segredo com 32 bytes ou mais>
UPLOAD_REQUIRE_MALWARE_SCAN=true
MALWARE_SCAN_PROVIDER=clamav
CLAMAV_HOST=<host do clamd>
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=10000
SECURITY_ALERT_WEBHOOK_URL=<webhook externo para pager ou triagem>
SECURITY_ALERT_TIMEOUT_MS=5000
CLOUDINARY_REQUIRE_PRIVATE_UPLOAD=true
```

Controles adicionais:

- `TRUST_PROXY` deve refletir a topologia real da borda. Use `1` para acesso direto via `*.onrender.com` e altere para `2` somente quando a topologia virar `Cloudflare -> Render`.
- `DATABASE_SSL_REQUIRED=true` e `DATABASE_SSL_CA_FILE` tornam o boot fail-closed para conexoes sem TLS validado.
- perfis `admin`, `gestor` e `comercial` entram em MFA TOTP obrigatorio no primeiro login.
- uploads so devem subir para o provider depois do scan antimalware limpo.
- com `UPLOAD_REQUIRE_MALWARE_SCAN=true`, o boot deve falhar se `MALWARE_SCAN_PROVIDER` ou `CLAMAV_HOST` nao estiverem definidos corretamente.
- `SECURITY_ALERT_WEBHOOK_URL` deve apontar para o canal ou pager operacional do time.

Referencias operacionais:

- [IR-PLAN.md](/c:/Users/ricar/Downloads/Projeto%20One/IR-PLAN.md)
- [RUNBOOK-CREDENTIAL-ROTATION.md](/c:/Users/ricar/Downloads/Projeto%20One/RUNBOOK-CREDENTIAL-ROTATION.md)
