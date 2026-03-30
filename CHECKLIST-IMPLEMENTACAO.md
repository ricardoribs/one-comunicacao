# Checklist de Implementação

Este checklist consolida as entregas estruturais que já entraram no projeto e os pontos que ainda dependem de operação, infraestrutura ou publicação.

## Decisões consolidadas

- Perfis internos ativos:
  - `admin`
  - `gestor`
  - `designer`
  - `comercial`
  - `dev`
- O painel interno concentra:
  - visão geral;
  - Kanban;
  - checklist diário;
  - calendário;
  - CRM;
  - campanhas;
  - produção;
  - analytics;
  - financeiro;
  - controle de acesso;
  - notificações;
  - Meu Perfil.
- Tarefas podem ter:
  - um responsável;
  - múltiplos responsáveis;
  - `Todos da equipe`.
- Refresh token é persistido em cookie `HttpOnly`.
- Uploads em produção devem usar Cloudinary.

## Status

### Estrutura e banco

- [x] Migrations versionadas
- [x] Reconciliação de schema no boot
- [x] Tabela de notificações
- [x] Tabelas de calendário e lembretes
- [x] Relação `task_assignees` para múltiplos responsáveis
- [x] Campos de presença e último acesso do usuário
- [x] Campos adicionais de perfil do usuário

### Backend

- [x] Autenticação com access token e refresh token
- [x] RBAC no backend
- [x] Validação com Zod
- [x] Rate limiting em autenticação
- [x] Checklist diário com histórico e limpeza
- [x] Notificações internas
- [x] Calendário da equipe
- [x] Meu Perfil com edição e troca de senha
- [x] Geolocalização por headers de borda e fallback por IP

### Frontend

- [x] Login real via API
- [x] Painel interno conectado à API
- [x] Kanban com drag and drop
- [x] Checklist diário com histórico
- [x] Calendário interno
- [x] CRM e campanhas
- [x] Controle de acesso
- [x] Meu Perfil
- [x] Notificações no topo do painel
- [x] Seleção de múltiplos responsáveis em tarefa

### Segurança e qualidade

- [x] Queries parametrizadas
- [x] Tenant guard
- [x] Validação de upload por magic bytes
- [x] Cabeçalhos de segurança com `helmet`
- [x] CORS por allowlist
- [x] Erros genéricos em produção
- [x] Logs estruturados

### Pendente operacional

- [ ] Validar tudo em produção com dados reais
- [ ] Confirmar backup automático do banco
- [ ] Confirmar DSN real do Sentry
- [ ] Confirmar domínio de e-mail e DNS transacional
- [ ] Executar smoke test formal pós-deploy
