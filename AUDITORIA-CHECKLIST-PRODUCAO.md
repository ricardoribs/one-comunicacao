# Auditoria do Checklist de Produção

Legenda:

- `[x]` implementado no código
- `[~]` implementado, mas ainda sujeito a refinamento
- `[ ]` não implementado no código
- `[ext]` depende de operação, infraestrutura ou serviço externo

## Autenticação e sessão

- [x] `bcrypt` com custo 12
- [x] senha forte no backend
- [x] access token de 15 minutos
- [x] refresh token de 7 dias em cookie `HttpOnly`
- [x] rotação de refresh token
- [x] tabela `refresh_tokens`
- [x] logout e logout global com revogação
- [x] bloqueio temporário após tentativas inválidas
- [x] rate limit em login, registro e recuperação de senha
- [x] redefinição de senha com token único e expiração
- [x] verificação de e-mail antes do acesso completo

## Autorização e controle de acesso

- [x] RBAC no backend
- [x] decisão de acesso no backend, e não no frontend
- [x] perfis definidos e documentados
- [x] matriz de permissões documentada
- [x] auditoria de tenant no repositório
- [~] ainda cabe expandir cenários de teste de isolamento por recurso
- [x] controle de acesso com presença e último acesso

## Segurança da API

- [x] `helmet` com cabeçalhos principais
- [x] CORS por allowlist
- [x] rate limiting global
- [x] validação com Zod nos fluxos principais
- [x] sanitização básica de entrada
- [x] queries parametrizadas
- [x] erro genérico em produção
- [x] `X-Powered-By` removido
- [x] proteção contra `hpp`
- [x] limite de body configurado
- [x] redirecionamento para HTTPS em produção

## Banco de dados

- [x] migrations versionadas
- [x] reconciliação de schema no boot
- [x] timeout de query configurado
- [x] pool de conexões configurado
- [x] paginação nos endpoints principais
- [x] modelagem para notificações, calendário, checklist, perfil e múltiplos responsáveis
- [ext] backup, restore e retenção dependem do provedor

## Uploads e arquivos

- [x] validação por magic bytes
- [x] limite por arquivo configurado
- [~] produção depende de provider real configurado
- [ ] varredura antimalware ainda não implementada
- [ ] política de URL privada ainda depende da configuração final do provider

## Variáveis de ambiente e segredos

- [x] `.gitignore` cobrindo `.env`
- [x] segredos fora do código
- [~] rotação de segredos depende de operação
- [ext] 2FA e política formal de acesso dependem da infraestrutura e do time

## Observabilidade

- [x] logger estruturado com Pino
- [x] `request_id` por requisição
- [x] logs com rota, método, status e duração
- [x] health check e readiness
- [ ] Sentry backend com DSN real
- [ ] Sentry frontend com DSN real
- [ext] uptime externo e alertas dependem da operação

## Tratamento de erros

- [x] middleware global de erro
- [x] wrappers assíncronos
- [x] tratamento de `uncaughtException` e `unhandledRejection`
- [~] ainda cabe revisar toda a superfície para mensagens mais uniformes

## Performance

- [x] `compression` habilitado
- [x] carregamento lazy de módulos mais pesados no painel
- [~] ainda cabe evoluir cache e metas formais de latência
- [ ] teste de carga ainda não executado

## Pipeline e deploy

- [x] changelog versionado
- [x] smoke test disponível por script
- [~] integração total do smoke test ao fluxo de deploy ainda depende da esteira final
- [ext] rollback formal e estratégia de zero downtime dependem da infraestrutura

## Qualidade do código

- [x] ESLint
- [x] Prettier
- [x] Husky com `lint-staged`
- [x] `npm audit` sem falhas altas ou críticas nesta rodada
- [~] ainda cabe auditoria fina de dependências e comentários remanescentes

## Testes

- [x] testes de autenticação
- [x] testes de go-live
- [x] testes de tenant
- [~] ainda faltam testes E2E completos
- [ ] teste formal de carga

## Experiência e usabilidade

- [x] notificações internas
- [x] calendário compartilhado
- [x] checklist diário com histórico
- [x] Meu Perfil
- [x] tarefas com múltiplos responsáveis
- [~] ainda cabe revisar refinamentos visuais de alguns módulos

## Documentação

- [x] README
- [x] arquitetura
- [x] changelog
- [x] runbooks
- [x] guia da plataforma
- [x] guia operacional
- [x] onboarding
- [x] matriz de permissões
- [x] checklist de produção
