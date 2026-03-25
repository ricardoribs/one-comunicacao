# Runbook de Backup e Restore

## Objetivo

Garantir RPO e RTO claros para o banco de dados antes e depois do go-live.

## Frequencia minima

- backup automatizado diario
- retencao minima de 7 dias
- alerta se o ultimo backup tiver mais de 26 horas

## Antes de abrir producao

1. Confirmar que o provedor do PostgreSQL possui backup automatico habilitado.
2. Registrar onde o backup fica armazenado.
3. Validar quem possui permissao para restaurar.
4. Executar um restore drill real em ambiente separado.

## Restore drill minimo

1. Criar um banco temporario.
2. Restaurar o backup mais recente nesse banco.
3. Rodar:

```bash
npm run db:migrate
```

4. Validar:

- `GET /api/health`
- `GET /api/ready`
- login de administrador
- consulta de clientes e campanhas

5. Medir:

- tempo total de restore
- tempo total ate aplicacao responder pronta

## Metricas para registrar

- RPO real atingido
- RTO real atingido
- data e hora do ultimo drill
- nome de quem executou

## Critério de aceite

- restore concluido sem erro
- aplicacao sobe normalmente apos restore
- RTO e RPO atendem o combinado com o cliente
