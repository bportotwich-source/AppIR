import { useEffect, useRef, useState } from 'react'
import { MESES } from '../core/formato'
import { brl } from '../core/relatorio'
import type { MesDas } from '../core/saidas'

const maiuscula = (t: string) => t[0].toUpperCase() + t.slice(1)
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const paraCampo = (v: number) => v.toFixed(2).replace('.', ',')
const lerValor = (texto: string) => Number(texto.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'))

/** Folha que sobe do rodapé para marcar ou desmarcar o DAS de um mês. */
export default function FolhaDas({ mes, sugestao, fechar, confirmar }: {
  mes: MesDas
  sugestao: number | null
  fechar: () => void
  /** número = pago com esse valor; true = pago sem valor; false/null como em marcarDas. */
  confirmar: (pago: boolean | number | null) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [texto, setTexto] = useState(sugestao ? paraCampo(sugestao) : '')
  const nome = MESES[mes.mes - 1]
  const desfazer = mes.estado === 'pago'
  const valor = lerValor(texto)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (desfazer) confirmar(mes.manual ? null : false)
    else confirmar(valor > 0 ? valor : true)
  }

  return (
    <dialog
      ref={ref}
      className="folha"
      aria-labelledby="folha-t"
      onClose={fechar}
      // Tocar fora da folha fecha, como nas folhas do sistema.
      onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close() }}
    >
      <form onSubmit={enviar}>
        <span className="folha-alca" aria-hidden="true" />
        <p className="folha-etiqueta">DAS · {nome}</p>
        {desfazer ? (
          <>
            <h2 id="folha-t">{mes.manual ? `Desfazer a marcação de ${nome}?` : `Esse pagamento não é o DAS de ${nome}?`}</h2>
            <p className="folha-texto">
              {mes.manual
                ? `${maiuscula(nome)} volta a ficar sem pagamento${mes.valor ? `, e ${brl(mes.valor)} sai das despesas do Imposto de Renda` : ''}.`
                : `O pagamento de ${dataBr(mes.pagoEm!)} (${brl(mes.valor!)}) deixa de quitar ${nome}.`}
            </p>
            <div className="folha-acoes">
              <button type="submit" className="principal perigo">{mes.manual ? 'Desfazer' : 'Não é deste mês'}</button>
              <button type="button" className="folha-cancelar" onClick={() => ref.current?.close()}>Cancelar</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="folha-t">Marcar {nome} como pago</h2>
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
            {sugestao && (
              <p className="folha-dica">Sugestão: o último DAS do extrato, {brl(sugestao)}.</p>
            )}
            <div className="folha-acoes">
              <button type="submit" className="principal">
                {valor > 0 ? `Marcar pago · ${brl(valor)}` : 'Marcar pago sem valor'}
              </button>
              <button type="button" className="folha-cancelar" onClick={() => ref.current?.close()}>Cancelar</button>
            </div>
          </>
        )}
      </form>
    </dialog>
  )
}
