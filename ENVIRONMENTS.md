# Ambientes

## Regra geral

Desenvolvimento, staging e produção não compartilham:

- banco de dados
- storage
- segredos
- contas de serviço
- credenciais operacionais

## Desenvolvimento

- banco local ou temporário
- uploads e integrações podem usar modo sandbox
- permitido `npm run db:seed`
- foco em velocidade de desenvolvimento

## Staging

- banco isolado de produção
- mesmas migrations de produção
- providers preferencialmente equivalentes aos de produção
- smoke test obrigatório antes de promover
- validação obrigatória de escopo com `npm run audit:tenant --prefix backend`

## Produção

- sem `db:seed`
- bootstrap inicial apenas com `npm run bootstrap:admin`
- segredos injetados pelo provedor
- Sentry obrigatório
- uploads externos obrigatórios
- backup automático obrigatório

## Promoção

1. Build aprovado.
2. Deploy em staging.
3. Smoke test e validações manuais.
4. Promoção para produção.

O artefato aprovado em staging deve ser o mesmo promovido para produção.
