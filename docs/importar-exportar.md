# Importação e exportação da rotina

Configurações oferece exportar toda a rotina cadastrada, incluindo biblioteca, nomes/tipos de exercício, grupos musculares de musculação, treinos, ordem dos exercícios, séries, descansos e próximo treino da sequência. Resultados, histórico, preferências e sessão em andamento não são exportados. Esta função transfere uma rotina, e não é um backup de todos os dados pessoais do aplicativo.

## Formatos

- JSON: arquivo estruturado, reimportável no Academia.
- PDF: documento A4 paginado, com a sequência e biblioteca completas. É gerado localmente com jsPDF; o conteúdo visual é renderizado em alta resolução.
- Imagem: PNGs paginados. Cada página tem seu botão de download; baixar todas para guardar a rotina completa. A paginação evita criar uma imagem gigante incompatível com iPhone.

Após preparar a exportação, a tela oferece os links para baixar os arquivos. Nada é enviado a servidor. Arquivos temporários em memória são liberados ao sair da tela, preparar nova exportação ou efetuar reset. Downloads já salvos no aparelho continuam independentes do aplicativo.

## Importar JSON

Selecione o arquivo. O sistema valida tamanho máximo de 2 MB, formato `academia-routine`, versão 1, IDs únicos, referências, nomes, tipos, grupos musculares, séries, descansos e próximo treino. Limites: 500 exercícios de biblioteca, 100 treinos e 30 exercícios por treino. Cardio usa séries e descanso iguais a zero. O próprio exportador verifica se a rotina é reimportável antes de gerar arquivos.

Antes de alterar dados, o diálogo mostra nome do arquivo, quantidades e uma prévia dos nomes dos treinos. Cancelar mantém tudo. Confirmar substitui a biblioteca e todos os treinos, preservando a ordem importada, sem mesclar os anteriores. Uma sessão em andamento é descartada. Recomenda-se exportar o JSON atual antes de substituir.

Histórico e preferências são preservados. A importação atribui novos IDs aos treinos e exercícios, evitando associar resultados de uma rotina compartilhada ao histórico antigo por coincidência de identificadores. Por isso, os treinos importados começam com novas referências de evolução. A substituição é persistida em uma gravação atômica antes de atualizar a tela; falha de persistência mantém a rotina anterior.

## Estrutura JSON

```json
{
  "format": "academia-routine",
  "version": 1,
  "exportedAt": "2026-11-02T15:00:00.000Z",
  "catalog": [
    { "id": "supino", "name": "Supino", "kind": "strength", "muscle": "Peito" },
    { "id": "bike", "name": "Bicicleta", "kind": "cardio" }
  ],
  "workouts": [{
    "id": "treino-a",
    "name": "Treino A",
    "exercises": [
      { "exerciseId": "supino", "sets": 3, "restSeconds": 90 },
      { "exerciseId": "bike", "sets": 0, "restSeconds": 0 }
    ]
  }],
  "nextWorkoutId": "treino-a"
}
```

## Validação

Testes cobrem exportação/reimportação, limites, JSON inválido, versões desconhecidas, duplicidades e referências quebradas, preservação de histórico e preferências e substituição persistida. No navegador, foram gerados e baixados JSON, PDF e PNG em uma origem de teste separada; o PDF foi renderizado com Poppler e inspecionado visualmente. Alertas para arquivo inválido, prévia de arquivo válido e cancelamento foram conferidos sem substituir os dados do usuário. Layout sem overflow horizontal em 320px. A instalação e o salvamento no iPhone físico continuam dependendo de verificação no aparelho.
