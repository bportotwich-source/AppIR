# Meu MEI

App pessoal para controlar o faturamento do MEI a partir do extrato mensal da conta PJ no Nubank. Ele lê o PDF, separa o que é faturamento (serviços ou comércio), mostra o total por mês e por ano contra o limite de R$ 81.000 e deixa prontos os números da DASN-SIMEI.

Uso de uma pessoa só. É um app web instalável no celular (PWA): o extrato é lido e guardado no próprio aparelho e não vai para nenhum servidor.

## Estado

- **Design:** aprovado em versão para celular. Fontes em [`design/`](design/).
  - [`design/design-system/`](design/design-system/): cores, tipografia, regras de uso e a biblioteca de componentes animados (`window.MeuMEI`), usada direto pelo app.
  - [`design/telas/`](design/telas/): telas Início, Importar extrato, Revisar entradas e Declaração anual.
- **App:** [`app/`](app/), Vite + React + TypeScript.
  - `src/core/parser.ts`: leitura do PDF com pdf.js. Heurístico; será ajustado com um extrato real.
  - `src/core/banco.ts`: movimentações, marcações e memória por pagador.
  - `src/core/relatorio.ts`: totais por mês e categoria, alertas do limite e projeção do ano.
  - `src/core/store.ts`: gravação no navegador (IndexedDB) e backup em arquivo.
  - `src/telas/`: as quatro telas do design.
- **Briefing:** [`docs/briefing.md`](docs/briefing.md).

## Rodar

```sh
cd app
npm install
npm run dev      # abre em http://localhost:5173
npm test         # testes das regras de negócio
```

Cada push na `main` testa e publica o app no GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Privacidade

O `.gitignore` bloqueia PDFs, backups do app, a pasta `dados/` e arquivos de banco. Não suba extratos reais para o repositório.
