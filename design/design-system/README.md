Meu MEI é uma ferramenta pessoal, de um único usuário, que lê o extrato do Nubank PJ e mostra quanto o MEI faturou no mês e no ano, separado em serviços e comércio, contra o limite de R$ 81.000. Tudo roda no computador da pessoa. As telas são de trabalho: lidas de relance, operadas em poucos cliques, sem enfeite.

## Conteúdo e voz

- Escreva em português do Brasil, falando com a pessoa por **você**. Frases curtas e diretas: "4 entradas para revisar", não "Existem itens pendentes de revisão".
- Use os nomes que a pessoa conhece: **faturamento**, **extrato**, **entrada**, **saída**, **DAS**, **DASN-SIMEI**. Nunca exponha nomes internos (hash, regra, tabela).
- Caixa de frase em títulos e botões: "Importar extrato", "Revisar agora". Caixa alta só no estilo `label`.
- Dinheiro sempre como **R$ 1.500,00**, com ponto no milhar e vírgula nos centavos. Percentual do limite sem casas decimais: "74% do limite".
- Datas curtas em listas ("03 out"), completas em prazos ("vence 20/11/2026").
- Alertas dizem o fato e a consequência, sem susto: "No ritmo atual, o ano fecha perto de R$ 71.900, dentro do limite."
- O app não envia a declaração. Nunca escreva "enviar" ou "declarar" num botão; use "Copiar valores" ou "Ver resumo".
- Sem emoji.

## Cor

- Fundo da tela em `surface`; cartões, barra lateral e tabelas em `surface-raised` com borda `line`. Prefira bordas a sombras.
- Texto em `ink`; rótulos, datas e contrapartes em `ink-muted`. Valores em dinheiro sempre em `ink`.
- `brand` marca uma coisa por região: o botão principal, o item ativo do menu e o foco. Texto sobre `brand` usa `on-brand`. O anel de foco é sólido, 2px, em `brand`.
- `servicos` e `comercio` identificam as duas categorias da DASN em gráficos e no seletor de categoria. Nunca use as duas para outra coisa, e sempre mostre a palavra junto (legenda ou rótulo).
- Status do limite: abaixo de 70% neutro; de 70% a 90% `warning` sobre `warning-surface`; acima de 90% ou estourado, `danger`. `success` só para importação concluída e entrada confirmada. Status sempre vem com palavra escrita, nunca só cor.

## Tipografia

- Instrument Sans para texto (`display`, `title`, `heading`, `body`, `label`); IBM Plex Mono para números (`figure-lg`, `figure`). As duas vêm do Google Fonts.
- Um `display` por tela, como título. Títulos de cartão em `title`.
- Todo valor em dinheiro usa `figure` ou `figure-lg`, alinhado à direita em colunas, para os centavos baterem.

## Espaço, forma e layout

- O app é pensado para celular: telas de 390px, margem lateral de 20px, barra de abas flutuante embaixo com o botão Importar elevado no centro.
- O Painel abre com uma faixa escura (`#0c2a27`) que termina numa onda, com o `LimitGauge` no meio. O resto da tela fica sobre `surface`.
- Fuja do cartão retangular com um número dentro. Use formas que dizem algo: arco para o limite, cápsulas para os meses, uma barra dividida para as categorias, ticket com recortes para entradas a revisar, recibo com borda serrilhada para a leitura do extrato e para a declaração, linha do tempo para prazos e histórico.
- Seções separadas por 28px e títulos de seção em `title`; dentro delas, conteúdo solto sobre o fundo, sem moldura.
- Cantos: `radius-lg` em faixas, `radius-md` em botões e campos, `radius-full` em etiquetas e chaves; tickets usam 28px.
- Alvos de toque com pelo menos 44px. Ordem de cada tela: o resumo vem antes do detalhe.

## Movimento

- Números contam até o valor (`AnimatedNumber`), arcos e anéis se preenchem, barras crescem em sequência, e o que acaba de aparecer sobe 12px.
- Cada animação dura entre 0,3s e 1,5s e roda uma vez. Só o anel da área de envio e o pulso na ponta do medidor ficam em loop.
- Com movimento reduzido no sistema, tudo aparece pronto, sem animação.

## Componentes

`window.MeuMEI` traz os componentes do app em React 18: `LimitGauge`, `AccumulatedChart`, `LimitTrack`, `AnimatedNumber`, `MonthBars`, `SplitBar`, `ReviewDeck`, `CountdownRing` e `ScanDrop`. Para o topo do Início há três formas do limite: `LimitGauge` (arco), `AccumulatedChart` (curva acumulada com projeção) e `LimitTrack` (barra de orçamento); use uma só por tela. Use-os sempre que a tela mostrar essas coisas, em vez de redesenhar à mão. Para usar num canvas, carregue `components/bundle.css` e depois `components/bundle.js`; o React já vem com a página.

## Gráficos

- Faturamento por mês é uma barra empilhada por mês: `servicos` embaixo, `comercio` em cima, 2px de espaço entre os segmentos e topo em `radius-sm`.
- Linha tracejada em `ink-muted` marca a média permitida de R$ 6.750/mês. Grade e eixos discretos, em `line`.
- Legenda sempre visível com as duas palavras. Meses sem extrato aparecem vazios, não com zero desenhado.

## Ícones

Ainda não há um conjunto de ícones. Por enquanto, use pontos coloridos, etiquetas com texto e o "!" dentro de um círculo para alertas. Se um conjunto for adotado, ele precisa ter traço único e cor herdada do texto.
