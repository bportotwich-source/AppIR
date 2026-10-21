Anel que se preenche com um número no centro, para contar dias até um prazo.

**Use** no topo da Declaração anual, para os dias até 31 de maio, e em lembretes de DAS.

**O consumidor fornece:** `value` (dias), `max` (o que enche o anel), `label` (padrão "dias"), `sub` (lido por leitores de tela, como "até 31/05/2027"); opcionalmente `size`, `tone` e `color`.

- Use `warning` como `color` quando faltarem 30 dias ou menos.
- Sempre escreva a data do prazo ao lado; o anel sozinho não diz quando.
