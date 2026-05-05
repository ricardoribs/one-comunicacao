# Credential Rotation Runbook

## Gatilhos

- suspeita de vazamento;
- desligamento de colaborador com acesso privilegiado;
- expiracao programada;
- incidente `SEV-1` ou `SEV-2`;
- drill trimestral.

## Segredos cobertos

- `JWT_SECRET`
- `MFA_ENCRYPTION_KEY`
- `DATABASE_PASSWORD`
- `DATABASE_SSL_CA_FILE`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ASAAS_API_KEY`
- `SECURITY_ALERT_WEBHOOK_URL`

## Ordem recomendada

1. Preparar novos segredos no cofre do provedor.
2. Atualizar integrações externas para aceitarem o novo valor.
3. Aplicar o novo segredo no ambiente `staging`.
4. Rodar `npm test --prefix backend`.
5. Validar `/api/health/internal` e o fluxo funcional relacionado.
6. Aplicar em `production`.
7. Revogar o segredo antigo.
8. Registrar horario, owner e resultado.

## Procedimentos por segredo

### JWT e MFA

1. Gerar novo `JWT_SECRET` com `openssl rand -hex 64`.
2. Gerar novo `MFA_ENCRYPTION_KEY` com 32 bytes ou mais.
3. Publicar ambos no ambiente.
4. Reiniciar a aplicacao.
5. Executar logout global dos usuarios se o incidente exigir.
6. Validar login, refresh token e MFA.

### Banco

1. Trocar a senha do usuario da aplicacao.
2. Validar o novo CA bundle em `DATABASE_SSL_CA_FILE`.
3. Atualizar `staging`, validar migrations e health interno.
4. Atualizar `production`.
5. Confirmar conexao TLS obrigatoria.

### Email, observabilidade e storage

1. Gerar novas credenciais no provedor.
2. Atualizar variaveis no ambiente.
3. Validar envio de e-mail, captura no Sentry e upload/download privado.

## Drill trimestral

1. Simular rotacao de `JWT_SECRET`, `MFA_ENCRYPTION_KEY` e `SECURITY_ALERT_WEBHOOK_URL` em `staging`.
2. Registrar tempo, erros e acoes manuais.
3. Atualizar este runbook se houver friccao operacional.
