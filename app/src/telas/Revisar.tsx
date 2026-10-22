import { useMemo, useState } from 'react'
import type { TelaProps } from '../App'
import { entradas, marcar, type Banco } from '../core/banco'
import { dataCurta, MESES, pagador } from '../core/formato'
import { brl, totaisPorMes } from '../core/relatorio'
import { Cabecalho } from '../componentes/Pecas'

export default function Revisar({ banco, ano, mudar, ir }: TelaProps) {
  const { ReviewDeck, AnimatedNumber } = window.MeuMEI
  const [lembrar, setLembrar] = useState(true)
  // A pilha fica fixa enquanto a pessoa decide; marcar não tira cartas do meio.
  const fila = useMemo(
    () => entradas(banco, ano).filter((r) => r.faturamento === null || (r.faturamento && r.categoria === null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ano],
  )
  const [antes] = useState<Record<string, Banco>>({})
  const meses = banco.movimentacoes.filter((r) => r.data.startsWith(`${ano}-`)).map((r) => Number(r.data.slice(5, 7)))
  const mes = meses.length ? Math.max(...meses) : new Date().getMonth() + 1
  const doMes = totaisPorMes(banco, ano)[mes - 1]

  return (
    <main className="conteudo topo revisar">
      <Cabecalho titulo="Revisar entradas" sub="Pix de pagadores que o app ainda não conhece" voltar={() => ir('inicio')} />

      <section className="cartao-mes" aria-label={`Faturamento de ${MESES[mes - 1]}`}>
        <svg aria-hidden="true" width="200" height="120" viewBox="0 0 200 120"><circle cx="120" cy="60" r="56" fill="none" stroke="#2dd4bf" strokeOpacity="0.12" strokeWidth="10" /><circle cx="120" cy="60" r="86" fill="none" stroke="#2dd4bf" strokeOpacity="0.07" strokeWidth="10" /></svg>
        <span className="rotulo">Faturamento de {MESES[mes - 1]}</span>
        <AnimatedNumber value={doMes.servicos + doMes.comercio} duration={600} className="cartao-mes-total" />
        <div className="cartao-mes-partes">
          <span><i style={{ background: '#2dd4bf' }} aria-hidden="true" />Serviços <b className="mm-num">{brl(doMes.servicos)}</b></span>
          <span><i style={{ background: '#a5b4fc' }} aria-hidden="true" />Comércio <b className="mm-num">{brl(doMes.comercio)}</b></span>
        </div>
      </section>

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
        doneTitle={`${MESES[mes - 1][0].toUpperCase() + MESES[mes - 1].slice(1)} revisado`}
        doneText="Os próximos Pix desses pagadores entram marcados sozinhos."
      />

      <button type="button" role="switch" aria-checked={lembrar} className="chave-lembrar" onClick={() => setLembrar(!lembrar)}>
        <span>
          <b>Lembrar para o mesmo pagador</b>
          <span>Próximos Pix dele já entram classificados</span>
        </span>
        <span className="chave-trilho" aria-hidden="true"><span /></span>
      </button>
    </main>
  )
}
