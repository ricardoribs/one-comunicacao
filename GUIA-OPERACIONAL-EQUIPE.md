# Guia Operacional da Equipe

Este guia traduz a plataforma ONE para a rotina do time. O foco é explicar quem usa cada módulo, o que precisa ser atualizado diariamente e quais práticas evitam retrabalho.

## 1. Para que a plataforma serve

A plataforma organiza a operação da ONE em um fluxo único:

- o site capta leads;
- o comercial trata e converte oportunidades;
- a operação organiza campanhas, tarefas, calendário e entregas;
- a equipe acompanha tudo no painel interno.

Na prática, isso reduz conversa solta, planilha paralela e perda de contexto.

## 2. O que cada perfil faz

Para o mapeamento nominal da equipe atual, consulte [MAPEAMENTO-EQUIPE-ACESSOS.md](./MAPEAMENTO-EQUIPE-ACESSOS.md).

### `admin`

Responsável por:

- administrar usuários, perfis e acessos;
- acompanhar a visão geral da operação;
- corrigir problemas de escopo, permissão e cadastro;
- apoiar processos financeiros e operacionais.

Usa principalmente:

- Visão Geral
- Meu Perfil
- Calendário
- Financeiro
- Controle de Acesso

### `gestor`

Responsável por:

- organizar a carteira do próprio escopo;
- distribuir tarefas;
- acompanhar campanhas, produção e performance;
- manter o calendário operacional atualizado.

Usa principalmente:

- Visão Geral
- Kanban
- Calendário
- CRM
- Campanhas
- Produção
- Analytics

### `designer`

Responsável por:

- executar entregas;
- atualizar tarefas;
- publicar materiais e arquivos;
- acompanhar prazos, lembretes e notificações.

Usa principalmente:

- Meu Perfil
- Kanban
- Calendário
- Produção

### `comercial`

Responsável por:

- tratar leads;
- manter o pipeline atualizado;
- converter oportunidades em clientes;
- registrar cobrança e fatura quando aplicável.

Usa principalmente:

- Visão Geral
- CRM
- Campanhas
- Financeiro
- Calendário

### `dev`

Responsável por:

- apoiar a operação técnica;
- acompanhar indicadores e integrações;
- organizar tarefas técnicas.

Usa principalmente:

- Meu Perfil
- Kanban
- Calendário
- Analytics

## 3. Rotina recomendada do time comercial

### Início do dia

1. Entrar no painel interno.
2. Abrir `CRM / Leads`.
3. Verificar leads novos e oportunidades paradas.
4. Revisar propostas, negociações e fechamentos.
5. Atualizar o que mudou antes de iniciar novas frentes.

### Cadastro e atualização de leads

Sempre que um lead entrar pelo site ou por outro canal:

1. Abrir `CRM / Leads`.
2. Clicar em `Novo lead`.
3. Preencher os dados principais.
4. Salvar.

Campos mínimos:

- nome
- empresa
- serviço
- telefone
- WhatsApp
- e-mail
- origem
- responsável
- etapa
- valor estimado

Regras práticas:

- não deixar lead sem owner;
- não deixar lead sem origem;
- não deixar lead em etapa desatualizada.

### Conversão em cliente

Quando a venda fechar:

1. Localizar o lead no CRM.
2. Clicar em `Converter`.
3. Revisar os dados do cliente gerado.
4. Confirmar se a base ativa foi atualizada.

Depois disso:

- campanhas podem ser cadastradas;
- tarefas podem ser criadas;
- cobranças e faturas podem ser registradas.

## 4. Rotina recomendada da operação

### Início do dia

1. Entrar no painel interno.
2. Conferir a Visão Geral.
3. Conferir o Kanban.
4. Conferir o Calendário.
5. Conferir Produção.

### Uso do Kanban

Cada tarefa deve estar na coluna correta:

- Backlog
- A Fazer
- Em Progresso
- Concluído

Ao criar uma tarefa:

1. Clicar em `Nova tarefa`.
2. Informar título, cliente, responsáveis, tipo, coluna, status, prazo e descrição.
3. Salvar.

Regras práticas:

- tarefa sem responsável vira gargalo;
- tarefa sem prazo vira esquecimento;
- tarefa concluída não deve permanecer em andamento;
- quando a tarefa for compartilhada, marque mais de um responsável.

### Checklist diário

Use o checklist para organizar prioridades do dia:

- criar itens objetivos;
- concluir itens ao longo do dia;
- limpar o histórico quando ele deixar de ser útil;
- usar o histórico apenas como apoio, não como arquivo permanente.

### Calendário

Use o calendário para:

- gravações;
- reuniões;
- coberturas;
- entregas com horário definido;
- lembretes operacionais da equipe.

`admin` e `gestor` podem criar eventos. Todos os perfis internos podem visualizar.

### Produção e materiais

No módulo `Produção`, a equipe pode:

- criar entrega;
- enviar arquivo;
- vincular cliente e campanha;
- atualizar status.

Fluxo recomendado:

1. Criar a entrega com título claro.
2. Associar ao cliente certo.
3. Associar à campanha quando houver.
4. Fazer upload do arquivo.
5. Definir o status adequado.

## 5. Campanhas

Ao cadastrar ou revisar uma campanha, sempre conferir:

- cliente correto;
- canal correto;
- público correto;
- objetivo claro;
- orçamento coerente.

## 6. Financeiro operacional

No módulo `Financeiro`, a equipe habilitada acompanha:

- cobranças emitidas;
- faturas abertas;
- margens por cliente;
- status de pagamento.

Fluxo mínimo:

1. Gerar cobrança ou fatura.
2. Conferir valor e vencimento.
3. Acompanhar retorno.
4. Atualizar o status no mesmo dia.

## 7. Notificações internas

O sino do painel deve ser acompanhado ao longo do dia.

Notificações mais importantes:

- nova tarefa atribuída;
- tarefa concluída;
- lembrete de evento próximo;
- atualizações operacionais relevantes.

## 8. Boas práticas por perfil

### Para `comercial`

- não deixar lead sem dono;
- não deixar lead sem etapa;
- não registrar cobrança com valor ou vencimento errado.

### Para `gestor`

- não deixar campanha sem responsável;
- não deixar backlog sem priorização;
- não deixar evento importante fora do calendário.

### Para `designer`

- não subir material no cliente errado;
- não enviar para aprovação sem revisar o arquivo final;
- não ignorar prazo e responsável.

### Para `dev`

- não tratar tarefa técnica fora do Kanban;
- não alterar configuração sensível sem registro;
- não operar fora do próprio escopo.

### Para todos

- registrar o que mudou;
- atualizar status no mesmo dia;
- evitar controle paralelo fora do sistema.

## 9. Quando chamar o `admin`

Acione o `admin` quando houver:

- problema de permissão;
- necessidade de criar, editar ou remover usuário;
- dúvida sobre perfil de acesso;
- inconsistência de escopo;
- necessidade de auditoria de dados.

## 10. Resumo rápido

Se a equipe lembrar destas cinco regras, a operação já melhora:

1. tudo o que entra no sistema precisa ter responsável;
2. tudo o que está em andamento precisa ter status;
3. tudo o que tem data deve entrar no calendário;
4. tudo o que vai para o cliente precisa estar revisado;
5. tudo o que impacta receita precisa estar registrado no financeiro.
