import { useState } from 'react'
import type { TelaProps } from '../App'
import BarrasRastro from '../componentes/BarrasRastro'
import { PerguntaAbertura } from '../componentes/CampoAbertura'
import { brl, limiteAnual, limiteDoAno, maioresPagadores, pendentes, projecaoAno, total, totaisAno, totaisPorMes } from '../core/relatorio'
import { dataCurta, MESES, pagador } from '../core/formato'
import { iniciais, proximosPrazos, quando } from '../core/agenda'
import { entradas } from '../core/banco'
import Icone from '../componentes/Icone'
import ListaMaiores from '../componentes/ListaMaiores'
import LinhaDas from '../componentes/LinhaDas'
import { LembretesAparelho } from '../componentes/Lembretes'
import { avisoDasn, declaracaoDo } from '../core/declaracao'
import { nomesPerfis, retiradasPj, titularDo } from '../core/pf'
import { TopoInicio } from '../componentes/Perfil'

// Projeção é estimativa: arredonda para centenas e mostra sem centavos.
const reais = (v: number) => 'R$ ' + (Math.round(v / 100) * 100).toLocaleString('pt-BR')

const dataCurtaHoje = () => dataCurta(new Date().toLocaleDateString('sv-SE'))

const CURTO = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

// Formas alternativas do mesmo dado, uma por vez; a escolha fica no aparelho.
const VISOES = [
  { id: 'arco', nome: 'Arco' },
  { id: 'curva', nome: 'Curva' },
  { id: 'barra', nome: 'Barra' },
] as const
type Visao = (typeof VISOES)[number]['id']

const GRAFICOS = [
  { id: 'rastro', nome: 'Rastro' },
  { id: 'capsulas', nome: 'Cápsulas' },
  { id: 'desvio', nome: 'Desvio' },
  { id: 'linha', nome: 'Linha' },
  { id: 'calor', nome: 'Calor' },
  { id: 'relogio', nome: 'Relógio' },
] as const
type Grafico = (typeof GRAFICOS)[number]['id']

function useEscolha<T extends string>(chave: string, opcoes: readonly { id: T }[]): [T, (v: T) => void] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const v = localStorage.getItem(chave)
      return opcoes.find((o) => o.id === v)?.id ?? opcoes[0].id
    } catch {
      return opcoes[0].id
    }
  })
  const escolher = (v: T) => {
    setValor(v)
    try {
      localStorage.setItem(chave, v)
    } catch {
      // sem armazenamento: a escolha vale só nesta sessão
    }
  }
  return [valor, escolher]
}

function Seletor<T extends string>(props: {
  rotulo: string
  opcoes: readonly { id: T; nome: string }[]
  valor: T
  mudar: (v: T) => void
  className: string
}) {
  return (
    <div className={props.className} role="radiogroup" aria-label={props.rotulo}>
      {props.opcoes.map((o) => (
        <button key={o.id} role="radio" aria-checked={props.valor === o.id} onClick={() => props.mudar(o.id)}>
          {o.nome}
        </button>
      ))}
    </div>
  )
}

interface Props extends TelaProps {
  anos: number[]
  mudarAno: (ano: number) => void
}

export default function Inicio({ banco, ano, ir, anos, mudarAno, mudar, dadosProtegidos, instalar, perfil, mudarPerfil, oculto, alternarOlho }: Props) {
  const { LimitGauge, AccumulatedChart, LimitTrack, SplitBar, MonthChart } = window.MeuMEI
  const [visao, setVisao] = useEscolha<Visao>('meu-mei:visao', VISOES)
  const [grafico, setGrafico] = useEscolha<Grafico>('meu-mei:grafico', GRAFICOS)
  const t = totaisAno(banco, ano)
  const meses = totaisPorMes(banco, ano)
  const comExtrato = banco.movimentacoes.some((r) => r.data.startsWith(`${ano}-`))
  const ultimoMes = Math.max(0, ...banco.movimentacoes.filter((r) => r.data.startsWith(`${ano}-`)).map((r) => Number(r.data.slice(5, 7))))
  const projecao = projecaoAno(banco, ano)
  const dadosMeses = meses.map((m, i) => ({ m: CURTO[i], s: m.servicos, c: m.comercio }))
  const nPendentes = pendentes(banco, ano)
  const limite = limiteDoAno(banco, ano)
  const anual = limiteAnual(banco)
  const filaPendente = entradas(banco, ano).filter((r) => r.faturamento === null || (r.faturamento && r.categoria === null))
  const valorPendente = filaPendente.reduce((soma, r) => soma + r.valor, 0)
  const pagadores = [...new Set(filaPendente.map((r) => iniciais(pagador(r.descricao).nome)))].slice(0, 4)
  const prazos = proximosPrazos()
  const dasn = avisoDasn(banco)
  const dasnEntregue = (p: { titulo: string; data: string }) => p.titulo.startsWith('DASN') && !!declaracaoDo(banco, Number(p.data.slice(0, 4)) - 1).entregueEm
  const retiradas = retiradasPj(banco, ano)
  const nomes = nomesPerfis(titularDo(banco))
  const periodo = ultimoMes > 1 ? `janeiro a ${MESES[ultimoMes - 1]}` : MESES[0]

  const faturado = total(t)
  const usado = limite > 0 ? Math.min(100, Math.round((faturado / limite) * 100)) : 0
  const maiores = maioresPagadores(banco, ano)
  const nomeCat = { servicos: 'Serviços', comercio: 'Comércio' } as const

  return (
    <main>
      <section className="faixa" aria-label="Resumo do ano">
        <TopoInicio perfil={perfil} mudarPerfil={mudarPerfil} titular={titularDo(banco)} oculto={oculto} alternarOlho={alternarOlho} abrirAjustes={() => ir('ajustes')} />
        <div className="faixa-linha">
          <h1 className="faixa-nota">Você faturou em {ano}</h1>
          <label className="so-leitor" htmlFor="ano">Ano</label>
          <select id="ano" value={ano} onChange={(e) => mudarAno(Number(e.target.value))}>
            {anos.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <p className="faixa-grande mm-num">{brl(faturado)}</p>
        <p className="faixa-sub">
          de <span className="sensivel">{brl(limite)}</span> {limite !== anual ? 'do limite do ano de abertura' : 'do limite'} · {faturado <= limite
            ? <>faltam <b className="sensivel">{brl(limite - faturado)}</b></>
            : <>passou <b className="sensivel">{brl(faturado - limite)}</b></>}
        </p>
        <div className="barra-uso" aria-hidden="true" data-alerta={usado >= 80 || undefined}><span style={{ width: `${usado}%` }} /></div>
        <p className="faixa-legenda">
          <span>{usado}% do limite</span>
          <span>{comExtrato ? `Extrato até ${MESES[ultimoMes - 1]}` : 'Nenhum extrato ainda'}</span>
        </p>
        {projecao !== null && (
          <p className="faixa-compara" data-subiu={projecao > limite}>
            <span aria-hidden="true">→</span>
            <span>No ritmo atual, fecha perto de <b className="sensivel">{reais(projecao)}</b>{projecao > limite ? ', acima do limite' : `, folga de ${reais(limite - projecao)}`}</span>
          </p>
        )}
        <svg className="faixa-onda" aria-hidden="true" viewBox="0 0 390 56" preserveAspectRatio="none"><path d="M0 56 V30 C 70 6, 150 6, 205 24 S 330 50, 390 18 V56 Z" /></svg>
      </section>

      <div className="conteudo">
        {!comExtrato && (
          <section>
            <h2>Comece pelo extrato</h2>
            <p>Importe o extrato do Nubank PJ em OFX, CSV ou PDF. Ele é lido aqui e não sai do celular.</p>
            <button className="principal" onClick={() => ir('importar')}>Importar extrato</button>
          </section>
        )}

        {comExtrato && banco.abertura === undefined && <PerguntaAbertura valor={banco.abertura} anual={anual} mudar={(abertura) => mudar({ ...banco, abertura })} />}

        {dasn && (
          <section className="lembrete" data-tom={dasn.dias < 0 ? 'perigo' : undefined} aria-labelledby="dasn-titulo">
            <b id="dasn-titulo">
              {dasn.dias < 0 ? `A DASN-SIMEI ${dasn.ano} está atrasada` : `Entregue a DASN-SIMEI ${dasn.ano} ${quando(dasn.dias)}`}
            </b>
            <span>
              {dasn.dias < 0
                ? 'Entregue o quanto antes: a multa é de 2% ao mês sobre os impostos do ano, com mínimo de R$ 50.'
                : 'O prazo é 31 de maio. A declaração do app já tem os valores para copiar.'}
            </span>
            <button className="principal" onClick={() => { mudarAno(dasn.ano); ir('declaracao') }}>Abrir a declaração de {dasn.ano}</button>
          </section>
        )}

        {retiradas.length > 0 && (
          <button className="passagem" onClick={() => mudarPerfil('pf')}>
            <span className="passagem-icone" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h14" /><path d="m13 6 6 6-6 6" /></svg></span>
            <span>
              <b><span className="sensivel">{brl(retiradas.reduce((s, r) => s + r.valor, 0))}</span> foram para {nomes.pf}</b>
              <span>{retiradas.length} Pix para você em {ano}. Saem do lucro da empresa e entram como renda no {nomes.pf}. Toque para abrir.</span>
            </span>
          </button>
        )}

        {nPendentes > 0 && (
          <button className="ticket" onClick={() => ir('revisar')} aria-label={`${nPendentes} Pix esperando revisão, ${brl(valorPendente)} ainda fora do total. Abrir revisão.`}>
            <span className="ticket-rostos" aria-hidden="true">
              {pagadores.map((p, i) => <span key={p + i} data-i={i}>{p}</span>)}
            </span>
            <span className="ticket-corte" aria-hidden="true" />
            <span className="ticket-texto">
              <span className="rotulo">{nPendentes} {nPendentes === 1 ? 'pendente' : 'pendentes'}</span>
              <b>Pix esperando você</b>
              <span><span className="sensivel">{brl(valorPendente)}</span> ainda fora do total</span>
            </span>
            <span className="ticket-seta" aria-hidden="true"><Icone nome="seta" tamanho={18} /></span>
          </button>
        )}

        {comExtrato && (
          <section>
            <div className="titulo-linha">
              <h2>De onde veio</h2>
              <span>{periodo}</span>
            </div>
            <SplitBar items={[
              { label: 'Serviços', value: t.servicos, color: 'var(--servicos)' },
              { label: 'Comércio', value: t.comercio, color: 'var(--comercio)' },
            ]} />
          </section>
        )}

        {maiores.length > 0 && (
          <section aria-labelledby="maiores-t">
            <div className="titulo-linha">
              <h2 id="maiores-t">Quem mais pagou</h2>
              <span>{periodo}</span>
            </div>
            <ListaMaiores itens={maiores.map((g) => ({ nome: g.nome, detalhe: `${g.categoria ? nomeCat[g.categoria] : 'Faturamento'}${g.quantas > 1 ? ` · ${g.quantas} vezes` : ''}`, valor: g.valor }))} />
          </section>
        )}

        {comExtrato && (
          <section aria-labelledby="meses-t">
            <h2 id="meses-t">Mês a mês</h2>
            <Seletor className="graficos" rotulo="Forma do gráfico" opcoes={GRAFICOS} valor={grafico} mudar={setGrafico} />
            {grafico === 'rastro' ? (
              <BarrasRastro data={dadosMeses} avg={anual / 12} />
            ) : (
              <MonthChart key={grafico} data={dadosMeses} variant={grafico} avg={anual / 12} max={Math.max(9000, (anual / 12) * 1.33)} />
            )}
          </section>
        )}

        {comExtrato && (
          <section aria-labelledby="limite-t">
            <div className="titulo-linha">
              <h2 id="limite-t">Limite do ano</h2>
              <span>{brl(limite)}</span>
            </div>
            <Seletor className="visoes visoes-claras" rotulo="Forma do limite" opcoes={VISOES} valor={visao} mudar={setVisao} />
            <div className="medidor">
              {visao === 'arco' && <LimitGauge value={faturado} limit={limite} size={300} />}
              {visao === 'curva' && <AccumulatedChart data={dadosMeses} limit={limite} projection={projecao ?? undefined} />}
              {visao === 'barra' && <LimitTrack data={dadosMeses} limit={limite} projection={projecao ?? undefined} />}
            </div>
          </section>
        )}

        {comExtrato && <LinhaDas banco={banco} ano={ano} mudar={mudar} />}

        <section aria-labelledby="prazos-titulo">
          <h2 id="prazos-titulo">Próximos prazos</h2>
          <ol className="prazos">
            <li data-hoje="true">
              <span className="marco" aria-hidden="true" />
              <b className="mm-num">{dataCurtaHoje()}</b>
              <span>Hoje</span>
            </li>
            {prazos.map((p) => (
              <li key={p.titulo}>
                <span className="marco" aria-hidden="true" />
                <b className="mm-num">{dataCurta(p.data)}</b>
                <span>{p.titulo}, {dasnEntregue(p) ? 'entregue' : quando(p.dias)}</span>
              </li>
            ))}
          </ol>
        </section>

        <LembretesAparelho banco={banco} mudar={mudar} dadosProtegidos={dadosProtegidos} instalar={instalar} comDados={comExtrato} />
      </div>
    </main>
  )
}
