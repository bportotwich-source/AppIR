import { useMemo, useState } from 'react'
import type { TelaProps } from '../App'
import { entradas, marcar, type Banco } from '../core/banco'
import { dataCurta, pagador } from '../core/formato'

export default function Revisar({ banco, ano, mudar }: TelaProps) {
  const { ReviewDeck } = window.MeuMEI
  const [lembrar, setLembrar] = useState(true)
  // A pilha fica fixa enquanto a pessoa decide; marcar não tira cartas do meio.
  const fila = useMemo(
    () => entradas(banco, ano).filter((r) => r.faturamento === null || (r.faturamento && r.categoria === null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ano],
  )
  const [antes] = useState<Record<string, Banco>>({})

  return (
    <main className="conteudo topo">
      <h1>Revisar entradas</h1>
      <p className="apoio">Pix de pagadores que o app ainda não conhece</p>

      <label className="chave">
        <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
        <span>
          <b>Lembrar para o mesmo pagador</b>
          <span>Próximos Pix dele já entram classificados</span>
        </span>
      </label>

      <ReviewDeck
        entries={fila.map((r) => {
          const p = pagador(r.descricao)
          return { id: r.id, date: dataCurta(r.data), value: r.valor, payer: p.nome, description: p.operacao }
        })}
        onDecide={(d) => {
          const id = String(d.entry.id)
          antes[id] = banco
          mudar(marcar(banco, id, d.choice !== 'fora', d.choice === 'fora' ? null : d.choice, lembrar))
        }}
        onUndo={(d) => {
          const id = String(d.entry.id)
          if (antes[id]) mudar(antes[id])
        }}
        doneTitle="Tudo revisado"
        doneText="Os totais já incluem as entradas que você marcou."
      />
    </main>
  )
}
