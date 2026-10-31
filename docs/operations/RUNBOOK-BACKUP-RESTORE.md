# Runbook de Backup e Restore

## Objetivo

Garantir que o banco de producao pode ser restaurado em um ambiente separado antes do go-live e em qualquer incidente real.

## Donos

- Dono primario: Engenharia / Operacoes ONE
- Dono de negocio: responsavel pelo go-live
- Executor tecnico: pessoa com acesso ao banco, Render e secrets de producao

## Politica minima

- Backup automatico do provedor habilitado.
- Backup logico validavel antes de cada release candidate.
- Retencao minima: 30 dias para backups logicos e a retencao contratada no provedor.
- Alerta se o backup mais recente tiver mais de 26 horas.
- RPO alvo: 24 horas ate haver janela contratada menor.
- RTO alvo: 2 horas ate haver medicao historica melhor.

## Variaveis necessarias

Para drill real contra producao, use conexao direta do Postgres em ambiente separado:

```bash
DATABASE_URL=postgresql://...
DATABASE_SSL_REQUIRED=true
DATABASE_SSL_CA_FILE=/caminho/do/ca.crt
SMOKE_EMAIL=usuario-de-smoke@...
SMOKE_PASSWORD=...
```

Para Supabase, use a Direct connection, nao o pooler, quando precisar criar role/banco temporario.

## Executar Drill

O script cria um dump do banco fonte, cria um banco temporario `one_restore_drill_*`, restaura o dump, roda migrations/reconciliation, sobe a API contra o banco restaurado e valida `/api/ready` e `/api/health`.

```bash
npm run restore:drill --prefix backend
```

Por padrao, o banco temporario e removido ao final. Para inspecionar manualmente:

```bash
RESTORE_DRILL_KEEP_DB=true npm run restore:drill --prefix backend
```

Evidencias ficam em:

```text
docs/restore-drills/*.json
backups/restore-drills/*.sql
```

## Validacoes Obrigatorias

- O dump foi criado sem erro.
- O restore em banco separado terminou sem erro.
- `npm run db:migrate` rodou no banco restaurado.
- `/api/ready` respondeu `ok`.
- `/api/health` respondeu `ok`.
- Se `SMOKE_EMAIL` e `SMOKE_PASSWORD` estiverem definidos, login e `/api/auth/me` tambem devem passar.
- `calendar_events` precisa conter `client_id` e `visibility`.

## Registrar

Cada drill deve registrar:

- data/hora de execucao
- banco fonte
- banco temporario
- tamanho do backup
- RPO real em segundos
- RTO real em segundos
- retencao configurada
- resultado dos checks
- executor

## Ultimo Drill Registrado

- Ambiente: local, banco separado criado pelo script e removido ao final.
- Evidencia: `docs/restore-drills/2026-08-07T01-10-50-983Z.json`
- Backup logico usado: `backups/restore-drills/one-restore-drill-2026-08-07T01-10-50-983Z.sql` (ignorado pelo git)
- RPO medido: 1.00 segundo
- RTO medido: 21.15 segundos
- Retencao configurada: 30 dias
- Resultado: `/api/ready` e `/api/health` responderam `ok`
- Login de smoke: nao executado porque `SMOKE_EMAIL` e `SMOKE_PASSWORD` nao estavam configurados nesta sessao

Antes do go-live, repetir este mesmo drill com as envs reais de producao e usuario de smoke real.

## Criterio de Go-Live

Go-live so pode ser assinado quando:

- existe evidencia JSON de drill executado contra backup real recente
- RTO medido esta dentro do alvo combinado
- RPO medido esta dentro do alvo combinado
- o banco temporario foi descartado ou transferido para quarentena controlada
- as credenciais usadas no drill nao ficaram em logs ou artefatos

## Incidente Real

1. Declarar incidente e pausar deploys.
2. Identificar o ultimo backup valido.
3. Criar banco separado para restore.
4. Restaurar e validar `/api/ready`, `/api/health` e login.
5. Apontar aplicacao para o banco restaurado somente apos validacao.
6. Registrar RPO/RTO real e causa raiz.
