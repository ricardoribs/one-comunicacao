# Runbook

## Banco indisponível

1. Verifique `/api/health`.
2. Confirme conectividade com o PostgreSQL.
3. Revise `DATABASE_URL` e os segredos do banco.
4. Se necessário, execute restore a partir do último backup válido.

## Servidor instável

1. Verifique logs estruturados no provedor.
2. Busque pelo `request_id`.
3. Confirme consumo de CPU, memória e conexões.
4. Reinicie o serviço apenas depois de identificar a causa provável.

## Deploy com falha

1. Revise as variáveis obrigatórias.
2. Confirme `NODE_ENV=production`.
3. Confirme a execução das migrations.
4. Valide `/api/health` e `/api/ready` após o boot.

## Upload com erro

1. Confirme `UPLOAD_PROVIDER`.
2. Se estiver usando Cloudinary, valide as credenciais.
3. Confirme o tipo de arquivo e o limite configurado.

## Autenticação com erro

1. Verifique o cookie de refresh.
2. Confirme `JWT_SECRET`.
3. Revise bloqueio por tentativas e status da conta.
