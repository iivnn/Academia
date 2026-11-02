# Navegação e treino do Academia

Importação e exportação em Configurações estão documentadas em [importar-exportar.md](importar-exportar.md).

A tela Evolução está implementada em duas visões; veja [evolucao.md](evolucao.md).

A barra inferior mantém Hoje, Treinos e Evolução. Configurações fica no cabeçalho. Hoje acompanha sessões, Treinos organiza a biblioteca/rotina, Evolução analisa o histórico e Configurações oferece reset e transferência de rotinas.

## Treinos

A área Treinos tem duas abas: Meus treinos e Exercícios. A biblioteca cadastra nome e grupo muscular uma única vez. Ao montar um treino, selecionam-se exercícios existentes e definem-se ordem, séries (1–20) e descanso (0–1800 segundos). Não há cadastro de nome/grupo dentro do treino. O mesmo exercício pode ser reutilizado em diferentes treinos, sem duplicação dentro do mesmo treino. O cadastro cria identificadores estáveis para permitir comparar o mesmo exercício entre sessões. Treinos podem ser reordenados e editados quando não houver sessão em andamento. A sessão usa uma cópia da configuração para preservar o histórico.

## Hoje

Sem treinos, oferece acesso ao cadastro. Com rotina, mostra o próximo treino e um corpo esquemático de frente/costas com os grupos-alvo destacados. A sequência independe do dia da semana.

Começar cria uma sessão com horário inicial persistido. Uma tela mostra um exercício por vez; o indicador compacto apresenta o anterior e o próximo. As séries são preenchidas em ordem, com carga e repetições, confirmação e descanso. Depois das séries, a passagem ao próximo exercício exige confirmação. Séries anteriores podem ser corrigidas sem apagar as outras. O treino só pode ser finalizado quando todas as séries forem válidas e concluídas.

Carga zero significa sem carga externa. Decimais aceitam vírgula ou ponto. Repetições precisam ser inteiras e positivas. Nada é marcado automaticamente como realizado.

## Cronômetros e persistência

Duração total é calculada a partir de startedAt; descanso usa restUntil. Ao reabrir o app, os tempos são recalculados pelo relógio, sem depender de intervalos ativos em segundo plano. A duração inclui o tempo em que o app ficou fechado; não há pausa nesta versão. Descanso pode ser pulado. Sem som ou notificação em segundo plano.

Alterações de campos, séries e navegação são persistidas no IndexedDB; a tela informa enquanto salva e em caso de falha. Escritas são serializadas. No erro, manter a aba aberta e usar Tentar novamente. Conclusão grava histórico, encerra sessão e avança a sequência em uma única gravação do estado. Não há ação de abandono: sair mantém a sessão disponível para retomar.

Banco v2 adiciona training preservando settings do v1. O estado inclui treinos, ponteiro da sequência, sessão ativa e histórico. Dados são exclusivos desta origem/navegador/aparelho, sem sincronização. Backup ainda não foi implementado.

## Comparações

Somente sessões anteriores do mesmo treino, com os mesmos exercícios e número de séries, são equivalentes. A referência é o último equivalente e a média dos últimos três disponíveis. Sem referências, a sessão vira a primeira referência.

Por exercício, comparamos carga média por série e repetições totais. Ambas iguais: mantido; nenhuma cai e alguma sobe: melhor; nenhuma sobe e alguma cai: abaixo; direções diferentes: resultado misto. O resumo do treino só indica melhor/abaixo se os exercícios concordarem (permitindo os mantidos); divergências dão resultado misto. O resumo expõe números e critérios. Alterar a estrutura das séries/exercícios inicia uma nova referência equivalente.

## Validação

Testes automatizados cobrem validação de registros, snapshot de sessão, sequência/retorno ao início, comparação mista, média dos três equivalentes e migração/persistência do banco. Teste manual em origem separada (porta 8081) confere cadastro, retomada após recarregar, descanso, passagem dos exercícios e sequência A → B → A. A origem habitual 8080 não recebe dados fictícios.

## Biblioteca de exercícios

Exercícios dos treinos antigos são migrados automaticamente para a biblioteca na leitura do estado, mantendo os IDs e o histórico. Editar um exercício atualiza nome/grupo nos treinos que o utilizam; sessões históricas continuam com o snapshot original. Configuração da biblioteca fica bloqueada durante uma sessão ativa. A estrutura física do IndexedDB permanece v2, pois a biblioteca é um campo aditivo no mesmo estado persistido. Campos de rascunho do treino são preservados enquanto se alternam as duas abas na mesma visita à tela.


## Exclusão no mobile

Cada cartão de treino/exercício tem uma lixeira com área de toque de 48px e nome acessível. A confirmação abre como painel inferior no celular, com Cancelar em foco e confirmação explícita; no desktop, abre centralizada. Escape cancela. Treinos excluídos saem da sequência e, se forem o próximo, dão lugar ao sucessor (com retorno ao início). Biblioteca e histórico são preservados. Exercícios usados por treinos salvos ou pelo rascunho aberto não podem ser excluídos; o diálogo identifica os vínculos. Exclusões ficam bloqueadas durante sessão ativa. A confirmação não apaga registros históricos e não oferece desfazer.

## Equipamento ocupado: fazer depois

Durante a sessão, Fazer depois mantém as séries já concluídas e os campos parciais, marca o exercício como pendente e segue para outro exercício ainda não concluído. A ordem do treino cadastrado não muda. O cronômetro total e o descanso atual são preservados. Pendências aparecem em Para fazer depois e podem ser retomadas a qualquer momento. A lista Todos os exercícios permite navegação livre; sair de um exercício incompleto também o marca para depois.

Ao concluir os demais, a ação principal retorna ao exercício pendente anterior, inclusive quando ele está antes do último exercício na ordem original. Se só faltar o atual, Fazer depois fica indisponível e a tela explica que ele ainda precisa ser concluído. Não há conclusão automática nem descarte de exercícios. Finalizar treino continua exigindo todas as séries concluídas. O adiamento e a posição atual são persistidos e recuperados ao reabrir.

## Cardio por duração

A biblioteca oferece tipos Musculação e Cardio. Exercícios antigos sem tipo continuam sendo musculação. Cardio exige apenas nome e tipo; não tem grupo muscular alvo, séries, carga, repetições ou descanso configurável. Na montagem do treino ele é selecionado pela mesma biblioteca e pode ser combinado com musculação.

Começar o treino inicia a duração total, mas cada cardio tem seu próprio botão Iniciar cardio. O cronômetro mede até Encerrar cardio; Pausar e Retomar preservam o acumulado. Continuar cardio reabre um cardio encerrado e soma mais tempo à mesma atividade. O relógio é persistido por horário inicial e tempo acumulado: se fechar o app enquanto estiver rodando, continuará contando ao reabrir. Navegar para outro exercício ou usar Fazer depois pausa automaticamente o cardio atual, mantendo-o pendente até encerrá-lo.

O progresso conta cada série de musculação e cada cardio encerrado como etapas. Um cardio não iniciado, pausado ou em andamento impede finalizar. Treinos só de cardio não mostram o mapa muscular nem quantidade de séries. No resumo, cardio mostra duração atual, duração anterior e média de até três treinos equivalentes. A duração não entra na classificação melhor/abaixo da musculação; mais tempo sozinho não demonstra melhora. Alterar o tipo de exercício impede comparação com registros do tipo anterior, preservando os snapshots históricos.

Validação: 24 testes cobrem os fluxos anteriores e cardio (início, pausa, retomada, conclusão, navegação, persistência e comparações). Cadastro, ausência dos campos de musculação, recarga do cronômetro, pausa/retomada e resumo foram conferidos no navegador em origem de teste separada (porta 8082).

## Reset dos dados

Configurações oferece Apagar todos os dados. A confirmação lista biblioteca, treinos, sessão/cronômetros, histórico e preferências; Cancelar recebe foco inicial. Somente Apagar tudo executa o reset. A exclusão limpa todos os object stores do banco em uma única transação, após aguardar gravações em andamento e invalidar as pendentes. O estado em memória volta ao inicial; uma mensagem de sucesso permite retornar a Hoje. Outras instâncias atualizadas do app recebem aviso de reset por BroadcastChannel. Os arquivos de instalação/cache offline permanecem para continuar usando o app.

O teste usa um banco isolado com sessão cardio, biblioteca, treinos, histórico e preferências; confirma que tudo é removido, reabre o banco e grava um estado novo. A interface mobile e o cancelamento foram conferidos sem executar reset nos dados do usuário. Total: 25 testes aprovados e build de produção validado.


## Base fictícia para explorar a interface

No fim de Configurações, Carregar dados de teste abre confirmação explícita. A ação substitui todos os dados locais (inclusive histórico, sessão e preferências) por uma base sintética. Não executa automaticamente ao abrir o app. A limpeza e a gravação da base ocorrem na mesma transação; se falhar, os dados anteriores são preservados.

A base tem 180 sessões concluídas em quase um ano, 3 treinos em sequência e 14 exercícios (12 de musculação e 2 de cardio). Há mais de duas mil séries, progressões de carga, repetições variadas, quedas, resultados mistos e mudanças de estrutura nos registros antigos. Todas as sessões são válidas, com datas anteriores ao dia atual. Não há sessão ativa após carregar.

O estado recebe um marcador de dados de teste, exibido em um aviso global. Para recriar a base, usar o mesmo botão; para remover tudo, usar o reset. Exportar JSON guarda apenas a rotina, sem histórico. Importar uma rotina mantendo histórico fictício conserva o aviso de testes. Os testes verificam geração determinística, diversidade de análises e substituição persistida com limpeza das preferências.
