# Auditoria QA Visual e Estrutural — Painel SaaS

Escopo auditado

- Telas renderizadas em 1280, 1024, 768 e 375 px: Visão Geral, Meu Perfil, Gestão de Projetos, Calendário da Equipe, CRM / Pipeline, CRM / Clientes, CRM / Histórico, Planejamento de Campanhas, Produção / Design, Produção / Copywriting, Produção / Landing Pages, Gestão de Tráfego, Dados & Analytics, Financeiro Interno, Controle de Acesso / Membros e Controle de Acesso / Perfis.
- Evidência renderizada: [screenshots](/c:/Users/ricar/Downloads/Projeto%20One/qa-audit-artifacts/screenshots)
- Evidência estrutural: [metrics.json](/c:/Users/ricar/Downloads/Projeto%20One/qa-audit-artifacts/metrics.json)
- Snapshots HTML das telas: [html](/c:/Users/ricar/Downloads/Projeto%20One/qa-audit-artifacts/html)
- Referências principais do código auditado: [painel-interno.html](/c:/Users/ricar/Downloads/Projeto%20One/frontend/painel-interno.html) e [admin-app.js](/c:/Users/ricar/Downloads/Projeto%20One/frontend/assets/js/admin-app.js)

## BLOCO 1 — Escolha de componente: tabela vs card vs lista

1. PROBLEMA — Toda listagem com 4 ou mais itens e 3 ou mais colunas fixas é tabela — não grid de cards?
O que está errado: `CRM / Histórico` e `Financeiro / Lançamentos financeiros` exibem listas uniformes em cards; `Financeiro / Margem por Cliente` simula tabela com `div.fin-row`.
Por que importa: O produto perde densidade, semântica e escaneabilidade; visualmente parece protótipo, não painel operacional.
Correção: Converter essas três áreas em tabelas reais com `thead`, `tbody`, colunas fixas e ordenação visual por linha.

2. PROBLEMA — Cards são usados apenas para objetos com informação variada e densidade alta — não para listas uniformes?
O que está errado: `CRM / Histórico` e `Financeiro / Lançamentos financeiros` usam cards repetitivos com o mesmo layout e a mesma ordem de informação.
Por que importa: Cards desperdiçam altura, repetem chrome visual e fazem a interface parecer inflada.
Correção: Reservar cards para objetos ricos e heterogêneos; para listas uniformes, usar tabela ou lista densa.

3. PROBLEMA — Existe alguma tela onde o mesmo tipo de dado aparece como card em um lugar e como tabela em outro?
O que está errado: Relatórios e entregas aparecem em tabela em `Produção`, mas entram como cards em `CRM / Histórico`; cobranças e faturas aparecem como cards em `Financeiro`.
Por que importa: O usuário precisa reaprender o mesmo dado em cada módulo e percebe falta de sistema de design.
Correção: Definir um padrão único por entidade: relatórios, arquivos, entregas, cobranças e faturas devem manter o mesmo paradigma de listagem.

4. PROBLEMA — Listas com ação primária clara (abrir, editar) usam linha clicável — não botão dentro de card?
O que está errado: `CRM / Pipeline` e `Financeiro / Lançamentos` dependem de múltiplos botões dentro do card para a ação principal.
Por que importa: A densidade cai, a área clicável fragmenta e a percepção é de interface improvisada.
Correção: Tornar a linha ou o card inteiro clicável para abrir/editar e mover ações secundárias para menu overflow.

5. PROBLEMA — Existe grid de cards onde todos os cards têm exatamente o mesmo layout — candidato óbvio a tabela?
O que está errado: Os cards de `CRM / Histórico` e boa parte de `Financeiro / Lançamentos` repetem estrutura idêntica.
Por que importa: O grid comunica “catálogo” quando o conteúdo é claramente tabular.
Correção: Substituir por tabela com colunas `Item`, `Cliente`, `Tipo`, `Status`, `Data`, `Ação`.

6. PROBLEMA — Existe card com mais de 2 botões de ação visíveis simultaneamente?
O que está errado: Todos os cards de lead em `CRM / Pipeline` mostram `Editar`, `Converter` e `Excluir`; cartões de cobrança em `Financeiro` chegam a 4 botões.
Por que importa: O card vira toolbar, não conteúdo; o ruído visual sobe demais.
Correção: Limitar a 1 ação principal visível e mover o restante para um menu contextual.

7. OK — Existe card onde a ação de excluir tem o mesmo peso visual que a ação de editar?
O que está errado: Nada crítico observado; os botões destrutivos usam vermelho e peso inferior ao CTA principal.
Por que importa: Mantém hierarquia mínima entre ação segura e ação destrutiva.
Correção: Nenhuma; manter destrutivas com peso visual inferior.

8. PROBLEMA — Listagens de membros, arquivos, campanhas, faturas e relatórios são tabela — não cards?
O que está errado: `Membros`, `Arquivos` e `Campanhas` estão em tabela, mas `Faturas/Cobranças` não; parte dos relatórios volta a card em `CRM / Histórico`.
Por que importa: A inconsistência quebra o padrão mental de “dados operacionais = tabela”.
Correção: Levar `Faturas`, `Cobranças` e `Histórico` para tabela, alinhando com `Membros`, `Arquivos`, `Campanhas` e `Relatórios`.

9. PROBLEMA — Existe algum card que, removendo a borda e o padding, seria indistinguível de uma linha de tabela?
O que está errado: Os itens de `CRM / Histórico` são essencialmente uma linha com título, subtítulo e badge, embalados em card.
Por que importa: Isso é sinal claro de componente errado, não de estilo incompleto.
Correção: Reescrever como linha tabular simples.

## BLOCO 2 — Largura e proporção de colunas

1. PROBLEMA — Colunas de texto longo têm largura maior que colunas de dado curto?
O que está errado: `Campanhas` e `CRM / Clientes` comprimem nome, público e datas enquanto status e ações continuam consumindo largura relevante.
Por que importa: O dado principal vira ruído truncado e o usuário perde contexto antes mesmo de agir.
Correção: Rebalancear colunas priorizando `Nome/Título/Descrição`; reduzir `Status`, `Data` e `Ações` ao mínimo funcional.

2. PROBLEMA — Coluna de status tem largura adequada ao badge?
O que está errado: Em `CRM / Clientes` o header já aparece truncado como `STAT...`; em `Campanhas` o badge fica apertado pelo conjunto da tabela.
Por que importa: Se o próprio cabeçalho não cabe, a coluna está mal dimensionada.
Correção: Dar largura mínima fixa para badges e evitar que o cabeçalho trunque.

3. PROBLEMA — Coluna de data tem largura fixa suficiente para o formato completo?
O que está errado: A coluna `Desde` em `CRM / Clientes` quebra o ano em duas linhas; em `Produção / Landing Pages` a data cai sob o header errado.
Por que importa: Datas quebradas parecem erro de layout e reduzem confiança.
Correção: Fixar largura mínima para datas e impedir quebra no formato `DD/MM/AAAA`.

4. OK — Coluna de valor monetário está alinhada à direita — não à esquerda como texto?
O que está errado: Nada observado nas tabelas de `CRM`, `Campanhas`, `Tráfego` e `Analytics`; valores monetários aparecem alinhados à direita.
Por que importa: O alinhamento correto acelera comparação numérica.
Correção: Nenhuma.

5. PROBLEMA — Coluna de ações tem largura mínima suficiente para os botões?
O que está errado: `CRM / Clientes` empilha três ações em coluna estreita; `Produção / Design` aperta `Arquivo`, `Editar` e `Excluir`; `Campanhas` sofre ainda mais em viewport menor.
Por que importa: A área de ação parece improvisada e gera erros de clique.
Correção: Reduzir ações visíveis, definir largura mínima explícita e migrar ações secundárias para overflow.

6. OK — Existe coluna de ID ou número de ordem que ocupa espaço desnecessário e poderia ser removida?
O que está errado: Não foi encontrada coluna de ID exposta ao usuário nas telas auditadas.
Por que importa: Evita gasto de espaço com dado operacional irrelevante.
Correção: Nenhuma.

7. OK — Existe coluna com conteúdo muito longo que deveria ter `text-overflow: ellipsis` mas está quebrando linha?
O que está errado: O sistema usa truncamento ou wrap controlado; o problema dominante é truncamento excessivo, não quebra caótica de linha.
Por que importa: Diferencia problema de overflow de problema de proporção de coluna.
Correção: Nenhuma específica para este item; tratar a proporção das colunas.

8. NÃO APLICÁVEL — Existe coluna de checkbox ou seleção que está larga demais?
O que está errado: As telas auditadas não usam coluna de checkbox/seleção em tabelas.
Por que importa: Não há componente desse tipo para validar.
Correção: Não aplicável.

9. PROBLEMA — Em mobile, colunas menos importantes somem — mantendo só nome, status e ação principal?
O que está errado: Em `CRM / Clientes`, `Campanhas`, `Produção`, `Analytics`, `Tráfego` e `Acesso / Membros` a tabela desktop permanece inteira e o usuário vê só a primeira faixa horizontal.
Por que importa: A informação principal não é priorizada em 375 px; o layout apenas esconde o resto fora da dobra horizontal.
Correção: Criar versão mobile por prioridade de coluna, mantendo `nome`, `status` e `ação principal`, ou mudar para linhas compactas por item.

10. PROBLEMA — Existe coluna com header que não descreve o dado?
O que está errado: `Produção / Copywriting`, `Produção / Landing Pages` e `Analytics / Performance por Cliente` mantêm cabeçalhos de um dataset antigo e renderizam outro.
Por que importa: O usuário lê uma coluna e interpreta outra; isso compromete a confiabilidade do painel.
Correção: Alinhar o `thead` ao dataset real ou mudar o renderer para obedecer os cabeçalhos atuais.

## BLOCO 3 — Hierarquia tipográfica

1. OK — Em cada tela existe exatamente um elemento de maior peso visual — o título principal?
O que está errado: Nada crítico observado; o título da página segue como principal âncora visual.
Por que importa: Dá orientação imediata e reduz sensação de caos.
Correção: Nenhuma.

2. OK — Subtítulos de seção têm peso claramente menor que o título principal?
O que está errado: Nada crítico observado; subtítulos aparecem menores e mais apagados que o título principal.
Por que importa: Mantém a página escaneável.
Correção: Nenhuma.

3. OK — Dados primários têm `font-weight` maior que dados secundários?
O que está errado: Nada crítico observado; nomes, valores e títulos usam mais peso que cliente, data e subtexto.
Por que importa: A leitura hierárquica continua rápida.
Correção: Nenhuma.

4. OK — Metadados são visivelmente menores e mais apagados?
O que está errado: Nada crítico observado; metadados estão em corpo menor e tom mais fraco.
Por que importa: Evita competição com a informação principal.
Correção: Nenhuma.

5. OK — Labels de campo têm tamanho e peso consistentes em todo o painel?
O que está errado: Nada crítico observado no HTML/CSS do shell e dos formulários.
Por que importa: Consistência reduz sensação de remendo.
Correção: Nenhuma.

6. PROBLEMA — Existe texto que deveria ser dado mas está com tamanho de label — ou vice-versa?
O que está errado: KPIs monetários longos em `Home`, `CRM / Pipeline` e `Analytics` quebram em duas linhas e perdem a leitura de dado principal.
Por que importa: O número mais importante deixa de dominar visualmente e passa a parecer ruído.
Correção: Impor `white-space: nowrap`, reduzir tracking, usar `clamp` mais agressivo ou abreviação contextual.

7. OK — Existe mistura de `font-weight` sem critério?
O que está errado: Nada sistêmico observado; a maior parte do painel trabalha com 500/600/700 de forma previsível.
Por que importa: Preserva ordem visual.
Correção: Nenhuma.

8. OK — Existe texto em caixa alta onde sentence case seria mais adequado — e vice-versa?
O que está errado: Nada crítico observado; caixa alta ficou restrita a labels e cabeçalhos tabulares.
Por que importa: Evita gritaria visual desnecessária.
Correção: Nenhuma.

9. NÃO APLICÁVEL — Existe parágrafo de texto corrido onde deveria ser lista, ou lista onde deveria ser parágrafo?
O que está errado: Não foi encontrado caso dominante nas telas auditadas.
Por que importa: Não há material suficiente para abrir finding separado.
Correção: Não aplicável.

10. OK — Títulos de seção têm o mesmo tamanho em todas as seções — sem variação por importância?
O que está errado: Nada crítico observado; os títulos de seção seguem escala uniforme.
Por que importa: Reforça consistência dentro das páginas.
Correção: Nenhuma.

## BLOCO 4 — O que é texto e não deveria ser

1. OK — Existe dado que muda frequentemente e está hardcoded como texto?
O que está errado: Não foi encontrado dado dinâmico visível “congelado” no estado renderizado auditado.
Por que importa: Evita que o painel pareça mock.
Correção: Nenhuma.

2. NÃO APLICÁVEL — Existe instrução de interface escrita como parágrafo que deveria ser tooltip ou placeholder?
O que está errado: Não houve caso dominante nas telas auditadas.
Por que importa: Sem ocorrência relevante.
Correção: Não aplicável.

3. OK — Existe explicação de estado vazio com mais de 2 linhas?
O que está errado: Os empty states renderizados ficaram curtos; o problema aqui é falta de CTA, não excesso de texto.
Por que importa: Evita blocos de leitura desnecessária.
Correção: Nenhuma para este item.

4. OK — Existe label de campo que repete o valor — “Status: Ativo” onde só o badge “Ativo” seria suficiente?
O que está errado: Não foi encontrado caso literal desse padrão nas telas auditadas.
Por que importa: Mantém a interface enxuta.
Correção: Nenhuma.

5. NÃO APLICÁVEL — Existe texto descritivo dentro de card que é igual em todos os cards?
O que está errado: Não apareceu um caso dominante renderizado que justifique finding isolado.
Por que importa: Sem ocorrência relevante.
Correção: Não aplicável.

6. PROBLEMA — Existe frase explicando por que um campo está vazio?
O que está errado: O sistema gera diversos textos como “Nenhuma conexão registrada”, “Sem painel complementar”, “Nenhum dado disponível”, “Manual de marca ainda não cadastrado”.
Por que importa: A interface verbaliza ausência de dado em vez de resolver a ausência com estado, ação ou supressão do campo.
Correção: Quando o vazio for estrutural, esconder o campo; quando for operacional, usar empty state com CTA contextual.

7. OK — Existe nota de rodapé ou aviso que aparece em todas as telas sem ser relevante?
O que está errado: Não há aviso global irrelevante poluindo todas as telas.
Por que importa: Mantém o shell limpo.
Correção: Nenhuma.

8. OK — Existe breadcrumb ou subtítulo de página que repete o que o título já diz?
O que está errado: Os subtítulos geralmente adicionam contexto operacional ao título.
Por que importa: Ajuda orientação sem redundância grosseira.
Correção: Nenhuma.

9. PROBLEMA — Existe coluna de tabela cujos valores são todos iguais?
O que está errado: `CRM / Clientes` mostra `Status = Ativo` em todas as linhas; `Produção / Design` mostra `Tipo = Design` em todas as linhas.
Por que importa: A coluna consome largura sem agregar informação.
Correção: Remover a coluna fixa ou substituí-la por um dado realmente variável.

10. NÃO APLICÁVEL — Existe campo de formulário cujo label é mais longo que o valor que o usuário vai digitar?
O que está errado: Os modais não foram auditados visualmente um a um em estado aberto.
Por que importa: Sem evidência renderizada suficiente para concluir.
Correção: Não aplicável.

## BLOCO 5 — O que não é texto e está sendo tratado como texto

1. OK — Existe status que deveria ser badge colorido mas está como texto simples?
O que está errado: Nada crítico observado; status principais aparecem como badges nas listagens.
Por que importa: Preserva reconhecimento rápido por cor.
Correção: Nenhuma.

2. PROBLEMA — Existe porcentagem ou número de progresso que deveria ser barra visual mas é só texto?
O que está errado: `Financeiro / Margem por Cliente` expõe margem apenas como porcentagem textual, apesar do uso claramente comparativo por linha.
Por que importa: A tabela perde leitura instantânea de quem performa melhor ou pior.
Correção: Adicionar barra de margem ou heatmap leve na própria célula.

3. NÃO APLICÁVEL — Existe sequência de etapas que deveria ser stepper visual mas é lista numerada?
O que está errado: Não existe fluxo numerado desse tipo nas telas auditadas.
Por que importa: Sem ocorrência.
Correção: Não aplicável.

4. NÃO APLICÁVEL — Existe comparação entre valores que deveria ser gráfico mas é tabela de números?
O que está errado: As telas já combinam tabela e gráfico; não há caso óbvio de gráfico omitido que mereça finding separado.
Por que importa: Sem ocorrência dominante.
Correção: Não aplicável.

5. OK — Existe dado de presença ou atividade que deveria ser indicador visual mas é texto?
O que está errado: Nada crítico observado; `Acesso / Membros` já usa ponto de presença colorido.
Por que importa: Facilita escaneamento de disponibilidade.
Correção: Nenhuma.

6. OK — Existe avatar que deveria ser círculo com iniciais mas é texto de nome completo?
O que está errado: Nada crítico observado; membros e perfil usam avatar circular com iniciais.
Por que importa: Mantém identidade visual mínima mesmo sem foto.
Correção: Nenhuma.

7. OK — Existe ação que deveria ser ícone mas é texto completo em botão?
O que está errado: Nada crítico observado; os CTAs principais usam rótulos descritivos úteis.
Por que importa: Favorece entendimento imediato.
Correção: Nenhuma.

8. NÃO APLICÁVEL — Existe relação entre dados que deveria ser linha conectando ou agrupamento visual mas é texto explicando a relação?
O que está errado: Não foi encontrado caso dominante nas telas auditadas.
Por que importa: Sem ocorrência relevante.
Correção: Não aplicável.

## BLOCO 6 — Espaçamento e densidade

1. PROBLEMA — O espaço interno dos cards é proporcional ao conteúdo?
O que está errado: `Perfil` e `CRM / Histórico` deixam muito vazio interno para pouco conteúdo; `Financeiro` também alonga cards demais no feed da direita.
Por que importa: A tela parece incompleta e menos profissional.
Correção: Reduzir padding e deixar altura auto para cards de baixa densidade.

2. PROBLEMA — Existe card com muito padding e pouco conteúdo que faz o elemento parecer vazio?
O que está errado: O card principal de `Perfil` e os cards de `CRM / Histórico` são os casos mais evidentes.
Por que importa: Vazio não intencional passa sensação de conteúdo faltando.
Correção: Remover equal height automático e aproximar conteúdo das bordas úteis.

3. PROBLEMA — Existe seção com espaço em branco não intencional?
O que está errado: `Perfil` cria um grande vazio abaixo de `Dados pessoais` por esticar o card para acompanhar a coluna lateral.
Por que importa: É um dos sinais mais fortes de layout amador.
Correção: Permitir altura natural do card ou redistribuir blocos em stack.

4. OK — O espaço entre elementos relacionados é menor que o espaço entre grupos distintos?
O que está errado: Nada crítico observado; em geral a proximidade entre títulos, subtítulos e linhas está correta.
Por que importa: Sustenta leitura por agrupamento.
Correção: Nenhuma.

5. OK — Existe elemento com `margin-bottom` excessivo que cria falsa separação?
O que está errado: Não houve finding dominante isolado desse tipo.
Por que importa: Sem ocorrência forte.
Correção: Nenhuma.

6. OK — Em formulários, o espaço entre campos do mesmo grupo é menor que o espaço entre grupos diferentes?
O que está errado: O CSS dos formulários e modais está consistente nessa relação.
Por que importa: Ajuda a leitura por bloco.
Correção: Nenhuma.

7. NÃO APLICÁVEL — Existe linha divisória entre elementos que já têm espaço suficiente — divisória redundante?
O que está errado: Não surgiu caso forte o bastante para abrir finding separado.
Por que importa: Sem ocorrência dominante.
Correção: Não aplicável.

8. NÃO APLICÁVEL — Existe ausência de divisória entre elementos que precisariam de separação clara?
O que está errado: Não surgiu caso dominante nas telas auditadas.
Por que importa: Sem ocorrência relevante.
Correção: Não aplicável.

9. PROBLEMA — Tabelas têm densidade adequada?
O que está errado: `CRM / Clientes` e `Tráfego` usam linhas muito altas para poucos dados, enquanto `Campanhas` desperdiça área e ainda trunca demais.
Por que importa: A tela usa mais altura sem ganhar legibilidade.
Correção: Reduzir min-height das células, aproximar títulos e sublinhas e recalibrar padding vertical.

10. PROBLEMA — Existe coluna de tabela com dado muito curto que tem o mesmo padding que colunas longas?
O que está errado: `Status`, `Data` e `Ações` usam o mesmo padding das colunas de texto longo, agravando truncamento em `Campanhas`, `CRM` e `Tráfego`.
Por que importa: Espaço valioso é gasto onde o dado é curto.
Correção: Criar densidade de padding por tipo de coluna, não um único valor global.

## BLOCO 7 — Consistência de componentes

1. OK — Todos os badges de status têm o mesmo `border-radius`?
O que está errado: Nada crítico observado nos badges de status principais; o componente `.badge` é consistente.
Por que importa: Evita ruído visual.
Correção: Nenhuma.

2. OK — Todos os badges têm o mesmo padding horizontal e vertical?
O que está errado: Nada crítico observado nos badges principais do painel.
Por que importa: Mantém sensação de sistema.
Correção: Nenhuma.

3. PROBLEMA — Todos os botões primários têm o mesmo height em todo o painel?
O que está errado: O painel mistura primários `btn-sm` de 33 px no shell com primários de 40 px em formulários/modal.
Por que importa: A falta de escala explícita faz o sistema parecer inconsistente.
Correção: Formalizar tamanhos `sm/md` por contexto e não misturar sem regra visual clara.

4. PROBLEMA — Todos os botões secundários têm o mesmo estilo?
O que está errado: O produto mistura outline, ghost, texto puro e pseudo-link para ações equivalentes.
Por que importa: Falta previsibilidade sobre prioridade e clicabilidade.
Correção: Definir uma hierarquia fixa de secundário, terciário e destrutivo-link, e aplicá-la em todo o painel.

5. OK — Todos os inputs têm a mesma altura e o mesmo estilo de borda?
O que está errado: Nada crítico observado no CSS dos inputs do painel.
Por que importa: Sustenta consistência nos formulários.
Correção: Nenhuma.

6. OK — Todos os modais têm a mesma largura máxima e o mesmo padding interno?
O que está errado: O shell modal usa um único componente `.modal-box` com largura e padding consistentes.
Por que importa: Reduz variação arbitrária entre fluxos.
Correção: Nenhuma.

7. OK — Todos os estados de hover em linhas de tabela têm o mesmo background?
O que está errado: Nada crítico observado; o hover de tabela é global.
Por que importa: A previsibilidade visual melhora.
Correção: Nenhuma.

8. OK — Todos os estados de foco em inputs têm o mesmo estilo?
O que está errado: Nada crítico observado; foco usa borda rosa e halo consistente.
Por que importa: Acessibilidade e consistência caminham juntas.
Correção: Nenhuma.

9. PROBLEMA — Existe componente que aparece diferente em duas telas sem motivo?
O que está errado: Mesmas entidades operacionais aparecem ora em tabela, ora em cards, sem critério funcional.
Por que importa: O sistema de design deixa de comunicar padrão.
Correção: Normalizar cada entidade para um único componente-base por contexto.

10. NÃO APLICÁVEL — Existe ícone usado com dois tamanhos diferentes sem critério?
O que está errado: Não houve evidência suficiente para abrir finding de ícones.
Por que importa: Sem ocorrência relevante.
Correção: Não aplicável.

## BLOCO 8 — Ações e interatividade

1. PROBLEMA — Toda ação destrutiva pede confirmação antes de executar?
O que está errado: Exclusões de cliente, tarefa, lead, campanha, integração, entrega, evento e usuário disparam direto.
Por que importa: O risco operacional é alto e a percepção de acabamento cai imediatamente.
Correção: Inserir confirmação modal padrão com verbo, impacto e ação reversível quando possível.

2. PROBLEMA — Ações destrutivas são visualmente menos prominentes que ações construtivas?
O que está errado: Em `CRM / Pipeline` e em várias listas o destrutivo ainda divide o mesmo bloco de ações visíveis que editar/abrir.
Por que importa: Mesmo em vermelho, a proximidade e a repetição fazem a ação competir demais.
Correção: Tirar destrutivas da face principal e movê-las para overflow ou confirmação secundária.

3. PROBLEMA — Botões de ação principal têm label que descreve o resultado?
O que está errado: Os modais usam `Salvar` e `Atualizar` genéricos em vez de `Salvar tarefa`, `Criar campanha`, `Salvar cobrança`.
Por que importa: O usuário perde contexto na hora da confirmação final.
Correção: Usar labels orientados ao resultado em cada fluxo.

4. OK — Existe botão com label ambíguo — “OK”, “Sim”, “Enviar” sem contexto?
O que está errado: Não foi encontrado esse padrão no painel auditado.
Por que importa: Evita decisões cegas.
Correção: Nenhuma.

5. PROBLEMA — Existe ação que só faz sentido em determinado estado mas está sempre visível?
O que está errado: `Converter` continua disponível para leads já fechados no renderer do pipeline.
Por que importa: A interface oferece ação sem validade de negócio, parecendo incompleta.
Correção: Renderizar a ação apenas para etapas convertíveis.

6. OK — Formulários desabilitam o botão de submit durante o envio?
O que está errado: Nada crítico observado; `FormUtils.submit` desabilita e troca o texto do botão.
Por que importa: Evita duplo envio.
Correção: Nenhuma.

7. PROBLEMA — Existe link ou botão com área clicável menor que 44x44 px?
O que está errado: Há diversos botões de 33-40 px e links como `Remover` com área de 55x16 px em `Acesso / Membros`.
Por que importa: A usabilidade em touch cai e o produto parece “desktop-only”.
Correção: Garantir mínimo de 44x44 px para todo alvo interativo.

8. OK — Existe dropdown ou select que não fecha ao clicar fora?
O que está errado: Os filtros auditados são `select` nativos.
Por que importa: O comportamento é previsível.
Correção: Nenhuma.

9. PROBLEMA — Existe ação de arrastar sem indicador visual de que o elemento é arrastável?
O que está errado: Os cards do `Kanban` só insinuam drag por cursor `grab`; não há handle, ícone ou affordance persistente.
Por que importa: Em touch e para usuários menos experientes a capacidade de arrastar fica invisível.
Correção: Adicionar handle visual e instrução contextual leve.

10. OK — Existe filtro ou busca que não tem feedback visual de que está ativo?
O que está errado: Nada crítico observado; o valor escolhido segue visível nos `selects`.
Por que importa: O usuário entende o estado atual do recorte.
Correção: Nenhuma.

## BLOCO 9 — Estados e feedback

1. PROBLEMA — Toda listagem tem estado de loading?
O que está errado: Parte das áreas usa skeleton, mas `Calendário`, `Pipeline`, `Produção` e `Tráfego` entram com mensagem textual de carregamento, não com estado de loading adequado.
Por que importa: A interface parece quebrada ou vazia durante o carregamento.
Correção: Criar estados de loading específicos para cada composição principal.

2. PROBLEMA — O skeleton tem o mesmo layout do conteúdo real?
O que está errado: `skeletonRows` é genérico e várias telas usam texto “Carregando...” no lugar do layout real.
Por que importa: O carregamento não prepara o usuário para o que virá e reforça sensação de improviso.
Correção: Fazer skeleton por tela com a mesma densidade e estrutura do conteúdo final.

3. PROBLEMA — Toda listagem tem estado vazio com ação primária?
O que está errado: `CRM / Clientes`, `Produção`, `Tráfego`, `Analytics`, `Financeiro` e `Acesso` geram empty states sem CTA local na maioria dos casos.
Por que importa: Estado vazio sem ação encerra o fluxo em beco sem saída.
Correção: Todo estado vazio operacional precisa trazer a próxima ação natural.

4. OK — Toda ação assíncrona tem feedback de sucesso ou erro?
O que está errado: Nada crítico observado; o painel usa toast para sucesso e erro nas ações assíncronas principais.
Por que importa: O usuário recebe confirmação mínima do resultado.
Correção: Nenhuma.

5. OK — Existe ação que executa e não dá nenhum feedback?
O que está errado: Não foi identificado caso relevante nas ações assíncronas auditadas.
Por que importa: Mantém confiança operacional.
Correção: Nenhuma.

6. PROBLEMA — Erros de validação aparecem próximos ao campo com problema?
O que está errado: Os modais capturam erro e mostram apenas toast genérico.
Por que importa: O usuário precisa adivinhar qual campo falhou.
Correção: Renderizar erro inline por campo e destacar o input inválido.

7. PROBLEMA — Existe estado de erro de carregamento com botão de retry?
O que está errado: Falha de carregamento resulta em toast global; não existe estado inline com `Tentar novamente`.
Por que importa: O usuário não tem caminho de recuperação no próprio contexto.
Correção: Criar componente de erro inline com CTA de retry para listas e widgets.

8. PROBLEMA — Formulários com erro mostram quais campos precisam de atenção?
O que está errado: O fluxo de submissão dos modais não aponta campo, só mensagem geral.
Por que importa: A correção fica lenta e frustrante.
Correção: Marcar campos com erro, explicar o motivo e focar o primeiro erro.

9. NÃO APLICÁVEL — Existe dado que atualiza em tempo real sem indicar que foi atualizado?
O que está errado: Não houve evidência suficiente de atualização silenciosa de conteúdo central além de notificações.
Por que importa: Sem ocorrência forte.
Correção: Não aplicável.

10. PROBLEMA — Existe modal que abre sem animação?
O que está errado: O modal muda de `display:none` para `display:flex` sem transição.
Por que importa: A abertura brusca faz o produto parecer cru e reduz percepção de polimento.
Correção: Adicionar fade/scale curto no overlay e no container do modal.

## BLOCO 10 — Responsividade e breakpoints

1. OK — Em 1280 px o layout não tem scroll horizontal?
O que está errado: Nada crítico observado; `bodyOverflow` ficou falso em todas as telas de 1280 px.
Por que importa: O shell principal se mantém estável.
Correção: Nenhuma.

2. PROBLEMA — Em 1024 px colunas secundárias colapsam adequadamente?
O que está errado: O painel prefere truncar e empilhar controles; `Analytics` e `Financeiro` já quebram o topo em duas linhas e as tabelas continuam densas demais.
Por que importa: O breakpoint de 1024 px ainda parece desktop apertado, não layout adaptado.
Correção: Reordenar prioridades de coluna e mover ações secundárias para overflow a partir de 1024 px.

3. OK — Em 768 px a sidebar some ou vira menu hamburger?
O que está errado: Nada crítico observado; o shell troca para hamburger.
Por que importa: Libera espaço horizontal para conteúdo.
Correção: Nenhuma.

4. OK — Em 768 px tabelas têm scroll horizontal — não cortam conteúdo?
O que está errado: Tecnicamente os `table-wrap` mantêm scroll horizontal próprio.
Por que importa: Evita quebrar o layout geral da página.
Correção: Nenhuma para este item; o problema principal continua sendo falta de priorização de colunas.

5. OK — Em 375 px modais ocupam largura total com padding reduzido?
O que está errado: O CSS do modal prevê largura total e padding reduzido no breakpoint móvel.
Por que importa: Mantém abertura viável em telas estreitas.
Correção: Nenhuma.

6. PROBLEMA — Existe elemento com largura fixa em px que quebra em viewport menor?
O que está errado: Tabelas usam `min-width` de 680, 720, 960, 980 e 1080 px; o calendário usa grid mínima de 860 px.
Por que importa: O layout não quebra a página, mas empurra o conteúdo para scroll horizontal contínuo.
Correção: Definir versões responsivas reais em vez de depender só de `overflow-x:auto`.

7. PROBLEMA — Existe texto que em viewport menor fica em fonte menor que 12 px?
O que está errado: A evidência automatizada encontrou texto visível de 10 px em todas as viewports, inclusive 375 px.
Por que importa: Isso reduz legibilidade e reforça aparência de UI encolhida.
Correção: Fixar mínimo de 12 px para texto funcional visível; deixar 10 px apenas para metadado excepcional.

8. OK — Existe grid de cards que em mobile fica com 2 colunas quando deveria ser 1?
O que está errado: Nada crítico observado em 375 px; os grids principais viram 1 coluna.
Por que importa: Mantém leitura vertical.
Correção: Nenhuma.

9. OK — Existe botão que em mobile tem texto truncado?
O que está errado: O problema dominante foi empilhamento, não truncamento do label dos botões.
Por que importa: Ajuda a distinguir problema real de sintoma.
Correção: Nenhuma para este item.

10. OK — Existe formulário que em mobile tem campos lado a lado que deveriam ser empilhados?
O que está errado: O CSS dos formulários empilha campos nos breakpoints móveis.
Por que importa: Preserva preenchimento confortável.
Correção: Nenhuma.

## BLOCO 11 — Dados e formatação

1. OK — Valores monetários estão no formato correto?
O que está errado: Nada crítico observado; o padrão `R$ 1.234,56` está correto.
Por que importa: Passa maturidade de produto financeiro brasileiro.
Correção: Nenhuma.

2. OK — Datas estão no formato consistente em todo o painel?
O que está errado: Nada crítico observado no padrão visual; datas absolutas usam `DD/MM/AAAA` e data+hora seguem o padrão local.
Por que importa: Evita ruído cognitivo.
Correção: Nenhuma.

3. PROBLEMA — Porcentagens têm casas decimais consistentes?
O que está errado: KPIs usam 1 casa decimal em algumas telas e 2 casas nas tabelas, sem critério explícito.
Por que importa: A comparação entre KPI e detalhe perde coerência.
Correção: Definir regra por métrica e mantê-la em todos os componentes.

4. PROBLEMA — Textos longos têm truncamento com ellipsis — não quebram o layout?
O que está errado: Em `Campanhas` o truncamento é tão agressivo que a linha vira sigla ilegível; cabeçalhos e dados principais perdem utilidade.
Por que importa: Ellipsis só é aceitável quando o dado continua reconhecível.
Correção: Reabrir largura das colunas principais e limitar truncamento ao excedente real.

5. OK — Existe campo que exibe “null”, “undefined”, “NaN” ou “Invalid Date” visível ao usuário?
O que está errado: Nada observado; a busca automática nas telas renderizadas não encontrou esses valores.
Por que importa: Evita erro crítico de acabamento.
Correção: Nenhuma.

6. OK — Existe número sem formatação de milhar?
O que está errado: Nada crítico observado; o painel formata milhares corretamente.
Por que importa: Melhora leitura numérica.
Correção: Nenhuma.

7. OK — Existe campo vazio exibido como string vazia?
O que está errado: Nada crítico observado nas telas auditadas; o sistema tende a usar `-`, `—` ou omitir.
Por que importa: Evita “buracos” sem explicação.
Correção: Nenhuma.

8. OK — Existe data relativa e data absoluta misturadas sem critério?
O que está errado: Nada crítico observado; datas relativas ficam restritas a notificações, enquanto tabelas usam datas absolutas.
Por que importa: Há critério de contexto.
Correção: Nenhuma.

9. OK — Existe nome de pessoa ou empresa com iniciais maiúsculas inconsistentes?
O que está errado: Nada crítico observado nos dados renderizados.
Por que importa: Mantém sensação de cuidado editorial.
Correção: Nenhuma.

10. OK — Existe acentuação incorreta ou ausente em qualquer texto da interface?
O que está errado: Não foi identificado erro de acentuação nas telas renderizadas auditadas.
Por que importa: Texto com acento errado em produto B2B passa sensação imediata de amadorismo.
Correção: Nenhuma.

## BLOCO 12 — Navegação e orientação

1. OK — O item ativo na sidebar está claramente destacado?
O que está errado: Nada crítico observado; o item ativo recebe contraste claro.
Por que importa: O usuário sabe onde está.
Correção: Nenhuma.

2. OK — O título da página descreve o conteúdo?
O que está errado: Nada crítico observado; os títulos são específicos.
Por que importa: Orienta rápido.
Correção: Nenhuma.

3. OK — O subtítulo da página adiciona contexto que o título não tem?
O que está errado: Nada crítico observado; os subtítulos complementam o título.
Por que importa: Dá contexto sem redundância.
Correção: Nenhuma.

4. NÃO APLICÁVEL — Existe breadcrumb ou indicador de localização em telas aninhadas?
O que está errado: As telas auditadas são de primeiro nível ou tabs do mesmo contexto, sem trilha de navegação profunda.
Por que importa: Não há fluxo aninhado suficiente para exigir breadcrumb.
Correção: Não aplicável.

5. OK — Existe link de volta em modal ou tela de detalhe?
O que está errado: O shell modal possui fechamento explícito por botão, overlay e tecla `Esc`.
Por que importa: O usuário tem rota de saída clara.
Correção: Nenhuma.

6. NÃO APLICÁVEL — A ordem dos itens na sidebar reflete a frequência de uso?
O que está errado: Sem dados reais de uso, não há como validar prioridade de negócio.
Por que importa: Exige telemetria ou decisão de produto.
Correção: Não aplicável.

7. OK — Existe item de menu que leva a tela vazia?
O que está errado: Não foi encontrado item levando a tela vazia nas evidências renderizadas.
Por que importa: Evita sensação de funcionalidade inacabada.
Correção: Nenhuma.

8. OK — Existe notificação com badge mas clicar no sino não abre nada?
O que está errado: O componente de notificação tem painel próprio e estado visual correspondente no HTML/JS.
Por que importa: Mantém coerência entre badge e ação.
Correção: Nenhuma.

9. OK — Existe tab ativo que não muda o conteúdo abaixo?
O que está errado: Nada crítico observado; tabs de `CRM`, `Produção` e `Acesso` alternam conteúdo real.
Por que importa: Evita tabs decorativas.
Correção: Nenhuma.

10. OK — Existe filtro que não persiste ao navegar para outra tela e voltar?
O que está errado: Nada crítico observado; os filtros ficam no `state.filters` e persistem na navegação interna.
Por que importa: Preserva continuidade de uso.
Correção: Nenhuma.

## ENTREGA 1 — Mapa de problemas por tela

Tela: Visão Geral
─────────────────────────────────────
ALTO     → KPI de faturamento quebra em duas linhas e perde hierarquia — impedir quebra e recalibrar largura/escala do valor.
MÉDIO    → Ações do topo viram pilha alta em mobile — manter só CTA principal e mover o resto para overflow.

Tela: Meu Perfil
─────────────────────────────────────
ALTO     → Card de dados pessoais estica e cria vazio interno grande — remover `height:100%` e deixar altura auto.
MÉDIO    → Texto funcional chega a 10 px no shell — subir mínimo visível para 12 px.

Tela: Gestão de Projetos
─────────────────────────────────────
ALTO     → Cards do kanban não comunicam drag de forma persistente — adicionar handle visual e affordance fixa.
MÉDIO    → Ações inline no card competem com o conteúdo — manter card clicável e mover destrutiva para overflow.

Tela: Calendário da Equipe
─────────────────────────────────────
ALTO     → Topbar explode em múltiplas linhas no mobile — colapsar ações secundárias em menu.
MÉDIO    → Cards de próximos eventos exibem ações pequenas e sem 44 px mínimos — ampliar área clicável.

Tela: CRM / Pipeline
─────────────────────────────────────
ALTO     → Cada lead mostra 3 ações visíveis e o card vira toolbar — deixar `Editar` como ação primária e mover `Converter/Excluir` para menu.
ALTO     → KPI monetário quebra em duas linhas — impedir wrap em valores monetários.
MÉDIO    → `Converter` permanece visível em estados já fechados — renderizar apenas quando a transição fizer sentido.

Tela: CRM / Clientes
─────────────────────────────────────
ALTO     → Em mobile a tabela não prioriza `nome/status/ação` e esconde o resto fora da área visível — criar variante mobile por prioridade de coluna.
MÉDIO    → Proporção de colunas comprime data, status e ações — redistribuir largura com foco no nome do cliente.
MÉDIO    → Coluna `Status` é inútil porque tudo está `Ativo` — remover ou substituir por estado realmente variável.

Tela: CRM / Histórico
─────────────────────────────────────
CRÍTICO  → Lista uniforme de 8 itens foi resolvida como cards, não tabela — converter para tabela semântica.
ALTO     → Mesmo dado já existe em tabela em `Produção`, mas aqui muda para card — normalizar componente por entidade.
MÉDIO    → Cards têm padding demais para pouco conteúdo — reduzir densidade e altura.

Tela: Planejamento de Campanhas
─────────────────────────────────────
ALTO     → A tabela trunca nomes e públicos a ponto de ficar ilegível — redistribuir colunas e mostrar menos campos por breakpoint.
ALTO     → Em mobile a tela mantém a tabela desktop inteira sem priorização — colapsar para `campanha/status/ação`.
MÉDIO    → KPI de CPL e leads não conversa com a profundidade da tabela — revisar equilíbrio entre resumo e detalhe.

Tela: Produção / Design
─────────────────────────────────────
MÉDIO    → Coluna de ações fica apertada com 3 CTAs visíveis — reduzir ações visíveis e usar overflow.
MÉDIO    → Coluna `Tipo` é fixa em todas as linhas (`Design`) — remover e devolver largura ao título.

Tela: Produção / Copywriting
─────────────────────────────────────
CRÍTICO  → Cabeçalhos não descrevem os dados renderizados — trocar `Tipo/Palavras/Deadline/Status` por `Tipo de arquivo/Tamanho/Enviado por/Ação`.
ALTO     → A tabela parece incorreta mesmo funcionando — alinhar `thead` ao dataset de arquivos.
MÉDIO    → Em mobile a estrutura continua desktop e empurra conteúdo para scroll lateral — criar recorte móvel por prioridade.

Tela: Produção / Landing Pages
─────────────────────────────────────
CRÍTICO  → Cabeçalhos não correspondem ao conteúdo real dos relatórios — rebatizar colunas para `Data/Resumo/Ação` ou mudar o renderer.
ALTO     → A entidade “relatório” muda de tabela em um módulo para card em outro — unificar padrão.
MÉDIO    → Em mobile o detalhe útil some fora da largura visível — criar versão compacta por item.

Tela: Gestão de Tráfego
─────────────────────────────────────
ALTO     → Em mobile a tabela mantém todas as colunas financeiras e métricas, ocultando ação prioritária — colapsar colunas secundárias.
MÉDIO    → Cabeçalhos curtos ainda truncam porque as colunas têm padding excessivo — reduzir padding de colunas numéricas e de status.

Tela: Dados & Analytics
─────────────────────────────────────
CRÍTICO  → A tabela `Performance por Cliente` mostra cabeçalhos de um dataset antigo e linhas de outro — corrigir imediatamente a semântica da tabela.
ALTO     → KPI de receita quebra visualmente em duas linhas — impedir wrap em valores monetários longos.
ALTO     → Em 1024 px e mobile o topo fica sobrecarregado com filtros e CTA — manter filtros essenciais e mover ação secundária.

Tela: Financeiro Interno
─────────────────────────────────────
CRÍTICO  → `Margem por Cliente` é uma tabela de 7 colunas feita com `div` — converter para tabela real.
CRÍTICO  → `Lançamentos financeiros` usa cards uniformes para cobranças e faturas — converter para tabela por entidade ou feed tabular segmentado.
ALTO     → Topbar já quebra em 1280 px e explode em mobile — reduzir ações visíveis e agrupar em overflow.
MÉDIO    → Botões do feed têm 34 px de altura e até 4 ações por card — subir targets para 44 px e racionalizar a ação primária.

Tela: Controle de Acesso / Membros
─────────────────────────────────────
ALTO     → Em mobile só nome e badge ficam visíveis; presença e ação desaparecem fora da largura — criar versão móvel priorizada.
MÉDIO    → Link `Remover` tem alvo muito pequeno — transformar em botão terciário com 44 px mínimos.

Tela: Controle de Acesso / Perfis
─────────────────────────────────────
MÉDIO    → A página está consistente, mas herda topbar mobile muito alta — manter só CTA principal e reduzir ruído.

## ENTREGA 2 — Problemas sistêmicos

1. Tabelas com semântica quebrada ou cabeçalhos desatualizados
Afeta: 3 telas.
Causa raiz: O HTML estático do `thead` ficou desacoplado dos renderizadores dinâmicos.
Correção sistêmica: Criar definição única de colunas por tela e gerar `thead` e `tbody` a partir da mesma configuração.

2. Estratégia responsiva baseada em `overflow-x:auto` e `min-width` fixa
Afeta: 7 telas.
Causa raiz: O produto preserva a tabela desktop em todos os breakpoints e terceiriza a responsividade para scroll horizontal.
Correção sistêmica: Definir prioridade de colunas por breakpoint e gerar layouts compactos reais para 1024/768/375.

3. Topbars com excesso de ações visíveis
Afeta: 15 telas.
Causa raiz: Toda ação de contexto foi mantida na barra superior sem hierarquia móvel.
Correção sistêmica: Adotar padrão `CTA principal + overflow + filtros essenciais`, com limite máximo de 2 controles visíveis no mobile.

4. Ações destrutivas sem confirmação
Afeta: 8 telas.
Causa raiz: O sistema não possui componente padrão de confirmação antes de exclusão.
Correção sistêmica: Implementar modal de confirmação único para exclusões e ações irreversíveis.

5. Uso de cards em listas uniformes
Afeta: 3 áreas em 2 telas.
Causa raiz: Falta de regra clara de escolha entre card, lista e tabela.
Correção sistêmica: Formalizar no design system que listas com 4+ itens e 3+ colunas fixas são tabela.

6. Alvos interativos abaixo de 44x44 px
Afeta: 16 telas.
Causa raiz: O sistema usa `btn-sm` de 33 px e links textuais como ação operacional.
Correção sistêmica: Subir o tamanho mínimo dos targets e abolir links operacionais minúsculos como ação principal.

7. Empty states sem próxima ação
Afeta: 8 telas.
Causa raiz: `UI.empty` foi pensado como mensagem, não como etapa de continuação de fluxo.
Correção sistêmica: Tornar CTA contextual parte obrigatória do componente de empty state.

8. Validação e erro concentrados em toast global
Afeta: todos os fluxos modais relevantes.
Causa raiz: O submit central trata falha no catch com `showToast`, sem modelo de erro inline.
Correção sistêmica: Adotar sistema de erro por campo + resumo inline do formulário.

9. KPIs monetários sem contenção tipográfica
Afeta: 4 telas.
Causa raiz: Cartões têm largura rígida e valor usa wrap livre.
Correção sistêmica: Definir regras para `nowrap`, abreviação e escala adaptativa dos KPIs.

10. Mistura de estilos secundários
Afeta: múltiplas telas do shell.
Causa raiz: Não existe taxonomia firme entre botão secundário, terciário e destrutivo.
Correção sistêmica: Consolidar tokens e componentes de ação com estados e pesos bem definidos.

## ENTREGA 3 — Correções de alto impacto

1. Financeiro: trocar `Margem por Cliente` de grid-div para tabela
Antes: bloco com `div.fin-row` simulando 7 colunas.
Depois: tabela real com `Cliente | Faturado | Custo | Recebido | Status | Margem | Ações`, alinhamento numérico e linha clicável.

2. Financeiro: transformar `Lançamentos financeiros` em tabela segmentada
Antes: feed vertical de cards para custos, cobranças e faturas.
Depois: tabs `Custos | Cobranças | Faturas`, cada uma com tabela própria e colunas coerentes.

3. Analytics: alinhar cabeçalhos ao dataset real
Antes: `Sessões | Bounce Rate | Conv. Rate | Alcance Social | Engaj.` mostrando `leads | receita | impressões | cliques | período`.
Depois: `Cliente | Leads | Receita | Impressões | Cliques | Período | Score`.

4. Produção / Copywriting: corrigir semântica da tabela de arquivos
Antes: headers `Tipo | Palavras | Deadline | Status`.
Depois: `Tipo de arquivo | Tamanho | Enviado por | Ação`.

5. Produção / Landing Pages: corrigir semântica da tabela de relatórios
Antes: headers `Cliente | Objetivo | Conversão | Status`.
Depois: `Cliente | Data do relatório | Resumo | Ação`.

6. Campanhas: refazer proporção de colunas
Antes: nome e público-alvo truncados a ponto de virar abreviação ilegível.
Depois: `Campanha` e `Público` mais largos; `Canal`, `Status`, `Início` e `Ações` comprimidos; mobile com apenas `Campanha | Status | Ação`.

7. CRM / Histórico: converter cards em tabela
Antes: 8 cards idênticos com título, cliente e badge.
Depois: tabela enxuta com `Item | Cliente | Tipo | Status | Data`.

8. Mobile topbar: reduzir ruído de ação
Antes: CRM, Calendário, Analytics e Financeiro empilham 3 a 5 controles no topo.
Depois: 1 CTA primário visível, filtros colapsáveis e ações secundárias em menu.

9. Sistema de confirmação destrutiva
Antes: exclusão executa direto ao clicar.
Depois: modal de confirmação com título, impacto e CTA destrutivo explícito.

10. Sistema de alvo interativo e CTA por contexto
Antes: vários botões com 33 px e links operacionais de 16 px.
Depois: todo alvo interativo com mínimo 44x44 px e ações secundárias convertidas em botões compactos de toque real.

## ENTREGA 4 — Checklist de aprovação por tela

- Listagem com 4+ itens uniformes é tabela, não cards
- Colunas de texto longo são mais largas que colunas de dado curto
- Dado monetário alinhado à direita
- Status é badge colorido, não texto simples
- Estado vazio tem botão de ação primária
- Nenhum texto de teste ou placeholder visível
- Ação destrutiva pede confirmação
- Acentuação correta em todo texto visível
- Nenhum valor `null`, `undefined` ou `Invalid Date` visível
- Hierarquia clara: título > subtítulo > dado > metadado
- Botão de submit desabilitado durante envio
- Skeleton no estado de loading com layout igual ao conteúdo real
- Espaço em branco tem intenção — não é conteúdo faltando
- Ação destrutiva visualmente menos prominente que ação primária
- Em 768 px o layout não quebra nem tem scroll horizontal de página
