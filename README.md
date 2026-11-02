# Academia

Base Angular 21 para iPhone: PWA instalável, offline e IndexedDB. Sem backend. Cadastro básico de treinos e acompanhamento por série com histórico local.

Hoje acompanha a sessão, os músculos-alvo, cronômetros e evolução após finalizar. Treinos configura a sequência e os exercícios. Evolução reúne panorama da rotina e análises por exercício. Configurações oferece reset, importação e exportação. Consulte [docs/navegacao.md](docs/navegacao.md) para regras e limitações.

## Executar

Node 22.12+ (linha 22) ou Node 24+. Angular 21 é compatível com o Node 22.17 instalado: https://angular.dev/reference/versions.

```sh
npm ci
npm start
npm test
npm run build
npm run preview
```

Na primeira instalação sem lockfile: npm install. Service worker só em produção: testar offline com build + preview em localhost:8080. Abrir online, aguardar o worker controlar a página, recarregar e testar offline. Hospedagem precisa de HTTPS.

Neste computador o npm global apresentou erro ao resolver dependências. A instalação foi concluída usando npm 11 temporário, sem alterar o global. Caso se repita, usar `npx --yes --package=npm@11 npm ci`. Se npm/npx falharem com `Cannot find module`, o executável funcional encontrado foi `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js"`; ele aceita os mesmos argumentos do npm.

## Arquitetura

- src/app/core/storage: banco versionado e repositórios. Escritas aguardam conclusão da transação. Evoluções exigem migração em upgrade e incremento da versão.
- src/app/core/pwa: conectividade, atualização por ação do usuário e recuperação de cache.
- src/app/features: funcionalidades carregadas sob demanda. Adicionar domínio, acesso a dados e apresentação conforme necessário.
- src/app/app.ts: estrutura visual global.
- src/styles.scss: estilos e áreas seguras do iPhone.
- public: manifesto e ícones locais.

Componentes standalone, TypeScript estrito, signals e injeção de dependências. Regras futuras ficam em funções/classes de domínio; componentes usam repositórios. Criar shared quando houver componentes realmente compartilhados. Nenhuma entidade de negócio antecipada.

Rotas com hash permitem hospedagem estática sem reescrita. Cache offline contém recursos do app; dados ficam no IndexedDB separado do cache.

## iPhone e dados

No Safari abra a URL HTTPS e escolha Compartilhar > Adicionar à Tela de Início. Abra pelo ícone com internet e aguarde o carregamento para preparar offline. A primeira visita exige rede e o sistema pode remover o cache. Dados são específicos deste navegador, aparelho e domínio. Limpar dados do site apaga registros. Não há sincronização ou backup em nuvem; planejar exportação/importação ao adicionar dados de negócio.

## Hospedagem

Jogo localizado em C:/Users/iivan/OneDrive/Documentos/Jogo, remoto iivnn/habit-game. Os arquivos locais não identificam o provedor usado. GitHub Pages fica preparado como opção inicial, sujeito à confirmação do provedor anterior. Nada publicado; nenhum repositório remoto criado.

O workflow manual .github/workflows/pages.yml compila, testa e publica no Pages. Enviar a um novo repositório GitHub, habilitar Pages com fonte GitHub Actions e executar Publicar Academia. Não reutilizar o repositório do Jogo. A base é calculada para páginas de projeto; em domínio próprio ajustar para /.

Qualquer host estático HTTPS pode servir dist/academia/browser. Na raiz: npm run build. Subpasta: npm run build -- --base-href /academia/.

## Validação

npm test verifica persistência após fechar e reabrir o banco com fake-indexeddb. Build verifica tipos, templates e geração do worker. Instalação e offline no Safari precisam de validação física no iPhone.



