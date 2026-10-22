import { useState } from 'react'
import type { TelaProps } from '../App'
import { lerValor, MESES } from '../core/formato'
import { brl } from '../core/relatorio'
import { mudarNotas, relatorioMensal, type LinhaRelatorio } from '../core/declaracao'
import { Cabecalho } from '../componentes/Pecas'

const maiuscula = (s: string) => s[0].toUpperCase() + s.slice(1)
const paraCampo = (v: number | undefined) => (v ? v.toFixed(2).replace('.', ',') : '')

function Bloco({ titulo, linha, rotulos }: { titulo: string; linha: LinhaRelatorio; rotulos: [string, string, string, string, string, string] }) {
  return (
    <div className="rel-bloco">
      <h3>{titulo}</h3>
      <dl>
        <div><dt><b>{rotulos[0]}</b> {rotulos[1]}</dt><dd className="mm-num">{brl(linha.semNota)}</dd></div>
        <div><dt><b>{rotulos[2]}</b> {rotulos[3]}</dt><dd className="mm-num">{brl(linha.comNota)}</dd></div>
        <div className="rel-total"><dt><b>{rotulos[4]}</b> {rotulos[5]}</dt><dd className="mm-num">{brl(linha.total)}</dd></div>
      </dl>
    </div>
  )
}

/** Relatório Mensal das Receitas Brutas, no modelo da Resolução CGSN, pronto para imprimir ou salvar em PDF. */
export default function Relatorio({ banco, ano, mudar, ir }: TelaProps) {
  const comMovimento = [...new Set(banco.movimentacoes.filter((r) => r.data.startsWith(`${ano}-`)).map((r) => Number(r.data.slice(5, 7))))].sort((a, b) => b - a)
  const [mes, setMes] = useState(comMovimento[0] ?? new Date().getMonth() + 1)
  const r = relatorioMensal(banco, ano, mes)
  const notas = banco.notasFiscais?.[`${ano}-${String(mes).padStart(2, '0')}`] ?? {}
  const empresa = banco.empresa ?? {}
  const [abrirDados] = useState(!empresa.cnpj)
  const periodo = `${maiuscula(MESES[mes - 1])} de ${ano}`

  return (
    <main className="conteudo topo relatorio">
      <Cabecalho titulo="Relatório mensal" sub="Das receitas brutas do MEI. Imprima ou salve em PDF e guarde com as notas fiscais do mês." voltar={() => ir('declaracao')} rotuloVoltar="Voltar para a declaração" empilhado />

      <div className="rel-controles">
        {comMovimento.length > 0 && (
          <div className="graficos" role="radiogroup" aria-label="Mês">
            {comMovimento.map((m) => (
              <button key={m} role="radio" aria-checked={mes === m} onClick={() => setMes(m)}>{maiuscula(MESES[m - 1])}</button>
            ))}
          </div>
        )}
        <details className="rel-dados" open={abrirDados}>
          <summary>Dados da empresa e notas fiscais</summary>
          <div className="folha-campos">
            <label className="campo">CNPJ<input inputMode="numeric" autoComplete="off" placeholder="00.000.000/0001-00" defaultValue={empresa.cnpj ?? ''} onBlur={(e) => mudar({ ...banco, empresa: { ...empresa, cnpj: e.target.value.trim() } })} /></label>
            <label className="campo">Nome do empresário<input autoComplete="name" defaultValue={empresa.nome ?? ''} onBlur={(e) => mudar({ ...banco, empresa: { ...empresa, nome: e.target.value.trim() } })} /></label>
            <label className="campo"><span>Serviços com nota fiscal em {MESES[mes - 1]} <span className="opcional">em R$</span></span>
              <input key={`s${mes}`} inputMode="decimal" autoComplete="off" placeholder="0,00" defaultValue={paraCampo(notas.servicos)} onBlur={(e) => mudar(mudarNotas(banco, ano, mes, { servicos: lerValor(e.target.value) }))} />
            </label>
            <label className="campo"><span>Comércio com nota fiscal em {MESES[mes - 1]} <span className="opcional">em R$</span></span>
              <input key={`c${mes}`} inputMode="decimal" autoComplete="off" placeholder="0,00" defaultValue={paraCampo(notas.comercio)} onBlur={(e) => mudar(mudarNotas(banco, ano, mes, { comercio: lerValor(e.target.value) }))} />
            </label>
          </div>
          <p className="apoio">O resto do faturamento entra como venda sem nota, que o MEI pode fazer para pessoa física.</p>
        </details>
      </div>

      <article className="rel-papel" aria-label={`Relatório de ${periodo}`}>
        <header>
          <h2>Relatório Mensal das Receitas Brutas</h2>
          <dl className="rel-cabecalho">
            <div><dt>CNPJ</dt><dd>{empresa.cnpj || '—'}</dd></div>
            <div><dt>Empreendedor individual</dt><dd>{empresa.nome || '—'}</dd></div>
            <div><dt>Período de apuração</dt><dd>{periodo}</dd></div>
          </dl>
        </header>
        <Bloco titulo="Revenda de mercadorias (comércio)" linha={r.comercio} rotulos={['I', 'Revenda com dispensa de documento fiscal', 'II', 'Revenda com documento fiscal emitido', 'III', 'Total da revenda (I + II)']} />
        <Bloco titulo="Venda de produtos industrializados (indústria)" linha={r.industria} rotulos={['IV', 'Venda com dispensa de documento fiscal', 'V', 'Venda com documento fiscal emitido', 'VI', 'Total da indústria (IV + V)']} />
        <Bloco titulo="Prestação de serviços" linha={r.servicos} rotulos={['VII', 'Serviços com dispensa de documento fiscal', 'VIII', 'Serviços com documento fiscal emitido', 'IX', 'Total dos serviços (VII + VIII)']} />
        <div className="rel-geral"><span><b>X</b> Total geral das receitas brutas no mês (III + VI + IX)</span><b className="mm-num">{brl(r.total)}</b></div>
        <div className="rel-assinatura">
          <div><span>Local e data</span></div>
          <div><span>Assinatura do empresário</span></div>
        </div>
        <p className="rel-anexos">Anexar a este relatório os documentos fiscais de compra de mercadorias e de entrada de serviços do período, e as notas fiscais emitidas.</p>
      </article>

      <button className="principal" onClick={() => window.print()}>Imprimir ou salvar em PDF</button>
    </main>
  )
}
