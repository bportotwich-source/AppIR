import { useState } from 'react'
import type { TelaProps } from '../App'
import BarrasRastro from '../componentes/BarrasRastro'
import { LIMITE_ANUAL, pendentes, projecaoAno, total, totaisAno, totaisPorMes } from '../core/relatorio'
import { MESES } from '../core/formato'

// Projeção é estimativa: arredonda para centenas e mostra sem centavos.
const reais = (v: number) => 'R$ ' + (Math.round(v / 100) * 100).toLocaleString('pt-BR')

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

export default function Inicio({ banco, ano, ir, anos, mudarAno }: Props) {
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

  return (
    <main>
      <section className="faixa" aria-label="Resumo do ano">
        <div className="faixa-topo">
          <span className="marca">Meu MEI</span>
          <label className="so-leitor" htmlFor="ano">Ano</label>
          <select id="ano" value={ano} onChange={(e) => mudarAno(Number(e.target.value))}>
            {anos.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <p className="faixa-nota">
          {comExtrato ? `Atualizado com o extrato de ${MESES[ultimoMes - 1]}` : 'Nenhum extrato importado ainda'}
        </p>
        <h1>Seu ano até aqui</h1>
        <Seletor className="visoes" rotulo="Forma do limite" opcoes={VISOES} valor={visao} mudar={setVisao} />
        <div className="medidor">
          {visao === 'arco' && <LimitGauge value={total(t)} limit={LIMITE_ANUAL} tone="dark" size={280} />}
          {visao === 'curva' && <AccumulatedChart data={dadosMeses} limit={LIMITE_ANUAL} tone="dark" />}
          {visao === 'barra' && <LimitTrack data={dadosMeses} limit={LIMITE_ANUAL} tone="dark" />}
        </div>
        {/* Curva e Barra já mostram a projeção. */}
        {visao === 'arco' && projecao !== null && (
          <p className="projecao">
            No ritmo atual, {ano} fecha perto de <b>{reais(projecao)}</b>.{' '}
            {projecao <= LIMITE_ANUAL
              ? `Fica dentro do limite, com folga de ${reais(LIMITE_ANUAL - projecao)}.`
              : 'Passa do limite: vale falar com um contador.'}
          </p>
        )}
      </section>

      <div className="conteudo">
        {!comExtrato && (
          <section>
            <h2>Comece pelo extrato</h2>
            <p>Importe o extrato do Nubank PJ em OFX, CSV ou PDF. Ele é lido aqui e não sai do celular.</p>
            <button className="principal" onClick={() => ir('importar')}>Importar extrato</button>
          </section>
        )}

        {nPendentes > 0 && (
          <button className="ticket-pendente" onClick={() => ir('revisar')}>
            <b>{nPendentes} {nPendentes === 1 ? 'entrada para revisar' : 'entradas para revisar'}</b>
            <span>Fora do total até você decidir · Revisar agora</span>
          </button>
        )}

        {comExtrato && (
          <section>
            <h2>Por categoria</h2>
            <SplitBar items={[
              { label: 'Serviços', value: t.servicos, color: 'var(--servicos)' },
              { label: 'Comércio', value: t.comercio, color: 'var(--comercio)' },
            ]} />
          </section>
        )}

        {comExtrato && (
          <section>
            <h2>Mês a mês</h2>
            <Seletor className="graficos" rotulo="Forma do gráfico" opcoes={GRAFICOS} valor={grafico} mudar={setGrafico} />
            {grafico === 'rastro' ? (
              <BarrasRastro data={dadosMeses} />
            ) : (
              <MonthChart key={grafico} data={dadosMeses} variant={grafico} />
            )}
          </section>
        )}
      </div>
    </main>
  )
}
