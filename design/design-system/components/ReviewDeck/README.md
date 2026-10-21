Pilha de entradas novas em forma de ticket: uma por vez, com o valor grande, o pagador e três botões, Serviços, Comércio e Não é faturamento.

**Use** na tela Revisar, só para entradas que o app ainda não sabe classificar.

**O consumidor fornece:** `entries` (`{ id, date, value, payer, description }`), `onDecide` para somar ao total e `onUndo` para desfazer; opcionalmente `doneTitle` e `doneText`.

- A entrada decidida sai para a direita (faturamento) ou para a esquerda (fora), e a próxima sobe da pilha.
- Pontos no topo mostram o progresso e "2 de 4" diz o mesmo por escrito.
- "Desfazer a última" fica sempre disponível depois da primeira decisão.
- Ao terminar, um círculo com check é desenhado e o texto explica o que acontece com os próximos extratos.
