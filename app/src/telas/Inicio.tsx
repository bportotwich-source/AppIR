import { useState } from 'react'
import type { TelaProps } from '../App'
import BarrasRastro from '../componentes/BarrasRastro'
import { PerguntaAbertura } from '../componentes/CampoAbertura'
import { brl, limiteAnual, limiteDoAno, pendentes, projecaoAno, total, totaisAno, totaisPorMes } from '../core/relatorio'
import { dataCurta, MESES, pagador } from '../core/formato'
import { iniciais, proximosPrazos, quando } from '../core/agenda'
import { entradas } from '../core/banco'
import Icone from '../componentes/Icone'
import LinhaDas from '../componentes/LinhaDas'
import { dadosEmRisco, ehIphone } from '../core/armazenamento'
import { backupAtrasado, enviarBackup } from '../core/store'
import { avisoDasn, declaracaoDo } from '../core/declaracao'

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

export default function Inicio({ banco, ano, ir, anos, mudarAno, mudar, dadosProtegidos, instalar }: Props) {
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
  const diasBackup = backupAtrasado(banco)
  const filaPendente = entradas(banco, ano).filter((r) => r.faturamento === null || (r.faturamento && r.categoria === null))
  const valorPendente = filaPendente.reduce((soma, r) => soma + r.valor, 0)
  const pagadores = [...new Set(filaPendente.map((r) => iniciais(pagador(r.descricao).nome)))].slice(0, 4)
  const prazos = proximosPrazos()
  const dasn = avisoDasn(banco)
  const dasnEntregue = (p: { titulo: string; data: string }) => p.titulo.startsWith('DASN') && !!declaracaoDo(banco, Number(p.data.slice(0, 4)) - 1).entregueEm
  const [backupFalhou, setBackupFalhou] = useState(false)

  async function fazerBackup() {
    try {
      const novo = await enviarBackup(banco)
      if (novo) mudar(novo)
    } catch {
      setBackupFalhou(true)
    }
  }

  return (
    <main>
      <section className="faixa" aria-label="Resumo do ano">
        <svg className="faixa-circulos" aria-hidden="true" width="390" height="560" viewBox="0 0 390 560">
          {[150, 200, 250, 300].map((r, i) => <circle key={r} cx="195" cy="300" r={r} fill="none" stroke="#2dd4bf" strokeOpacity={[0.08, 0.06, 0.045, 0.03][i]} />)}
        </svg>
        <div className="faixa-topo">
          <span className="marca">
            <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="10" fill="#2dd4bf" /><rect x="8" y="17" width="4" height="8" rx="2" fill="#0c2a27" /><rect x="14" y="12" width="4" height="13" rx="2" fill="#0c2a27" /><rect x="20" y="7" width="4" height="18" rx="2" fill="#0c2a27" /></svg>
            Meu MEI
          </span>
          <label className="so-leitor" htmlFor="ano">Ano</label>
          <div className="faixa-acoes">
            <select id="ano" value={ano} onChange={(e) => mudarAno(Number(e.target.value))}>
              {anos.map((a) => <option key={a}>{a}</option>)}
            </select>
            <button className="engrenagem" aria-label="Ajustes" onClick={() => ir('ajustes')}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
        <p className="faixa-nota">
          {comExtrato ? `Atualizado com o extrato de ${MESES[ultimoMes - 1]}` : 'Nenhum extrato importado ainda'}
          {limite !== anual && ` · Limite de ${ano}: ${brl(limite)} (ano de abertura)`}
        </p>
        <h1>Seu ano até aqui</h1>
        <Seletor className="visoes" rotulo="Forma do limite" opcoes={VISOES} valor={visao} mudar={setVisao} />
        <div className="medidor">
          {visao === 'arco' && <LimitGauge value={total(t)} limit={limite} tone="dark" size={300} />}
          {visao === 'curva' && <AccumulatedChart data={dadosMeses} limit={limite} projection={projecao ?? undefined} tone="dark" />}
          {visao === 'barra' && <LimitTrack data={dadosMeses} limit={limite} projection={projecao ?? undefined} tone="dark" />}
        </div>
        {/* Curva e Barra já mostram a projeção. */}
        {visao === 'arco' && projecao !== null && (
          <p className="projecao sobe">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
            <span>No ritmo atual, {ano} fecha perto de <b>{reais(projecao)}</b>.{' '}
            {projecao <= limite
              ? `Fica dentro do limite, com folga de ${reais(limite - projecao)}.`
              : 'Passa do limite: vale falar com um contador.'}
            </span>
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

        {comExtrato && (
          <section>
            <div className="titulo-linha">
              <h2>Por categoria</h2>
              <span>{ultimoMes > 1 ? `janeiro a ${MESES[ultimoMes - 1]}` : MESES[0]}</span>
            </div>
            <SplitBar items={[
              { label: 'Serviços', value: t.servicos, color: 'var(--servicos)' },
              { label: 'Comércio', value: t.comercio, color: 'var(--comercio)' },
            ]} />
          </section>
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
              <span>{brl(valorPendente)} ainda fora do total</span>
            </span>
            <span className="ticket-seta" aria-hidden="true"><Icone nome="seta" tamanho={18} /></span>
          </button>
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

        {diasBackup !== null && (
          <section className="lembrete" aria-labelledby="backup-titulo">
            <b id="backup-titulo">{diasBackup === Infinity ? 'Você ainda não fez backup' : `Último backup há ${diasBackup} dias`}</b>
            <span>Se o celular quebrar ou o navegador limpar os dados, os extratos e as marcações somem. Guarde uma cópia no Drive, no WhatsApp ou no e-mail.</span>
            <button className="principal" onClick={fazerBackup}>Fazer backup agora</button>
            {backupFalhou && <span role="alert">Não deu para gerar o backup. Tente pela tela Ajustes.</span>}
          </section>
        )}

        {comExtrato && dadosEmRisco(dadosProtegidos) && (
          <section className="lembrete" aria-labelledby="instalar-titulo">
            <b id="instalar-titulo">Instale o app na tela de início</b>
            {ehIphone() ? (
              <span>No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Aberto pelo navegador, o iPhone pode apagar os dados depois de alguns dias sem uso.</span>
            ) : (
              <span>
                Assim o navegador não apaga seus dados quando faltar espaço no celular.
                {!instalar && ' No Chrome, abra o menu ⋮ e toque em Instalar app.'}
              </span>
            )}
            {instalar && <button className="principal" onClick={instalar}>Instalar app</button>}
          </section>
        )}


        {comExtrato && (
          <section>
            <h2>Mês a mês</h2>
            <Seletor className="graficos" rotulo="Forma do gráfico" opcoes={GRAFICOS} valor={grafico} mudar={setGrafico} />
            {grafico === 'rastro' ? (
              <BarrasRastro data={dadosMeses} avg={anual / 12} />
            ) : (
              <MonthChart key={grafico} data={dadosMeses} variant={grafico} avg={anual / 12} max={Math.max(9000, (anual / 12) * 1.33)} />
            )}
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
      </div>
    </main>
  )
}
