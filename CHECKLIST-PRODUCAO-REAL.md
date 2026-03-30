# Checklist de Produção Real

## Implementado no código

- [x] senha forte no backend, com no mínimo 12 caracteres, letra maiúscula, letra minúscula, número e símbolo
- [x] `bcrypt` com custo configurado para `12`
- [x] access token JWT com expiração padrão de 15 minutos
- [x] refresh token com expiração padrão de 7 dias em cookie `HttpOnly`, `Secure` em produção e `SameSite=Strict`
- [x] refresh token rotativo com revogação do anterior
- [x] tabela `refresh_tokens`
- [x] logout e logout global com revogação em banco
- [x] rate limiting em login, registro, recuperação de senha e upload
- [x] bloqueio temporário de conta após tentativas inválidas em sequência
- [x] RBAC no backend
- [x] checklist diário com histórico e limpeza
- [x] notificações internas
- [x] calendário com lembretes automáticos
- [x] tarefas com múltiplos responsáveis
- [x] Meu Perfil com edição e troca de senha
- [x] presença e último acesso com suporte a localização
- [x] `helmet` com CSP, HSTS em produção, `X-Frame-Options` e `X-Content-Type-Options`
- [x] CORS por allowlist explícita
- [x] queries parametrizadas
- [x] request ID por requisição
- [x] logging estruturado com Pino
- [x] graceful shutdown
- [x] limite de upload configurável
- [x] validação de arquivo por magic bytes
- [x] política de privacidade e termos de uso publicados
- [x] `npm audit --omit=dev --prefix backend` sem falhas altas ou críticas nesta rodada

## Pendente externo ou operacional

- [ ] validar refresh token em domínio HTTPS publicado
- [ ] confirmar backup diário automático do banco
- [ ] confirmar restore de teste
- [ ] configurar Cloudinary em produção
- [ ] confirmar Sentry backend com DSN real
- [ ] confirmar Sentry frontend com DSN real
- [ ] configurar monitoramento externo de uptime
- [ ] executar teste de carga
- [ ] revisar histórico do Git para vazamento de segredos
- [ ] revisar política de privacidade e termos com apoio jurídico
- [ ] formalizar retenção e exclusão de dados

## Observação

Os itens marcados como implementados já existem no código. Os itens pendentes dependem de infraestrutura, operação, jurídico, integração externa ou validação pós-deploy.
