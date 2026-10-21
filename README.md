# Meu MEI

App pessoal para controlar o faturamento do MEI a partir do extrato mensal da conta PJ no Nubank. Ele lê o PDF, separa o que é faturamento (serviços ou comércio), mostra o total por mês e por ano contra o limite de R$ 81.000 e deixa prontos os números da DASN-SIMEI.

Uso de uma pessoa só, rodando no próprio computador: os dados não saem dele.

## Estado

- **Design:** aprovado em versão para celular. Fontes em [`design/`](design/).
  - [`design/design-system/`](design/design-system/): cores, tipografia, regras de uso e a biblioteca de componentes animados (`window.MeuMEI`).
  - [`design/telas/`](design/telas/): telas Início, Importar extrato, Revisar entradas e Declaração anual.
- **Código:** rascunho em [`mei/`](mei/), parado até o design fechar.
  - `parser.py`: leitura do PDF. Heurístico; será ajustado com um extrato real.
  - `db.py`: banco SQLite local e memorização de marcações por pagador.
  - `relatorio.py`: totais por mês e categoria e alertas do limite.
- **Briefing:** [`docs/briefing.md`](docs/briefing.md).

## Privacidade

O `.gitignore` bloqueia PDFs, a pasta `dados/` e arquivos de banco. Não suba extratos reais para o repositório.
