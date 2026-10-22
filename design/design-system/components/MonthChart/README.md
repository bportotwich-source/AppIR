O faturamento mês a mês em cinco formas, escolhidas por `variant`, todas com um mês aberto por vez e a diferença para a média permitida escrita no topo.

**Use** no Início, na seção "Mês a mês". Escolha uma forma por tela.

**O consumidor fornece:** `data` com até 12 objetos `{ s, c }` (janeiro primeiro), `variant`; opcionalmente `max`, `avg` (padrão 6750) e `selected`.

| `variant` | Forma | Responde |
| --- | --- | --- |
| `capsulas` | cápsulas empilhadas (o mesmo que `MonthBars`) | quanto foi cada mês e de que categoria |
| `desvio` | barras para cima ou para baixo da média permitida | quais meses consumiram limite rápido demais |
| `linha` | linha suave com área e pontos | como o faturamento oscilou ao longo do ano |
| `calor` | 12 células, mais escuras quanto maior o mês | quais meses foram fortes, de relance |
| `relogio` | um raio por mês em volta de um círculo | o ano inteiro numa forma só, com o mês no centro |

- Acima da média usa `warning`; abaixo usa `servicos`. A etiqueta no topo diz "R$ 210 abaixo da média permitida" por escrito.
- Toque, Enter ou setas escolhem o mês. Meses sem extrato aparecem como ponto ou contorno tracejado.
