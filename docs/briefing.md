# App pessoal de controle de faturamento MEI

## Objetivo
App para uso próprio (um único usuário) que lê o extrato mensal da conta PJ no Nubank e calcula o faturamento do MEI, deixando pronto o total para a declaração anual (DASN-SIMEI).

## Contexto
- O usuário é MEI.
- Limite de faturamento: R$ 81.000/ano (média de R$ 6.750/mês).
- A DASN-SIMEI pede apenas: faturamento anual com comércio/indústria, faturamento anual com serviços e se houve funcionário. Prazo: 31 de maio de cada ano. É obrigatória mesmo sem faturamento.
- O app NÃO envia a declaração. A entrega é feita pelo Portal do Simples Nacional ou pelo App MEI; o app só prepara os números.
- A DASN-SIMEI não substitui o IRPF da pessoa física.

## Entrada de dados
- O Nubank PJ envia o extrato por e-mail, em PDF. Não há opção de CSV/OFX (a confirmar se o e-mail permite escolher o formato).
- Precisa de um leitor de PDF que extraia as linhas de movimentação: data, descrição, valor, entrada/saída.
- O PDF de exemplo será fornecido pelo usuário (com nome, CNPJ e conta cobertos). Construir o parser em cima dele.

## Decisões já tomadas
- Uso pessoal: Python rodando localmente, dados não saem do computador.
- Armazenamento local (SQLite).

## Funcionalidades do MVP
1. Importar o PDF do extrato mensal.
2. Listar as entradas e permitir marcar o que é faturamento (ficam de fora: transferências próprias, empréstimos, reembolsos). Idealmente lembrar as marcações para descrições parecidas.
3. Categorizar cada faturamento como serviços ou comércio.
4. Mostrar total por mês e total do ano, separado por categoria.
5. Alertar quando o faturamento acumulado se aproximar de R$ 81.000.

## Depois do MVP
- Lembrete da guia mensal (DAS) e do prazo anual.
- Lista de comprovantes por mês, para histórico.

## Próximo passo
Receber um PDF real de extrato e construir o parser a partir dele.
