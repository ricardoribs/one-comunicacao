# Checklist Producao Real

## Implementado no codigo

- [x] senha forte no backend com minimo de 12 caracteres, maiuscula, minuscula, numero e simbolo
- [x] bcrypt com custo configurado para 12+
- [x] access token JWT com expiracao padrao de 15 minutos
- [x] refresh token com expiracao padrao de 7 dias em cookie HttpOnly, Secure em producao e SameSite=Strict
- [x] refresh token rotativo com invalidacao do anterior
- [x] tabela `refresh_tokens` para revogacao
- [x] logout invalida refresh token no banco
- [x] rate limiting no login: 5 tentativas por IP em 15 minutos
- [x] bloqueio temporario de conta apos 10 tentativas falhas consecutivas
- [x] RBAC no backend via middleware
- [x] Helmet com CSP, HSTS em producao, X-Frame-Options e X-Content-Type-Options
- [x] CORS por allowlist explicita
- [x] rate limiting global na API
- [x] rate limiting especifico em login, register e upload
- [x] validacao de schema com Zod nos endpoints principais existentes
- [x] sanitizacao basica backend de body/query
- [x] queries parametrizadas
- [x] sem stack trace exposta ao cliente em producao
- [x] liveness em `/health` e `/api/health`
- [x] readiness em `/ready` e `/api/ready` com banco e dependencias criticas
- [x] `x-powered-by` removido
- [x] request ID por requisicao
- [x] logging estruturado com Pino
- [x] graceful shutdown
- [x] limite de upload configuravel
- [x] validacao de tipo de arquivo por magic bytes
- [x] consentimento explicito no formulario do site
- [x] politica de privacidade e termos de uso base publicados
- [x] `.gitignore` cobrindo `.env`, uploads, logs e dependencias
- [x] `NODE_ENV=production` suportado e exigencias de producao validadas no bootstrap
- [x] `npm audit --omit=dev` sem vulnerabilidades conhecidas no backend nesta rodada

## Pendente externo ou operacional

- [ ] refresh token em cookie `Secure` testado em dominio HTTPS publicado
- [ ] revisao completa de 100% dos endpoints para schema validation explicita
- [x] middleware tenant-aware aplicado nas queries sensiveis do sistema
- [x] testes automatizados de isolamento multi-tenant via `verify:rls`
- [ ] backups diarios automaticos confirmados no provedor do banco
- [ ] connection pooling confirmado no banco/provedor
- [ ] Cloudinary ou S3 configurado em producao
- [ ] signed URLs privadas para documentos internos
- [ ] malware scan de uploads
- [ ] Sentry backend configurado com DSN real
- [ ] Sentry frontend configurado com DSN real
- [ ] monitoramento externo de uptime configurado
- [ ] teste de carga com k6 ou Artillery
- [ ] Swagger/OpenAPI expandido para 100% dos endpoints
- [ ] runbook validado pela equipe operacional
- [ ] revisao do historico git para garantir que nenhuma credencial vazou
- [ ] politica de privacidade e termos revisados por juridico
- [ ] processo de exclusao de conta/retencao de dados formalizado
- [ ] contrato de controlador/operador de dados definido com o cliente

## Observacao

Os itens marcados como implementados foram entregues no codigo local. Os itens pendentes exigem servicos externos, juridico, infraestrutura, testes ou revisao operacional antes da publicacao real.
