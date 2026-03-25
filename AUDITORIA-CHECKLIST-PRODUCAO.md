# Auditoria do Checklist de Producao

Legenda:

- `[x]` implementado no codigo
- `[~]` parcial / depende de refino adicional
- `[ ]` nao implementado no codigo
- `[ext]` depende de servico externo, processo operacional ou decisao juridica

## Autenticacao e sessao

- [x] bcrypt com custo 12 em todas as senhas novas
- [x] senha minima forte no backend
- [x] JWT access token de 15 minutos
- [x] refresh token 7 dias em cookie HttpOnly + Secure em producao + SameSite=Strict
- [x] refresh token rotativo
- [x] tabela `refresh_tokens`
- [x] logout revoga refresh token no banco
- [x] logout de todos os dispositivos
- [x] bloqueio temporario apos 10 tentativas
- [x] rate limit no `/auth/login`
- [x] rate limit no `/auth/register`
- [x] rate limit no `/auth/forgot-password`
- [x] reset de senha com token unico e expiracao
- [x] email de confirmacao antes do login
- [x] forgot-password com resposta generica

## Autorizacao e controle de acesso

- [x] RBAC no backend
- [x] nenhuma decisao de acesso baseada no frontend
- [x] middleware de autenticacao separado do de autorizacao
- [x] perfis definidos e documentados
- [x] matriz de permissoes documentada
- [~] tenant injetado em `req.tenant`, mas ainda nao ha camada automatica universal nas queries
- [~] boa parte das queries ja filtra por escopo; falta auditoria 100% formal e refino universal
- [~] testes automatizados de isolamento por tenant iniciados; ainda faltam mais cenarios por recurso
- [x] admin ve todos, gestor ve atribuidos, cliente ve os proprios dados no desenho atual
- [x] logs de acesso negado

## Seguranca da API

- [x] Helmet com CSP, HSTS em producao, frameguard, noSniff e referrer policy
- [x] CORS por whitelist
- [x] rate limiting global 100 req/min por IP
- [x] rate limiting por usuario autenticado 200 req/min
- [~] validacao Zod existe na maior parte dos endpoints; falta auditoria final de 100%
- [x] sanitizacao basica contra XSS no backend e consentimento no frontend
- [x] queries parametrizadas na base atual
- [x] erro generico em producao
- [x] `X-Powered-By` removido
- [~] headers de versao de dependencias nao sao expostos pelo Express, mas dependem tambem do provedor/CDN
- [x] protecao contra parameter pollution com `hpp`
- [x] `Content-Type` validado
- [x] body limit configurado para JSON/urlencoded
- [x] HTTPS redirecionado em producao

## Banco de dados

- [x] indices adicionais principais criados para colunas de filtro/ordenacao mais usadas
- [ ] indice composto `(tenant_id, id)` nao existe como padrao porque o modelo nao usa `tenant_id` unico em todas as tabelas
- [x] connection pooling basico configurado no `pg`
- [x] timeout de query configurado
- [x] paginacao padrao com `limit/offset` aplicada nos principais endpoints de listagem
- [x] `SELECT *` removido do runtime principal; remanesce apenas em seed
- [~] transactions cobrem a conversao lead -> cliente; ainda faltam outros fluxos multi-tabela mais complexos
- [x] migrations versionadas
- [ext] migrations em staging antes de producao dependem do processo de deploy
- [ext] backup automatico, restore, retencao e usuario de banco minimo dependem do provedor
- [ext] RLS no Supabase depende da camada SQL/infra do ambiente real

## Uploads e arquivos

- [x] validacao por magic bytes
- [~] whitelist existe, mas ainda deve ser refinada conforme necessidade final de negocio
- [x] limite por arquivo configuravel
- [ ] limite por usuario/mes ainda nao existe
- [~] Cloudinary/S3 suportado parcialmente; producao ainda depende de configurar provider real
- [ ] signed URLs privadas ainda nao implementadas
- [ext] malware scan depende do provedor/plano
- [ ] revogacao de acesso a arquivo por rejeicao/remoção ainda nao cobre URLs externas persistentes

## Variaveis de ambiente e secrets

- [x] arquivos de ambiente separados por ambiente
- [x] `.gitignore` cobrindo `.env`
- [~] historico do git ainda precisa ser varrido externamente
- [ext] secrets no Render/Vercel, rotacao, 2FA e higiene operacional dependem do time/infra
- [~] `JWT_SECRET` forte exigido em producao, mas o valor real ainda depende de configuracao correta

## Observabilidade e logs

- [x] logger estruturado com Pino
- [x] logs incluem request_id, rota, metodo, status e duration via `pino-http`
- [x] request ID unico
- [x] dados sensiveis redigidos
- [x] niveis de log separados
- [ ] Sentry backend nao configurado
- [ ] Sentry frontend nao configurado
- [ext] alertas, uptime monitor e status page dependem de servicos externos
- [x] `/health` com servidor e banco
- [ext] retencao de logs depende da plataforma de deploy/log sink

## Tratamento de erros

- [x] middleware global de erro
- [x] wrapper async nos controllers
- [x] `uncaughtException` e `unhandledRejection`
- [~] codigos HTTP corretos estao razoavelmente cobertos, mas falta auditoria formal endpoint a endpoint
- [~] frontend tem mensagens humanizadas em muitos fluxos, mas falta revisar 100%
- [x] retry com backoff em chamadas de email
- [~] circuit breaker implementado para email, upload e gateway de pagamento; ainda faltam outras integracoes futuras
- [x] timeout em email e gateway de pagamento

## Performance

- [x] compression habilitado
- [ ] cache de baixa variacao ainda nao existe
- [ ] lazy loading estruturado no frontend nao existe
- [~] imagens e midias dependem do HTML existente; nao houve auditoria completa de assets
- [ ] bundle analyzer nao se aplica diretamente ao frontend atual em HTML puro
- [ ] teste de carga ainda nao implementado
- [ ] metas de latencia e `EXPLAIN ANALYZE` ainda nao auditadas

## Pipeline e deploy

- [~] CI basico existe no repositório; branch protection e PR obrigatorio dependem do provedor git
- [ext] staging separado, deploy sem downtime e rollback dependem da infraestrutura real
- [x] changelog inicial versionado
- [~] smoke test automatizavel existe por script; ainda falta plugar no deploy real

## Resiliencia

- [x] graceful shutdown
- [x] pagina de manutencao estatica existe
- [ext] RTO, RPO, plano de recuperacao, dependencia de terceiros e SSL automatico dependem da operacao/infra

## Qualidade do codigo

- [x] ESLint configurado
- [x] Prettier configurado
- [x] Husky + lint-staged configurados
- [ ] TypeScript/JSDoc estruturado ainda nao cobre controllers/services/models
- [~] `TODO` critico e codigo comentado ainda precisam de varredura final
- [x] `npm audit` sem high/critical nesta rodada
- [~] dependencias desnecessarias e manutencao ativa ainda precisam de auditoria fina

## Testes

- [x] testes minimos de autenticacao adicionados
- [~] testes de autorizacao por perfil iniciados
- [~] testes automatizados de isolamento de tenant iniciados
- [ ] E2E completo de fluxos criticos ainda nao existe
- [ ] testes formais de validacao e rate limit ainda nao existem
- [ ] teste de carga ainda nao existe
- [ ] CI com testes em todo PR ainda nao existe

## Emails transacionais

- [~] servico de email abstraido com suporte a Resend e fallback em log
- [ext] SPF, DKIM, DMARC, dominio verificado e testes Gmail/Outlook dependem do DNS/provedor
- [~] templates basicos de confirmacao e reset implementados
- [x] envio de email nao bloqueia toda a API alem do fluxo chamado e tem retry
- [ ] logs de entrega ainda sao basicos; nao ha webhook/status persistido

## Experiencia e usabilidade

- [~] loading/feedback existe em varias acoes, mas nao em 100%
- [~] confirmacoes destrutivas ainda precisam ser padronizadas
- [x] sessao expirada redireciona com mensagem
- [ ] onboarding de primeiro acesso ainda nao existe
- [x] 404 personalizado do frontend existe

## Legal e LGPD

- [x] politica de privacidade publicada
- [x] termos de uso publicados
- [x] checkbox de consentimento nao pre-marcado
- [x] endpoint de exclusao/anonimizacao de conta existe
- [x] endpoint de exportacao/relatorio de dados do titular existe
- [ext] DPA, DPO e politicas formais dependem de juridico/cliente

## Documentacao

- [x] README
- [~] OpenAPI inicial existe, mas ainda nao cobre 100% dos endpoints
- [x] arquitetura textual documentada
- [x] runbook basico
- [ ] onboarding de dev ainda nao esta formalizado
- [x] changelog inicial presente
- [ext] registro formal de credenciais com recibo depende do processo com o cliente

## Gestao de incidentes e SLA

- [ext] SLA, canal oficial, post-mortem, status page e contatos de emergencia dependem de contrato e operacao
