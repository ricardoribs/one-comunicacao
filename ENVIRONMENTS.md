# Ambientes

## Regra

Dev, staging e producao nao compartilham banco, storage, contas de servico ou segredos.

## Dev

- banco local ou temporario
- uploads e integracoes podem usar sandbox
- permitido `db:seed`

## Staging

- banco isolado de producao
- mesmas migrations de producao
- mesmos providers, preferencialmente em modo sandbox
- obrigatorio validar `npm run verify:rls`
- obrigatorio executar smoke test antes de promover

## Producao

- sem `db:seed`
- bootstrap inicial apenas com `npm run bootstrap:admin`
- segredos injetados pelo provedor
- Sentry obrigatorio
- uploads externos obrigatorios
- backup automatico obrigatorio

## Promocao

1. build aprovado no CI
2. smoke em staging
3. validacao de readiness
4. promocao manual para producao

O artefato aprovado em staging deve ser o mesmo promovido para producao.
