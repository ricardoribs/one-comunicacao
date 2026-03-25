# Runbook Basico

## Banco indisponivel

1. Verifique `/health`
2. Confirme conectividade e status do provedor PostgreSQL
3. Revise `DATABASE_URL`
4. Se necessario, restaure o ultimo backup valido

## Servidor travando

1. Verifique logs estruturados no provedor
2. Busque por `request_id`
3. Confirme memoria e CPU do container
4. Reinicie o servico se necessario

## Deploy falhou

1. Revise variaveis de ambiente obrigatorias
2. Confirme `NODE_ENV=production`
3. Confirme que migrations rodaram
4. Verifique `/health` apos subir

## Uploads falhando

1. Confirme `UPLOAD_PROVIDER`
2. Se `cloudinary`, valide credenciais
3. Confirme tipo de arquivo e limite de 10 MB

## Autenticacao falhando

1. Verifique cookie de refresh
2. Confirme `JWT_SECRET`
3. Revise se a conta foi bloqueada por excesso de tentativas
