# Mapeamento da Equipe e Acessos

Este documento registra como a equipe da ONE está mapeada dentro do painel interno. Ele serve como referência para cadastro, revisão de acesso, onboarding e auditoria operacional.

Data de referência: `2026-03-30`

## Objetivo

O sistema trabalha hoje com cinco perfis internos:

- `admin`
- `gestor`
- `designer`
- `comercial`
- `dev`

Como o modelo atual ainda não usa múltiplos papéis por usuário, cada pessoa deve ser enquadrada no perfil que melhor representa sua responsabilidade principal.

## Mapeamento atual

| Pessoa         | Função operacional                                                                           | Perfil no sistema | Módulos principais                                                                                                | Situação                                                     |
| -------------- | -------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Pedro Henrique | Direção de comunicação, financeiro, administração, priorização e governança                  | `admin`           | Visão Geral, CRM, Campanhas, Kanban, Calendário, Produção, Analytics, Financeiro, Controle de Acesso e Meu Perfil | Cadastro deve ser criado ou confirmado quando entrar na base |
| Gabriel Jordan | Direção de marketing, relacionamento com clientes, comercial, atendimento e apoio financeiro | `admin`           | Visão Geral, CRM, Campanhas, Kanban, Calendário, Produção, Analytics, Financeiro, Controle de Acesso e Meu Perfil | Ativo                                                        |
| Janayna Sousa  | Coordenação operacional, agenda, delegação e interface com clientes                          | `gestor`          | Visão Geral, CRM, Campanhas, Kanban, Calendário, Produção, Analytics, notificações e Meu Perfil                   | Ativa                                                        |
| Thalisson      | Captação, edição e rotina audiovisual                                                        | `designer`        | Kanban, Calendário, Produção, Arquivos, Relatórios, notificações e Meu Perfil                                     | Ativo                                                        |
| Valéria        | Captação, edição e rotina audiovisual                                                        | `designer`        | Kanban, Calendário, Produção, Arquivos, Relatórios, notificações e Meu Perfil                                     | Ativa                                                        |
| Elizângela     | Social media, pesquisa, planejamento e postagem                                              | `designer`        | Kanban, Calendário, Produção, Arquivos, Relatórios, notificações e Meu Perfil                                     | Ativa                                                        |
| Camyle         | Social media, pesquisa, planejamento e postagem                                              | `designer`        | Kanban, Calendário, Produção, Arquivos, Relatórios, notificações e Meu Perfil                                     | Ativa                                                        |
| Lorena Sousa   | Design, materiais visuais, ajustes e entrega                                                 | `designer`        | Kanban, Calendário, Produção, Arquivos, Relatórios, notificações e Meu Perfil                                     | Ativa                                                        |

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

1. Confirmar nome completo e e-mail corporativo.
2. Aplicar o perfil conforme esta matriz.
3. Garantir `is_active = true`.
4. Manter `client_id = NULL` para membros internos.
5. Validar o primeiro login.
6. Pedir que a pessoa complete `Meu Perfil` logo no primeiro acesso.
7. Confirmar se a visualização de tarefas, calendário e notificações está coerente com o papel atribuído.

## Revisão futura

Se a ONE passar a exigir separação mais fina entre audiovisual, design, social media, operação e suporte técnico, o próximo passo recomendado é evoluir a matriz para capacidades mais granulares, sem depender apenas do campo `role`.
