# Academia · identidade visual

Direção: RPG clássico de 16 bits. Fundo escuro, molduras de dois pixels, sombras sólidas, cantos retos e detalhes verdes/dourados. Sem imagens externas ou efeitos piscantes. Ilustração do haltere feita em CSS.

## Tokens e tipografia

`src/styles/tokens.css` centraliza cores, espaçamento, fontes e sombras. Verde indica ação principal/evolução; dourado indica destaque/conquista; rosa indica erro/destruição; azul indica informação. Estados sempre recebem texto, sem depender apenas de cor.

Press Start 2P nos títulos e ações; fonte do sistema para textos, formulários, pesos e repetições. Fonte distribuída localmente em `public/fonts`, com licença OFL, e incluída no cache offline. Inputs com 16px para evitar zoom automático no iPhone. Controles têm altura mínima de 44px, foco visível e suporte a teclado.

## Componentes reutilizáveis

Importar de `src/app/shared/ui`:

| Componente | Uso |
| --- | --- |
| `button[appButton]` | Botão HTML nativo. `variant`: primary, secondary, ghost, danger. `disabled` nativo. `type` padrão button; configurar submit em formulários. |
| `app-panel` | Painel com projeção de conteúdo. `tone`: default ou gold. Cabeçalhos semânticos definidos pelo consumidor. |
| `app-badge` | Rótulo textual. `tone`: green, gold, muted, danger. |
| `app-field` | Label + hint/erro. Exige `controlId` e `label`; projetar input/select/textarea com o mesmo id. Associar `aria-describedby="ID-help"` quando houver hint/erro e `aria-invalid="true"` em erro. |
| `app-week-picker` | Seleção múltipla de dias. `[(selected)]` usa índices 0 (segunda) a 6 (domingo); botões com nomes completos acessíveis e aria-pressed. |
| `app-progress` | `label` obrigatório e `value` entre 0 e 100. Exibe percentual e progressbar acessível. |

Estilos globais para inputs, select, textarea, checkbox/radio, `.choice`, `.notice`, `.notice--success`, `.notice--danger`, `.eyebrow`, `.muted` e `.number`. Não remover o foco visível nem substituir controles HTML por divs clicáveis. Rótulos de unidade ficam explícitos em carga (kg) e repetições.

## Demonstração

A página inicial é um catálogo visual responsivo com treino, comparação de cargas, progresso, estado vazio e inventário de componentes. Valores são exemplos identificados e editáveis apenas na tela. Não há cadastro nem gravação dos dados de demonstração. Feedback dos botões ilustra confirmação e não simula persistência.

No mobile o catálogo usa uma coluna; no desktop, duas. Espaçamentos e molduras vêm do sistema; estilos de disposição ficam nos arquivos CSS da página. Criar novos componentes quando aparecer uma necessidade real, mantendo os tokens existentes.
