import { useState } from 'react'
import type { Banco } from '../core/banco'
import { MESES } from '../core/formato'
import { brl } from '../core/relatorio'
import FolhaDas from './FolhaDas'
import { dasDoAno, marcarDas, ultimoDas, type MesDas } from '../core/saidas'

const LETRA = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const PGMEI = 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao'

const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

function descrever(m: MesDas): string {
  const nome = MESES[m.mes - 1]
  switch (m.estado) {
    case 'pago': return m.manual ? `${nome}: marcado como pago${m.valor ? `, ${brl(m.valor)}` : ''}` : `${nome}: pago em ${dataBr(m.pagoEm!)}, ${brl(m.valor!)}`
    case 'atrasado': return `${nome}: em aberto, venceu em ${dataBr(m.vence)}`
    case 'sem-extrato': return `${nome}: falta o extrato de ${MESES[Number(m.vence.slice(5, 7)) - 1]} para conferir`
    case 'a-vencer': return `${nome}: vence em ${dataBr(m.vence)}`
    case 'antes': return `${nome}: antes da abertura do MEI`
  }
}

const LEGENDA: [MesDas['estado'], string, string][] = [
  ['pago', '✓', 'pago'],
  ['atrasado', '!', 'em aberto'],
  ['sem-extrato', '?', 'falta o extrato para conferir'],
  ['a-vencer', '', 'a vencer'],
]

const juntar = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}` : l[0])

/** Os 12 DAS do ano: pago, em aberto, a vencer ou sem extrato para conferir. */
export default function LinhaDas({ banco, ano, mudar }: { banco: Banco; ano: number; mudar: (b: Banco) => void }) {
  const [aberto, setAberto] = useState<MesDas | null>(null)
  const meses = dasDoAno(banco, ano)
  const devidos = meses.filter((m) => m.estado !== 'antes' && m.estado !== 'a-vencer')
  const pagos = devidos.filter((m) => m.estado === 'pago')
  const abertos = meses.filter((m) => m.estado === 'atrasado').map((m) => MESES[m.mes - 1])
  const semExtrato = meses.filter((m) => m.estado === 'sem-extrato').length

  function alternar(m: MesDas) {
    if (m.estado === 'antes' || m.estado === 'a-vencer') return
    setAberto(m)
  }

  return (
    <section aria-labelledby="das-t" className="das">
      <div className="titulo-linha">
        <h2 id="das-t">DAS do ano</h2>
        {devidos.length > 0 && (
          <span>
            {[`${pagos.length} ${pagos.length === 1 ? 'pago' : 'pagos'}`, abertos.length > 0 && `${abertos.length} em aberto`, semExtrato > 0 && `${semExtrato} sem extrato`]
              .filter(Boolean).join(' · ')}
          </span>
        )}
      </div>
      <div className="cartao cartao-pad">
        <ol className="das-meses">
          {meses.map((m) => (
            <li key={m.mes}>
              <button
                type="button"
                data-estado={m.estado}
                aria-label={descrever(m)}
                aria-disabled={m.estado === 'antes' || m.estado === 'a-vencer'}
                onClick={() => alternar(m)}
              >
                <span className="das-marca" aria-hidden="true">
                  {m.estado === 'pago' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>}
                  {m.estado === 'atrasado' && '!'}
                  {m.estado === 'sem-extrato' && '?'}
                </span>
                <span aria-hidden="true">{LETRA[m.mes - 1]}</span>
              </button>
            </li>
          ))}
        </ol>
        <ul className="das-legenda" aria-hidden="true">
          {LEGENDA.filter(([e]) => meses.some((m) => m.estado === e)).map(([e, marca, texto]) => (
            <li key={e} data-estado={e}><span className="das-marca">{marca}</span>{texto}</li>
          ))}
        </ul>
        {abertos.length > 0 ? (
          <p className="das-nota" data-tom="perigo">
            DAS de {juntar(abertos)} sem pagamento no extrato. Pague com juros no{' '}
            <a href={PGMEI} target="_blank" rel="noreferrer">PGMEI</a>, ou toque no mês se pagou por outra conta.
          </p>
        ) : (
          <p className="das-nota">
            {pagos.length === devidos.length && devidos.length > 0 ? 'Tudo pago até agora. ' : ''}
            {semExtrato > 0 ? 'Para conferir um mês com ?, importe o extrato do mês seguinte. ' : ''}
            O DAS vence todo dia 20 e é achado sozinho no extrato.
          </p>
        )}
      </div>
      {aberto && (
        <FolhaDas
          mes={aberto}
          sugestao={ultimoDas(banco)}
          fechar={() => setAberto(null)}
          confirmar={(pago) => { mudar(marcarDas(banco, ano, aberto.mes, pago)); setAberto(null) }}
        />
      )}
    </section>
  )
}
