# Academia

Base Angular 21 para iPhone: PWA instalável, offline e IndexedDB. Sem backend. Cadastro básico de treinos e acompanhamento por série com histórico local.

Hoje acompanha a sessão, os músculos-alvo, cronômetros e evolução após finalizar. Treinos configura a sequência e os exercícios. Evolução reúne panorama da rotina e análises por exercício. Configurações oferece reset, importação e exportação. Consulte [docs/navegacao.md](docs/navegacao.md) para regras e limitações.

## Executar

Node 22.12+ (linha 22) ou Node 24+. Consulte a [compatibilidade do Angular](https://angular.dev/reference/versions).

```sh
npm ci
npm start
npm test
npm run build
npm run preview
```

Na primeira instalação sem lockfile: npm install. Service worker só em produção: testar offline com build + preview em localhost:8080. Abrir online, aguardar o worker controlar a página, recarregar e testar offline. Hospedagem precisa de HTTPS.

## Arquitetura

- src/app/core/storage: banco versionado e repositórios. Escritas aguardam conclusão da transação. Evoluções exigem migração em upgrade e incremento da versão.
- src/app/core/pwa: conectividade, atualização por ação do usuário e recuperação de cache.
- src/app/features: funcionalidades carregadas sob demanda. Adicionar domínio, acesso a dados e apresentação conforme necessário.
- src/app/app.ts: estrutura visual global.
- src/styles.scss: estilos e áreas seguras do iPhone.
- public: manifesto e ícones locais.

Componentes standalone, TypeScript estrito, signals e injeção de dependências. Regras de negócio ficam em funções/classes de domínio; componentes usam repositórios. Componentes compartilhados ficam em `src/app/shared/ui`.

Rotas com hash permitem hospedagem estática sem reescrita. Cache offline contém recursos do app; dados ficam no IndexedDB separado do cache.

## iPhone e dados

No Safari abra a URL HTTPS e escolha Compartilhar > Adicionar à Tela de Início. Abra pelo ícone com internet e aguarde o carregamento para preparar offline. A primeira visita exige rede e o sistema pode remover o cache. Dados são específicos deste navegador, aparelho e domínio. Limpar dados do site apaga registros. Não há sincronização ou backup em nuvem. A exportação JSON transfere a rotina, sem incluir o histórico de resultados.

## Hospedagem

O workflow manual [.github/workflows/pages.yml](.github/workflows/pages.yml) compila, testa e publica no GitHub Pages. Habilite Pages com fonte GitHub Actions no repositório e execute Publicar Academia. A base é calculada para páginas de projeto; em domínio próprio, ajuste para `/`.

Qualquer host estático HTTPS pode servir dist/academia/browser. Na raiz: npm run build. Subpasta: npm run build -- --base-href /academia/.

## Validação

npm test verifica persistência após fechar e reabrir o banco com fake-indexeddb. Build verifica tipos, templates e geração do worker. Instalação e offline no Safari precisam de validação física no iPhone.



