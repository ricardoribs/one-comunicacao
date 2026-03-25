# Changelog

## 2026-03-20

- endurecimento da autenticação com access token curto e refresh token rotativo;
- logout real e logout global;
- confirmação de e-mail e reset de senha;
- logging estruturado, request ID, health check e graceful shutdown;
- hardening da API com CORS, Helmet, `hpp`, `compression`, limite de body e validação de `Content-Type`;
- upload com validação por magic bytes;
- CRM e cobranças manuais integrados;
- página de manutenção, 404 customizado e documentos base de LGPD;
- paginação padrão nos principais endpoints de listagem;
- CI básico, ESLint, Prettier e Husky adicionados;
- remoção de `SELECT *` do runtime principal e criação de índices de performance;
- transação na conversão de lead para cliente;
- circuit breaker para e-mail, upload e gateway de pagamento;
- smoke test automatizável para validação pós-deploy.
