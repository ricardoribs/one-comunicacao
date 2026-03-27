# Mapeamento da Equipe e Acessos

Este documento registra o mapeamento entre a equipe operacional da ONE e os perfis existentes no sistema. Ele serve como referencia para cadastro, revisao de acesso e onboarding.

Data de referencia: 2026-03-27

## 1. Objetivo

O sistema hoje trabalha com estes perfis internos:

- `admin`
- `gestor`
- `designer`
- `comercial`
- `dev`

Como o modelo atual nao suporta multi-role por usuario, o enquadramento abaixo usa o perfil mais aderente a responsabilidade principal de cada pessoa.

## 2. Mapeamento atual

| Pessoa | Funcao operacional | Perfil no sistema | Acesso pratico principal | Status |
| --- | --- | --- | --- | --- |
| Pedro Henrique | Diretor de Comunicacao, delegacao, rotina diaria, reunioes estrategicas, financeiro e ADM | `admin` | Dashboard interno, CRM, Campanhas, Kanban, Producao, Analytics, Financeiro e Controle de Acesso | Perfil definido; criar ou confirmar cadastro quando entrar na base |
| Gabriel Jordan | Diretor de Marketing, direcionamento das demandas, relacionamento com clientes, comercial, atendimento e apoio financeiro | `admin` | Dashboard interno, CRM, Campanhas, Kanban, Producao, Analytics, Financeiro e Controle de Acesso | Ativo |
| Janayna Sousa | Auxiliar de Marketing, organizacao da entrega, delegacao, agenda externa, comunicacao entre equipe e clientes | `gestor` | Dashboard interno, Kanban, CRM, Campanhas, Producao e Analytics | Ativa |
| Thalisson | Captacao e edicao, agenda de gravacao, checagem de roteiro e correcoes | `designer` | Kanban, Producao, arquivos, relatorios, clientes do escopo e manual da marca | Ativo |
| Valeria | Captacao e edicao, agenda de gravacao, checagem de roteiro e correcoes | `designer` | Kanban, Producao, arquivos, relatorios, clientes do escopo e manual da marca | Ativa |
| Elizangela | Social media, pesquisa, checagem de informacoes, ideias, planejamento e postagem | `designer` | Kanban, Producao, arquivos, relatorios, clientes do escopo e manual da marca | Ativa |
| Camyle | Social media, pesquisa, checagem de informacoes, ideias, planejamento e postagem | `designer` | Kanban, Producao, arquivos, relatorios, clientes do escopo e manual da marca | Ativa |
| Lorena Sousa | Designer, desenvolvimento de material, entrega e ajustes | `designer` | Kanban, Producao, arquivos, relatorios, clientes do escopo e manual da marca | Ativa |

## 3. Racional do mapeamento

### `admin` para Pedro e Gabriel

- O sistema ainda nao tem perfil combinado, por exemplo `admin + financeiro` ou `admin + comercial`.
- `admin` ja cobre financeiro, administracao, CRM, campanhas, operacao e governanca de acesso.
- Isso evita criar gambiarras de permissao fora do modelo atual.

### `gestor` para Janayna

- O papel dela e mais de coordenacao operacional do que de execucao isolada.
- O perfil `gestor` permite acompanhar a carteira, organizar a fila, distribuir tarefas e acompanhar entregas.
- Esse perfil nao abre o controle completo de usuarios nem o financeiro administrativo total.

### `designer` para audiovisual, social media e design

- O sistema atual nao separa `captacao`, `edicao`, `social media` e `designer` em roles diferentes.
- O perfil `designer` e o melhor encaixe para execucao operacional.
- A especialidade de cada pessoa passa a ser organizada pelo tipo da tarefa no Kanban, nao pelo role.

## 4. Regras operacionais

- Usuarios internos multi-conta devem permanecer com `client_id = NULL`, salvo excecao realmente intencional.
- O escopo operacional passa a ser construido pelo relacionamento com tarefas, materiais, arquivos e contas do trabalho.
- O Kanban deve usar os tipos de tarefa para especializar a execucao:
- `design`
- `revisao_design`
- `captacao`
- `edicao`
- `social_media`
- `atendimento`
- `financeiro`
- `adm`
- `reuniao_estrategica`

## 5. Uso esperado por pessoa

### Pedro Henrique

- Receber demandas e priorizar o dia.
- Delegar a execucao.
- Acompanhar a demanda diaria.
- Organizar reunioes estrategicas.
- Apoiar financeiro e administracao.

### Gabriel Jordan

- Direcionar demandas.
- Acompanhar andamento dos projetos.
- Cuidar do relacionamento com clientes.
- Atuar em comercial e atendimento.
- Apoiar financeiro e administracao.

### Janayna Sousa

- Receber direcionamento.
- Organizar execucao e entrega.
- Delegar tarefas operacionais.
- Agendar gravacoes externas.
- Garantir comunicacao entre equipe e cliente.

### Thalisson e Valeria

- Acompanhar agenda de gravacao.
- Executar captacao de video.
- Editar material.
- Conferir roteiros antes da gravacao.
- Aplicar ajustes e correcoes.

### Elizangela e Camyle

- Pesquisar ideias.
- Validar informacoes.
- Montar planejamento.
- Repassar demanda aprovada para o audiovisual.
- Publicar conteudo.

### Lorena Sousa

- Receber demanda aprovada.
- Desenvolver o material.
- Entregar no prazo.
- Ajustar quando necessario.

## 6. Diretrizes de cadastro

Ao cadastrar ou revisar usuarios dessa equipe:

1. Confirmar nome e e-mail final.
2. Aplicar o role conforme esta matriz.
3. Garantir `is_active = true`.
4. Manter `client_id = NULL` para equipe interna multi-conta.
5. Validar o acesso real no painel interno depois do primeiro login.

## 7. Manutencao futura

Se a ONE passar a precisar de separacao mais fina entre operacao, social media, audiovisual e design, o proximo passo ideal e evoluir o modelo para capacidades mais granulares, sem depender apenas do role fixo.

Enquanto esse modelo nao existe, esta matriz deve ser tratada como a fonte oficial para cadastro da equipe.
