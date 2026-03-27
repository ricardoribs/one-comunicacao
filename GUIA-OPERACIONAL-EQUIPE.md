# Guia Operacional da Equipe

Este guia traduz a plataforma ONE para a rotina do time. O foco aqui é explicar quem usa o quê, o que cada perfil deve atualizar e quais práticas evitam retrabalho.

## 1. Para que a plataforma serve

A plataforma organiza a operação da ONE em um fluxo único:

- o site capta leads
- o comercial trata e converte oportunidades
- a operação organiza campanhas, tarefas e entregas
- o cliente acompanha o que foi publicado no portal

Na prática, isso reduz conversa solta, planilha paralela e perda de contexto.

## 2. O que cada perfil faz

Para o mapeamento nominal da equipe atual, consulte tambem [MAPEAMENTO-EQUIPE-ACESSOS.md](./MAPEAMENTO-EQUIPE-ACESSOS.md).

### `admin`

Responsável por:

- administrar usuários, perfis e acessos
- acompanhar a visão geral da operação
- corrigir problemas de escopo, permissão e cadastro
- apoiar processos financeiros e operacionais quando necessário

Usa principalmente:

- Visão Geral
- Financeiro
- Acesso
- módulos operacionais conforme necessidade

### `gestor`

Responsável por:

- organizar a carteira do próprio escopo
- distribuir tarefas
- acompanhar campanhas, produção e performance
- garantir que a operação esteja atualizada

Usa principalmente:

- Visão Geral
- Kanban
- CRM
- Campanhas
- Produção
- Analytics

### `designer`

Responsável por:

- executar entregas
- atualizar tarefas
- publicar materiais e arquivos
- manter o fluxo de aprovação organizado

Usa principalmente:

- Kanban
- Produção
- campanhas e relatórios do escopo

### `comercial`

Responsável por:

- tratar leads
- manter pipeline atualizado
- converter oportunidades em clientes
- registrar cobrança e fatura quando aplicável

Usa principalmente:

- Visão Geral
- CRM
- Campanhas
- Financeiro

### `dev`

Responsável por:

- apoiar a operação técnica
- acompanhar indicadores e integrações
- organizar tarefas técnicas

Usa principalmente:

- Visão Geral
- Kanban
- Analytics

### `client`

Responsável por:

- acompanhar entregas e informações do próprio contrato
- aprovar ou solicitar revisão de materiais
- consultar financeiro do próprio escopo

Usa principalmente:

- Área do Cliente

## 3. Rotina recomendada do time comercial

### Início do dia

1. Entrar no painel interno.
2. Abrir o módulo `CRM`.
3. Verificar leads novos e oportunidades paradas.
4. Revisar propostas, negociações e fechamentos.
5. Atualizar o que mudou antes de abrir novas frentes.

### Cadastro e atualização de leads

Sempre que um lead entrar pelo site ou por outro canal:

1. Abrir `CRM`.
2. Clicar em `Novo lead`.
3. Preencher os dados principais:
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
4. Salvar.

Regras práticas:

- não deixar lead sem owner
- não deixar lead sem origem
- não deixar lead em etapa desatualizada

### Conversão em cliente

Quando a venda fechar:

1. Localizar o lead no CRM.
2. Clicar em `Converter`.
3. Revisar os dados do cliente gerado.
4. Confirmar se a base ativa foi atualizada.

Depois disso:

- campanhas podem ser cadastradas
- tarefas podem ser criadas
- cobranças e faturas podem ser registradas

### Financeiro comercial

No módulo `Financeiro`, o comercial:

- consulta cobranças emitidas
- consulta faturas abertas
- cria novas cobranças
- cria novas faturas
- atualiza status quando houver retorno

Fluxo mínimo:

1. Gerar cobrança ou fatura.
2. Conferir valor e vencimento.
3. Acompanhar retorno.
4. Atualizar o status no mesmo dia.

## 4. Rotina recomendada da operação

### Início do dia

1. Entrar no painel interno.
2. Conferir a `Visão Geral`.
3. Conferir o `Kanban`.
4. Conferir `Produção`.
5. Verificar materiais em aprovação ou revisão.

### Organização de tarefas

Cada tarefa deve estar na coluna correta:

- Backlog
- A Fazer
- Em Progresso
- Concluído

Ao criar uma tarefa:

1. Clicar em `Nova tarefa`.
2. Informar:
- título
- cliente
- responsável
- status
- coluna
- prazo
- descrição
3. Salvar.

Regras práticas:

- tarefa sem responsável vira gargalo
- tarefa sem prazo vira esquecimento
- tarefa concluída não deve permanecer em andamento

### Campanhas

Ao cadastrar ou revisar uma campanha, sempre conferir:

- cliente correto
- canal correto
- público correto
- objetivo claro
- orçamento coerente

### Produção e materiais

No módulo `Produção`, a equipe pode:

- criar entrega
- subir arquivo
- vincular a cliente e campanha
- atualizar status

Fluxo recomendado:

1. Criar a entrega com título claro.
2. Associar ao cliente certo.
3. Associar à campanha quando houver.
4. Fazer upload do arquivo.
5. Definir o status adequado.

Status mais usados:

- Pendente
- Aprovado
- Revisão

### Materiais em aprovação

Antes de publicar algo para o cliente:

1. conferir se o arquivo correto foi anexado
2. conferir se o cliente correto foi vinculado
3. conferir se o status está coerente
4. acompanhar retorno de aprovação ou revisão

Se o cliente pedir revisão:

- atualizar a entrega
- substituir o arquivo, se necessário
- manter o histórico organizado

## 5. O que o cliente enxerga

A equipe precisa saber o que fica visível no portal:

- campanhas
- relatórios
- materiais em aprovação
- faturas
- cobranças
- mensagens

Isso significa que tudo o que for publicado para o cliente precisa estar:

- correto
- claro
- atualizado
- sem duplicidade

## 6. Boas práticas operacionais

### Para `comercial`

- não deixar lead sem dono
- não deixar lead sem etapa
- não deixar proposta sem acompanhamento
- não registrar cobrança com valor ou vencimento errado

### Para `gestor`

- não deixar campanha sem responsável
- não deixar backlog sem priorização
- não deixar tarefa crítica sem acompanhamento
- não perder visibilidade do que está em aprovação

### Para `designer`

- não subir material no cliente errado
- não enviar para aprovação sem revisar o arquivo final
- não concluir entrega sem atualizar status
- não ignorar prazo e responsável

### Para `dev`

- não tratar tarefa técnica fora do fluxo do kanban
- não alterar configuração sensível sem registro
- não assumir escopo comercial ou financeiro sem alinhamento

### Para todos

- registrar o que mudou
- atualizar status no mesmo dia
- evitar controle paralelo fora do sistema

## 7. Checklist diário

### Comercial

- há leads novos para tratar?
- há propostas paradas?
- há lead pronto para conversão?
- há cobranças ou faturas para acompanhar?

### Operação

- há tarefas atrasadas?
- há entregas sem responsável?
- há material aguardando revisão?
- há campanha sem acompanhamento?

### Técnico

- há tarefa técnica bloqueada?
- há integração com erro?
- há métrica ou dashboard sem atualização esperada?

## 8. Quando chamar o `admin`

Acione o `admin` quando houver:

- problema de permissão
- necessidade de criar, editar ou remover usuário
- dúvida sobre perfil de acesso
- inconsistência de escopo
- necessidade de auditoria de dados

## 9. Documentos complementares

- [PLAYBOOK-ONBOARDING.md](PLAYBOOK-ONBOARDING.md)
- [GUIA-DA-PLATAFORMA.md](GUIA-DA-PLATAFORMA.md)
- [PERMISSIONS-MATRIX.md](PERMISSIONS-MATRIX.md)
- [README.md](README.md)

## 10. Resumo rápido

Se a equipe lembrar destas quatro regras, a operação já melhora:

1. tudo que entra no sistema precisa ter responsável
2. tudo que está em andamento precisa ter status
3. tudo que vai para o cliente precisa estar revisado
4. tudo que impacta receita precisa estar registrado no financeiro
