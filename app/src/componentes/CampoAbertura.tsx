import { useState } from 'react'
import { textoLimite } from '../core/relatorio'

const hoje = () => new Date().toISOString().slice(0, 7)

interface Props {
  valor: string | null | undefined
  mudar: (abertura: string | null) => void
}

/** Pergunta do Início: some depois que a pessoa responde. */
export function PerguntaAbertura({ mudar }: Props) {
  const [rascunho, setRascunho] = useState('')
  const ano = new Date().getFullYear()
  return (
    <section className="lembrete" aria-labelledby="abertura-titulo">
      <b id="abertura-titulo">Quando você abriu o MEI?</b>
      <span>No ano de abertura, o limite não é R$ 81 mil: são R$ 6.750 por mês, contando do mês em que abriu.</span>
      <div className="lembrete-linha">
        <label className="so-leitor" htmlFor="abertura">Mês de abertura</label>
        <input id="abertura" type="month" max={hoje()} value={rascunho} onChange={(e) => setRascunho(e.target.value)} />
        <button className="principal" disabled={!rascunho} onClick={() => mudar(rascunho)}>Salvar</button>
      </div>
      <button className="link" onClick={() => mudar(null)}>Abri antes de {ano}</button>
    </section>
  )
}

/** Campo da tela de ajustes, para corrigir a resposta. */
export function CampoAbertura({ valor, mudar }: Props) {
  return (
    <>
      <label className="campo">
        <span>Mês de abertura do MEI</span>
        <input type="month" max={hoje()} value={valor ?? ''} onChange={(e) => mudar(e.target.value || null)} />
      </label>
      <p className="apoio">{textoLimite(valor) || 'Informe para o app usar o limite certo no ano em que o MEI foi aberto.'}</p>
    </>
  )
}
