# Changelog

## 2026-03-30

- criação da página `Meu Perfil` no painel interno, com edição de dados, avatar, telefone e troca de senha;
- inclusão do calendário da equipe com lembretes automáticos e notificações no sino do painel;
- suporte a múltiplos responsáveis por tarefa;
- melhoria do Kanban com drag and drop, checklist diário e histórico com limpeza manual;
- endurecimento de presença, último acesso e geolocalização no controle de acesso;
- revisão visual e textual do painel interno, com padronização em PT-BR.

## 2026-03-20

- endurecimento da autenticação com access token curto e refresh token rotativo;
- logout local e logout global com revogação real;
- confirmação de e-mail e redefinição de senha;
- logs estruturados com `request_id`, health check e graceful shutdown;
- hardening da API com CORS, Helmet, `hpp`, `compression`, limite de body e validação de `Content-Type`;
- upload com validação por magic bytes;
- CRM e cobranças manuais integrados;
- página de manutenção, 404 customizado e documentos-base de conformidade;
- paginação padrão nos principais endpoints de listagem;
- smoke test automatizado para validação pós-deploy.
