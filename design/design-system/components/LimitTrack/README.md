O limite anual como uma barra de orçamento: cada mês ocupa um pedaço proporcional ao que faturou (Serviços e Comércio), a projeção até dezembro aparece listrada e o resto é folga. Embaixo, três números escritos: usado, projeção e folga.

**Use** no topo do Início como alternativa ao `LimitGauge`, quando a pergunta é "quanto espaço ainda tenho".

**O consumidor fornece:** `data` com até 12 objetos `{ s, c }` (janeiro primeiro), opcionalmente `limit`, `tone` e `label`.

- Tocar num pedaço mostra o mês com Serviços e Comércio por escrito.
- Marcas de 70% e 90% ficam acima da barra; a folga fica em `warning` quando sobra menos de 15% do limite.
- Os pedaços entram da esquerda em sequência; a listra da projeção surge depois.
