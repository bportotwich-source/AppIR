import { useState } from 'react'
import type { TelaProps } from '../App'
import { MESES } from '../core/formato'
import { alerta, brl, limiteDoAno, pendentes, total, totaisAno } from '../core/relatorio'
import { Cabecalho, Recibo } from '../componentes/Pecas'

const DIA_MS = 86_400_000

function Passo({ ok, titulo, children }: { ok: boolean; titulo: string; children: React.ReactNode }) {
  return (
    <li>
      <span className="passo-marca" data-ok={ok} aria-hidden="true">
        {ok ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg> : '!'}
      </span>
      <div>
        <span className="passo-titulo">{titulo}</span>
        {children}
      </div>
    </li>
  )
}

export default function Declaracao({ banco, ano, ir }: TelaProps) {
  const { CountdownRing, AnimatedNumber } = window.MeuMEI
  const [empregado, setEmpregado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const t = totaisAno(banco, ano)
  const nPendentes = pendentes(banco, ano)
  const meses = new Set(banco.movimentacoes.filter((r) => r.data.startsWith(`${ano}-`)).map((r) => Number(r.data.slice(5, 7))))
  const ultimo = meses.size ? Math.max(...meses) : 0
  const faltam = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => !meses.has(m))
  const limite = limiteDoAno(banco, ano)
  const aviso = alerta(total(t), limite)
  const dentro = total(t) <= limite
  const prazo = new Date(ano + 1, 4, 31)
  const hoje = new Date()
  const dias = Math.max(0, Math.round((Date.UTC(ano + 1, 4, 31) - Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / DIA_MS))

  const texto =
    `DASN-SIMEI ${ano}\n` +
    `Comércio e indústria: ${brl(t.comercio)}\n` +
    `Prestação de serviços: ${brl(t.servicos)}\n` +
    `Receita bruta total: ${brl(total(t))}\n` +
    `Teve empregado: ${empregado ? 'Sim' : 'Não'}`

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      // sem área de transferência: o botão continua como estava
    }
  }

  const listaFaltam = faltam.map((m) => MESES[m - 1])
  const faltamTexto = listaFaltam.length > 1 ? `${listaFaltam.slice(0, -1).join(', ')} e ${listaFaltam[listaFaltam.length - 1]}` : listaFaltam[0]

  return (
    <main className="conteudo topo declaracao">
      <Cabecalho titulo="Declaração anual" voltar={() => ir('inicio')} />

      <section aria-label="Prazo" className="prazo-dasn">
        <CountdownRing value={dias} max={365} label="dias" sub={`até ${prazo.toLocaleDateString('pt-BR')}`} size={124} />
        <div>
          <span className="rotulo">Prazo da DASN-SIMEI</span>
          <strong>31 de maio de {ano + 1}</strong>
          <span>A entrega abre em 1º de janeiro. É obrigatória mesmo sem faturamento.</span>
        </div>
      </section>

      <Recibo rotulo={`Prévia da DASN-SIMEI ${ano}`} className="sobe">
        <span className="carimbo">PRÉVIA</span>
        <span className="etiqueta">DASN-SIMEI</span>
        <h2>Ano-calendário {ano}</h2>
        <p className="nota">{ultimo ? `Atualizado até ${MESES[ultimo - 1]} · ${meses.size} de 12 meses` : 'Nenhum extrato importado ainda'}</p>
        <div className="tracejado" aria-hidden="true" />

        <dl className="linhas-dasn">
          <div className="pontilhado">
            <dt><i style={{ background: '#6366f1' }} aria-hidden="true" />Comércio e indústria</dt><span aria-hidden="true" /><dd className="mm-num">{brl(t.comercio)}</dd>
            <dd className="sub">Inclui transporte intermunicipal, se houver</dd>
          </div>
          <div className="pontilhado">
            <dt><i style={{ background: '#0d9488' }} aria-hidden="true" />Prestação de serviços</dt><span aria-hidden="true" /><dd className="mm-num">{brl(t.servicos)}</dd>
            <dd className="sub">Soma das entradas marcadas como Serviços</dd>
          </div>
        </dl>

        <div className="linha-dupla" aria-hidden="true" />
        <div className="total-dasn">
          <span>Receita bruta total</span>
          <AnimatedNumber value={total(t)} duration={1200} className="total-dasn-valor" />
        </div>

        <div className="tracejado" aria-hidden="true" />

        <div className="empregado">
          <span>Teve empregado no ano?</span>
          <div role="group" aria-label="Teve empregado no ano">
            <button type="button" aria-pressed={!empregado} onClick={() => { setEmpregado(false); setCopiado(false) }}>Não</button>
            <button type="button" aria-pressed={empregado} onClick={() => { setEmpregado(true); setCopiado(false) }}>Sim</button>
          </div>
        </div>

        <div className="acoes-dasn">
          <button type="button" className="copiar" data-copiado={copiado} onClick={copiar}>
            {copiado
              ? <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
              : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>}
            <span aria-live="polite">{copiado ? 'Valores copiados' : 'Copiar valores'}</span>
          </button>
          <a className="portal" href="https://www8.receita.fazenda.gov.br/SimplesNacional/" target="_blank" rel="noreferrer">
            Abrir Portal do Simples Nacional
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M9 7h8v8" /></svg>
          </a>
        </div>
      </Recibo>

      <section aria-labelledby="check-t" className="checagem-dasn">
        <h2 id="check-t">Antes de entregar</h2>
        <ol>
          <Passo ok={dentro} titulo={dentro ? `Dentro do limite de ${brl(limite)}` : 'Passou do limite'}>
            <span className="passo-sub">{dentro ? `Pronto · ${Math.round((total(t) / limite) * 100)}% usado${ultimo ? ` até ${MESES[ultimo - 1]}` : ''}` : aviso.mensagem}</span>
          </Passo>
          <Passo ok={nPendentes === 0} titulo={nPendentes === 0 ? 'Todas as entradas revisadas' : `${nPendentes} ${nPendentes === 1 ? 'entrada sem revisão' : 'entradas sem revisão'}`}>
            {nPendentes === 0 ? <span className="passo-sub">Pronto</span> : <button className="link passo-link" onClick={() => ir('revisar')}>Falta · Revisar agora</button>}
          </Passo>
          <Passo ok={faltam.length === 0} titulo={faltam.length === 0 ? 'Extratos dos 12 meses' : `Extratos de ${faltamTexto}`}>
            <span className="passo-sub">{faltam.length === 0 ? 'Pronto' : 'Falta · chegam por e-mail no começo de cada mês'}</span>
          </Passo>
        </ol>
        <p className="nota-ir">A DASN-SIMEI não substitui o seu Imposto de Renda de pessoa física. O app só prepara os números; a entrega é sua.</p>
      </section>
    </main>
  )
}
