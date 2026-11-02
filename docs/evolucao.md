# Evolução: visão geral e por exercício

A tela abre em Visão geral e permite alternar para Por exercício. Nenhum dado fictício é gerado. Somente sessões finalizadas com todos os exercícios válidos e concluídos entram nas análises. Exercícios de históricos antigos, de tipos anteriores ou de rotinas removidas/importadas permanecem consultáveis.

## Períodos

Últimos 30 dias, 90 dias (padrão), todo o histórico ou intervalo personalizado de até cinco anos. A data usada é a conclusão da sessão no fuso do aparelho. Bordas do período são inclusivas. Datas inválidas, invertidas e futuras recebem alerta. Períodos vazios mostram um estado vazio, sem supor desempenho zero.

## Visão geral

- Quantidade de treinos, dias ativos, séries de musculação, minutos de cardio, duração média e duração total das sessões.
- Calendário de até 84 dias do período, com destaque para um ou vários treinos no dia.
- Frequência semanal (segunda a domingo), ou mensal para intervalos acima de 140 dias. Intervalos sem treino têm contagem zero; a primeira/última semana ou mês podem ser parciais.
- Minutos de cardio por semana/mês, separados da musculação.
- Séries concluídas por grupo muscular e data da última execução no período. Contagem baseada apenas no grupo principal cadastrado.
- Últimos resultados por exercício, com atalho para o detalhe.
- Histórico completo das sessões, expansível para consultar exercícios, séries, cargas, repetições e cardio. Inicialmente mostra dez sessões; o restante pode ser exibido.

## Por exercício

Filtro por exercício, treino de origem e quantidade de séries quando houver estruturas diferentes. A biblioteca e o histórico fornecem as opções; IDs e tipos diferentes ficam separados, mesmo que os nomes coincidam. Exercícios sem registro mostram orientação para concluir uma sessão.

Musculação: maior carga em uma série, maior número de repetições em uma série (com peso e data), maior volume de sessão e seus respectivos contextos. Os melhores registros respeitam o período e filtros.

Gráficos selecionáveis: carga máxima por sessão, repetições totais, volume (soma de carga × repetições) e repetições com um peso escolhido. Neste último, entram somente séries daquele peso; sessões sem o peso são omitidas, não recebem zero. A tabela indica quantas séries contribuíram.

Cardio: duração de cada sessão, maior duração, duração média, minutos acumulados e distribuição semanal/mensal. Tempo não determina automaticamente melhora ou piora do condicionamento.

Todos os gráficos têm datas reais no eixo horizontal, eixo vertical a partir de zero, unidades explícitas e tabela de valores acessível. Um único registro é mostrado como ponto, sem inventar uma tendência. Não há interpolação de resultados em dias sem exercício. Valores grandes do eixo são abreviados; valores completos ficam na tabela.

## Comparações

A tendência usa o último registro do recorte e até três anteriores do mesmo exercício/tipo, treino, grupo muscular e número de séries. Compara carga média por série e repetições totais. Nenhuma cai e alguma sobe: Melhor. Nenhuma sobe e alguma cai: Abaixo. Ambas iguais: Mantido. Direções opostas: Resultado misto. Sem referência compatível, não classifica.

Também é possível escolher dois registros manualmente. Treinos ou estruturas diferentes são identificados, sem classificação automática. A tabela mostra todas as séries lado a lado. O mapa de séries reúne as sessões em ordem recente, com rolagem interna para muitas colunas. Cardio usa durações no lugar de séries.

Maior volume pode resultar de adicionar séries; maior peso pode vir acompanhado de menos repetições. A interface apresenta esses contextos, sem uma pontuação única de evolução. Duração do treino inclui o comportamento já existente do cronômetro total e não representa intensidade.

## Validação

Testes cobrem sessões completas, datas locais e limites de período, estruturas incompatíveis, média de três referências, carga fixa, recordes, cardio, agrupamento semanal/mensal, lacunas no calendário e IDs históricos distintos. Conferência manual com históricos em origens de teste separadas: panorama, gráfico de musculação, comparação por peso, intervalo inválido/vazio, detalhe de cardio e ausência de overflow em 320/390 px. Dados da origem habitual não foram modificados.
