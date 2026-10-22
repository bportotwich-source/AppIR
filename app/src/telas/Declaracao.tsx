import { useState } from 'react'
import type { TelaProps } from '../App'
import { MESES } from '../core/formato'
import { alerta, brl, limiteDoAno, pendentes, total, totaisAno } from '../core/relatorio'

export default function Declaracao({ banco, ano, ir }: TelaProps) {
  const [empregado, setEmpregado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const t = totaisAno(banco, ano)
  const nPendentes = pendentes(banco, ano)
  const meses = new Set(banco.movimentacoes.filter((r) => r.data.startsWith(`${ano}-`)).map((r) => Number(r.data.slice(5, 7))))
  const faltam = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => !meses.has(m))
  const limite = alerta(total(t), limiteDoAno(banco, ano))

  const texto =
    `DASN-SIMEI ${ano}\n` +
    `Comércio e indústria: ${brl(t.comercio)}\n` +
    `Prestação de serviços: ${brl(t.servicos)}\n` +
    `Teve empregado: ${empregado ? 'Sim' : 'Não'}`

  async function copiar() {
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
  }

  return (
    <main className="conteudo topo">
      <h1>Declaração anual</h1>
      <p className="apoio">
        Prazo da DASN-SIMEI de {ano}: 31 de maio de {ano + 1}. A entrega abre em 1º de janeiro e é obrigatória mesmo sem faturamento.
      </p>

      <section className="recibo">
        <span className="rotulo">Prévia · DASN-SIMEI · ano-calendário {ano}</span>
        <dl>
          <div><dt>Comércio e indústria</dt><dd>{brl(t.comercio)}</dd></div>
          <div><dt>Prestação de serviços</dt><dd>{brl(t.servicos)}</dd></div>
          <div className="soma"><dt>Receita bruta total</dt><dd>{brl(total(t))}</dd></div>
        </dl>
        <div className="segmentado" role="radiogroup" aria-labelledby="empregado">
          <span id="empregado">Teve empregado no ano?</span>
          <label><input type="radio" checked={!empregado} onChange={() => setEmpregado(false)} />Não</label>
          <label><input type="radio" checked={empregado} onChange={() => setEmpregado(true)} />Sim</label>
        </div>
        <button className="principal" onClick={copiar}>{copiado ? 'Valores copiados' : 'Copiar valores'}</button>
        <a href="https://www8.receita.fazenda.gov.br/SimplesNacional/" target="_blank" rel="noreferrer">
          Abrir Portal do Simples Nacional
        </a>
      </section>

      <section>
        <h2>Antes de entregar</h2>
        <ul className="checagem">
          <li data-ok={limite.nivel === 'ok' || limite.nivel === 'atencao' || limite.nivel === 'perigo'}>{limite.mensagem}</li>
          <li data-ok={nPendentes === 0}>
            {nPendentes === 0 ? 'Todas as entradas revisadas' : <button className="link" onClick={() => ir('revisar')}>{nPendentes} entradas sem revisão · Revisar agora</button>}
          </li>
          <li data-ok={faltam.length === 0}>
            {faltam.length === 0 ? 'Extratos dos 12 meses importados' : `Faltam extratos de ${faltam.map((m) => MESES[m - 1]).join(', ')}`}
          </li>
        </ul>
        <p className="apoio">A DASN-SIMEI não substitui o seu Imposto de Renda de pessoa física.</p>
      </section>
    </main>
  )
}
