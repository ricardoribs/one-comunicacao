# Runbook Operacional

Este runbook cobre incidentes do painel ONE em staging/producao no Render e no banco Supabase/Postgres.

## Donos

- Incident commander: responsavel tecnico de plantao.
- Aplicacao/Render: backend owner.
- Banco/backup/restore: database owner.
- Seguranca: security owner.
- Comunicacao com negocio: product owner.

Mantenha os nomes, telefones e canais reais fora do Git. Registre-os no gerenciador de senhas ou no painel interno de operacao.

## Severidade

- SEV1: painel indisponivel, vazamento de dados, login quebrado para todos ou banco indisponivel. Acionar todos os donos.
- SEV2: modulo critico degradado, deploy com rollback necessario ou falha em uploads/cobrancas. Acionar aplicacao e negocio.
- SEV3: bug contornavel, lentidao parcial ou erro visual sem perda de dados. Corrigir em horario comercial.

## Primeiras 2 Horas

1. Declare severidade, horario de inicio e responsavel.
2. Abra logs do Render e filtre por `request_id`, status 5xx, `security_alert` e erros de migration.
3. Valide `GET /api/health` e `GET /api/ready`.
4. Confira o ultimo deploy no Render, o commit SHA e se houve migration recente.
5. Confira Supabase/Postgres: conexoes, latencia, locks e storage.
6. Se houver suspeita de incidente de seguranca, preserve logs e bloqueie rotas/usuarios afetados antes de limpar dados.
7. Comunique impacto e proxima atualizacao ao negocio.
8. Decida: corrigir em hotfix, rollback no Render ou ativar maintenance mode externo.

## Rollback No Render

1. Acesse o servico `one-comunicacao-staging` no Render.
2. Abra `Events` ou `Deploys`.
3. Selecione o ultimo deploy saudavel antes do incidente.
4. Clique em `Rollback` e acompanhe logs ate o boot concluir.
5. Valide `/api/health`, `/api/ready`, login, calendario, Kanban e CRM.
6. Se migrations irreversiveis foram aplicadas, nao faca rollback do app antes de avaliar compatibilidade do schema.
7. Registre commit anterior, commit problemático, horario do rollback e resultado.

## Banco Indisponivel

1. Confirme se o erro e autenticacao, rede, limite de conexoes ou schema.
2. Valide as envs `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_SSL_REQUIRED` e CA SSL no Render sem imprimir valores sensiveis.
3. Se o banco estiver fora, pausar deploys e comunicar SEV1.
4. Para restore, siga `RUNBOOK-BACKUP-RESTORE.md` e execute drill em banco separado.

## Deploy Com Falha

1. Rode localmente: `npm run check:frontend`, `npm run lint --prefix backend`, `npm test --prefix backend`.
2. No Render, valide `validate:env --target=production`, audit de dependencias e logs do `prestart`.
3. Erros de migration devem ser tratados antes de novo deploy.
4. Se o deploy chegou a iniciar e quebrou runtime, use rollback no Render.

## Autenticacao

1. Verifique `JWT_SECRET`, cookie de refresh, MFA e status do usuario.
2. Logout e troca de senha invalidam access tokens via `jti`/`session_version`.
3. Usuarios de bootstrap devem trocar senha no primeiro acesso.
4. Perfil `client` nao deve acessar o painel interno.

## Uploads

1. Confirme `UPLOAD_PROVIDER` e credenciais do Cloudinary.
2. Enquanto ClamAV estiver em backlog, tipos arriscados seguem bloqueados pela aplicacao.
3. Nunca libere executaveis, macros ou arquivos com MIME divergente do conteudo.

## Pos-Incidente

1. Documente causa raiz, impacto, linhas do tempo e acoes corretivas.
2. Abra tarefas para gaps de teste, observabilidade ou runbook.
3. Gere tag de release candidate somente depois de workspace limpo e CI verde.
