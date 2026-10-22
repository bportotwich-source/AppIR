import type { TelaProps } from '../App'
import { extratosDoAno } from '../core/agenda'
import { brl } from '../core/relatorio'

const dataCurtaBr = (isoData: string) => `${isoData.slice(8, 10)}/${isoData.slice(5, 7)}`

export default function Extratos({ banco, ano, ir }: TelaProps) {
  const meses = extratosDoAno(banco, ano)
  return (
    <main className="conteudo topo">
      <h1>Extratos de {ano}</h1>
      <p className="apoio">Os meses que já têm extrato no app e quanto foi faturado em cada um.</p>

      {meses.length === 0 ? (
        <section>
          <p>Nenhum extrato de {ano} ainda.</p>
          <button className="principal" onClick={() => ir('importar')}>Importar extrato</button>
        </section>
      ) : (
        <ol className="linha-tempo">
          {meses.map((m, i) => (
            <li key={m.mes} data-atual={i === 0}>
              <span className="ponto" aria-hidden="true" />
              <div>
                <b>{m.nome[0].toUpperCase() + m.nome.slice(1)}</b>
                <span>Importado em {dataCurtaBr(m.importadoEm)} · {m.movimentacoes} {m.movimentacoes === 1 ? 'movimentação' : 'movimentações'}</span>
              </div>
              <div className="valor">
                <b className="mm-num">{brl(m.faturado)}</b>
                <span>faturado</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  )
}
