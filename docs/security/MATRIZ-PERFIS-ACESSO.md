# Matriz de Perfis e Acessos

Este documento descreve os perfis de acesso disponíveis no painel interno. Use-o como referência para configurar permissões, onboarding e auditoria operacional. Dados de pessoas e contas reais devem ser mantidos fora deste repositório.

Revise esta matriz sempre que os papéis ou permissões do sistema mudarem.

## Objetivo

O sistema trabalha hoje com cinco perfis internos:

- `admin`
- `gestor`
- `designer`
- `comercial`
- `dev`

Como o modelo atual ainda não usa múltiplos papéis por usuário, cada pessoa deve ser enquadrada no perfil que melhor representa sua responsabilidade principal.

## Perfis disponíveis

| Perfil no sistema | Responsabilidades típicas                                                                                             | Módulos principais                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `admin`           | Administração, financeiro, governança de acesso e visão geral da operação                                             | Visão Geral, CRM, Campanhas, Kanban, Calendário, Produção, Analytics, Financeiro, Controle de Acesso e Meu Perfil |
| `gestor`          | Coordenação operacional, carteira de clientes, agenda, prioridades e distribuição de tarefas                         | Visão Geral, CRM, Campanhas, Kanban, Calendário, Produção, Analytics, notificações e Meu Perfil                   |
| `designer`        | Execução de tarefas de design, audiovisual, social media, pesquisa, planejamento e publicação                        | Kanban, Calendário, Produção, Arquivos, Relatórios, notificações e Meu Perfil                                     |
| `comercial`       | Prospecção, atendimento, acompanhamento de oportunidades e relacionamento comercial                                   | CRM, Campanhas, Kanban, Calendário, notificações e Meu Perfil                                                     |
| `dev`             | Suporte técnico e integrações, conforme as permissões implementadas no backend                                         | Acesso limitado aos módulos necessários para a função                                                            |

## Critérios de enquadramento

### `admin`

- controla operação, financeiro e governança de acesso;
- visualiza todos os módulos internos;
- gerencia membros, permissões, clientes, campanhas, tarefas, cobranças, faturas, calendário e notificações.

### `gestor`

- coordena carteira e prioridades do time;
- acompanha CRM, calendário, campanhas, Kanban e produção;
- não administra usuários nem o financeiro administrativo completo.

### `designer`

- executa tarefas operacionais;
- atua em Kanban, Produção, Arquivos, Relatórios, Checklist diário, Calendário e Meu Perfil;
- o tipo de entrega deve ser organizado pelo tipo da tarefa, não pelo papel fixo.

## Regras operacionais

- Usuários internos devem permanecer com `client_id = NULL`, salvo exceção formalmente aprovada.
- O escopo de leitura e operação é definido no backend por papel, cliente, tarefa, vínculo direto e regras de acesso.
- Tarefas podem ter um responsável, múltiplos responsáveis ou ficar como `Todos da equipe`.
- Eventos do calendário são visíveis para toda a equipe interna, mas só `admin` e `gestor` podem criá-los ou editá-los.
- Notificações de tarefa, calendário e operação devem ser usadas como canal padrão dentro do painel.

## Diretrizes para cadastro e revisão

1. Confirmar a identidade da pessoa e o e-mail corporativo por um canal seguro.
2. Aplicar o perfil conforme esta matriz.
3. Garantir `is_active = true`.
4. Manter `client_id = NULL` para membros internos.
5. Validar o primeiro login.
6. Pedir que a pessoa complete `Meu Perfil` logo no primeiro acesso.
7. Confirmar se a visualização de tarefas, calendário e notificações está coerente com o papel atribuído.

## Revisão futura

Se a ONE passar a exigir separação mais fina entre audiovisual, design, social media, operação e suporte técnico, o próximo passo recomendado é evoluir a matriz para capacidades mais granulares, sem depender apenas do campo `role`.
