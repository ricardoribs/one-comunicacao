# Runbook de Backup e Restore

## Objetivo

Garantir RPO e RTO claros para o banco de dados antes e depois do go-live.

## Frequência mínima

- backup automático diário
- retenção mínima de 7 dias
- alerta se o último backup tiver mais de 26 horas

## Antes de abrir produção

1. Confirmar que o provedor do PostgreSQL possui backup automático habilitado.
2. Registrar onde o backup fica armazenado.
3. Validar quem possui permissão para restaurar.
4. Executar um restore drill real em ambiente separado.

## Restore drill mínimo

1. Criar um banco temporário.
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
- tempo até a aplicação responder como pronta

## Métricas para registrar

- RPO real atingido
- RTO real atingido
- data e hora do último drill
- nome de quem executou

## Critério de aceite

- restore concluído sem erro
- aplicação sobe normalmente após o restore
- RTO e RPO atendem o combinado com o cliente
