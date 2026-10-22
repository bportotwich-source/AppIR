import { useState } from 'react'
import { lerValor, MESES } from '../core/formato'
import { brl } from '../core/relatorio'
import type { MesDas } from '../core/saidas'
import Folha from './Folha'

const maiuscula = (t: string) => t[0].toUpperCase() + t.slice(1)
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const paraCampo = (v: number) => v.toFixed(2).replace('.', ',')

/** Folha para marcar ou desmarcar o DAS de um mês. */
export default function FolhaDas({ mes, sugestao, fechar, confirmar }: {
  mes: MesDas
  sugestao: number | null
  fechar: () => void
  /** número = pago com esse valor; true = pago sem valor; false/null como em marcarDas. */
  confirmar: (pago: boolean | number | null) => void
}) {
  const [texto, setTexto] = useState(sugestao ? paraCampo(sugestao) : '')
  const nome = MESES[mes.mes - 1]
  const desfazer = mes.estado === 'pago'
  const valor = lerValor(texto)
  const titulo = desfazer
    ? mes.manual ? `Desfazer a marcação de ${nome}?` : `Esse pagamento não é o DAS de ${nome}?`
    : `Marcar ${nome} como pago`

  function enviar() {
    if (desfazer) confirmar(mes.manual ? null : false)
    else confirmar(valor > 0 ? valor : true)
  }

  return (
    <Folha etiqueta={`DAS · ${nome}`} titulo={titulo} fechar={fechar} enviar={enviar}>
      {(fecharFolha) => desfazer ? (
        <>
          <p className="folha-texto">
            {mes.manual
              ? `${maiuscula(nome)} volta a ficar sem pagamento${mes.valor ? `, e ${brl(mes.valor)} sai das despesas do Imposto de Renda` : ''}.`
              : `O pagamento de ${dataBr(mes.pagoEm!)} (${brl(mes.valor!)}) deixa de quitar ${nome}.`}
          </p>
          <div className="folha-acoes">
            <button type="submit" className="principal perigo">{mes.manual ? 'Desfazer' : 'Não é deste mês'}</button>
            <button type="button" className="folha-cancelar" onClick={fecharFolha}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          <p className="folha-texto">Para DAS pago por outra conta ou débito automático. O valor entra nas despesas do Imposto de Renda.</p>
          <label className="folha-valor">
            <span className="so-leitor">Valor pago</span>
            <span aria-hidden="true">R$</span>
            <input
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </label>
          {sugestao && <p className="folha-dica">Sugestão: o último DAS do extrato, {brl(sugestao)}.</p>}
          <div className="folha-acoes">
            <button type="submit" className="principal">
              {valor > 0 ? `Marcar pago · ${brl(valor)}` : 'Marcar pago sem valor'}
            </button>
            <button type="button" className="folha-cancelar" onClick={fecharFolha}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}
