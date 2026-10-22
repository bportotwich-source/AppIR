import { useEffect, useRef, useState } from 'react'
import type { TelaProps } from '../App'
import { importar } from '../core/banco'
import { lerArquivo } from '../core/arquivos'
import { extratosDoAno } from '../core/agenda'
import { brl } from '../core/relatorio'
import { MESES } from '../core/formato'
import { Cabecalho, Pontilhado, Recibo } from '../componentes/Pecas'
import { Alternar, SeletorPerfil } from '../componentes/Perfil'
import { carteiraPf, importarPf, nomesPerfis, separarRetiradasDoTitular, titularDo, type ContaPf } from '../core/pf'

type Conta = 'pj' | 'conta' | 'cartao'

const dataCurtaBr = (isoData: string) => `${isoData.slice(8, 10)}/${isoData.slice(5, 7)}`
const maiuscula = (s: string) => s[0].toUpperCase() + s.slice(1)

type Leitura = {
  arquivo: string; quando: Date; mes: string
  lidas: number; novas: number; repetidas: number; saidas: number; sozinhas: number; aRevisar: number
  pf?: boolean
  aviso?: string
}
type Estado = 'idle' | 'reading' | 'done'

/** Mês que mais aparece no extrato, como "Outubro de 2026". */
function mesDoExtrato(datas: string[]): string {
  const conta = new Map<string, number>()
  for (const d of datas) conta.set(d.slice(0, 7), (conta.get(d.slice(0, 7)) ?? 0) + 1)
  const [ym] = [...conta.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['']
  return ym ? `${maiuscula(MESES[Number(ym.slice(5, 7)) - 1])} de ${ym.slice(0, 4)}` : ''
}

export default function Importar({ banco, ano, mudar, ir, historico, perfil, mudarPerfil }: TelaProps & { historico?: boolean }) {
  const { ScanDrop } = window.MeuMEI
  const [estado, setEstado] = useState<Estado>('idle')
  const [leitura, setLeitura] = useState<Leitura | null>(null)
  const [erro, setErro] = useState('')
  const refHistorico = useRef<HTMLElement>(null)
  const meses = extratosDoAno(banco, ano)
  const [contaPf, setContaPf] = useState<ContaPf>('conta')
  const conta: Conta = perfil === 'pj' ? 'pj' : contaPf
  const nomes = nomesPerfis(titularDo(banco))

  useEffect(() => {
    if (historico) refHistorico.current?.scrollIntoView({ block: 'start' })
  }, [historico])

  async function aoEscolher(arquivo: File | undefined) {
    if (!arquivo) return
    setEstado('reading')
    setLeitura(null)
    setErro('')
    try {
      const movs = await lerArquivo(arquivo)
      if (movs.length === 0) throw new Error('Nenhuma movimentação encontrada. Esse arquivo é um extrato do Nubank?')
      // A fatura do cartão em CSV tem a coluna "amount": vai para o cartão da PF.
      const destino: Conta = arquivo.name.toLowerCase().endsWith('.csv') && /amount/i.test((await arquivo.text()).split('\n')[0]) ? 'cartao' : conta
      if (destino !== 'pj') setContaPf(destino)
      const base = { arquivo: arquivo.name, quando: new Date(), mes: mesDoExtrato(movs.map((m) => m.data)), lidas: movs.length }
      if (destino !== 'pj') {
        const r = importarPf(banco, movs, destino, arquivo.name)
        mudar(r.banco)
        setLeitura({
          ...base, novas: r.novas, repetidas: r.repetidas, saidas: 0, sozinhas: 0, aRevisar: r.semCategoria, pf: true,
          aviso: perfil === 'pj' ? `É a fatura do cartão: foi para ${nomes.pf}.` : undefined,
        })
      } else {
        const r = importar(banco, movs, arquivo.name)
        mudar(separarRetiradasDoTitular(r.banco))
        const ids = new Set(banco.movimentacoes.map((m) => m.id))
        const novos = r.banco.movimentacoes.filter((m) => !ids.has(m.id))
        setLeitura({
          ...base, novas: r.novas, repetidas: r.repetidas,
          saidas: novos.filter((m) => m.tipo === 'saida').length,
          sozinhas: novos.filter((m) => m.tipo === 'entrada' && m.faturamento !== null).length,
          aRevisar: novos.filter((m) => m.faturamento === null).length,
        })
      }
      setEstado('done')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para ler esse arquivo.')
      setEstado('idle')
    }
  }

  const hora = leitura ? `${String(leitura.quando.getDate()).padStart(2, '0')}/${String(leitura.quando.getMonth() + 1).padStart(2, '0')} · ${leitura.quando.toTimeString().slice(0, 5)}` : ''

  return (
    <main className="conteudo topo">
      <Cabecalho titulo="Importar extrato" sub="Use o extrato do Nubank em OFX (o mais confiável), CSV ou PDF. Ele é lido aqui e não sai do celular." voltar={() => ir('inicio')} empilhado />
      <SeletorPerfil claro perfil={perfil} mudar={mudarPerfil} titular={titularDo(banco)} />
      {perfil === 'pf' && (
        <Alternar rotulo="De onde é o extrato" valor={contaPf} mudar={setContaPf} opcoes={[
          { id: 'conta', nome: 'Conta' },
          { id: 'cartao', nome: 'Cartão de crédito' },
        ]} />
      )}

      <label className="scan">
        <input
          type="file"
          accept=".ofx,.csv,.pdf,application/pdf,text/csv,application/x-ofx"
          disabled={estado === 'reading'}
          aria-label={estado === 'reading' ? 'Lendo o extrato' : 'Escolher arquivo do extrato'}
          onChange={(e) => { aoEscolher(e.target.files?.[0]); e.target.value = '' }}
        />
        <div inert>
          <ScanDrop key={estado} state={estado} size={250} fileName={leitura?.arquivo ?? 'o extrato'} doneText={leitura ? `${leitura.lidas} movimentações lidas` : undefined} />
        </div>
      </label>

      {erro && <p className="aviso perigo" role="alert">{erro}</p>}
      {leitura && (
        <Recibo rotulo="Leitura do extrato" className="sobe">
          <div aria-live="polite">
            <div className="recibo-topo">
              <span className="etiqueta">LEITURA DO EXTRATO</span>
              <span className="etiqueta">{hora}</span>
            </div>
            <h2>{leitura.mes}</h2>
            <p className="nota">{leitura.arquivo}</p>
            {leitura.aviso && <p className="nota" style={{ color: 'var(--brand)', fontWeight: 600 }}>{leitura.aviso}</p>}
            <div className="tracejado" aria-hidden="true" />
            <dl>
              <Pontilhado rotulo="Movimentações lidas" valor={leitura.lidas} />
              <Pontilhado rotulo="Novas" valor={leitura.novas} />
              <Pontilhado rotulo="Já importadas, ignoradas" valor={leitura.repetidas} cor="var(--ink-muted)" />
              {!leitura.pf && <Pontilhado rotulo="Saídas, fora do faturamento" valor={leitura.saidas} cor="var(--ink-muted)" />}
              {!leitura.pf && <Pontilhado rotulo="Marcadas sozinhas" valor={leitura.sozinhas} cor="var(--brand)" forte />}
              <Pontilhado rotulo={leitura.pf ? 'Gastos sem categoria' : 'Para você revisar'} valor={leitura.aRevisar} cor="#92400e" forte />
            </dl>
            {leitura.aRevisar > 0 && (
              <>
                <div className="tracejado" aria-hidden="true" />
                <button className="principal com-seta" onClick={() => ir(leitura.pf ? 'revisar-pf' : 'revisar')}>
                  {leitura.pf ? `Separar ${leitura.aRevisar} ${leitura.aRevisar === 1 ? 'gasto' : 'gastos'}` : `Revisar ${leitura.aRevisar} ${leitura.aRevisar === 1 ? 'entrada' : 'entradas'}`}
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
                </button>
              </>
            )}
          </div>
        </Recibo>
      )}

      {perfil === 'pf' ? <HistoricoPf banco={banco} /> : (
      <section id="historico" ref={refHistorico} aria-labelledby="hist-t" className="historico">
        <div className="titulo-linha">
          <h2 id="hist-t">Extratos importados</h2>
          {meses.length > 0 && <button className="link" onClick={() => ir('movimentacoes')}>Ver movimentações</button>}
        </div>
        {meses.length === 0 ? (
          <p className="apoio">Nenhum extrato de {ano} ainda.</p>
        ) : (
          <ol className="linha-tempo">
            {meses.map((m, i) => (
              <li key={m.mes} data-atual={i === 0}>
                <span className="ponto" aria-hidden="true" />
                <div>
                  <b>{maiuscula(m.nome)}</b>
                  <span>Importado em {dataCurtaBr(m.importadoEm)} · {m.movimentacoes} {m.movimentacoes === 1 ? 'movimentação' : 'movimentações'}</span>
                </div>
                <div className="valor">
                  <b className="mm-num">{brl(m.faturado)}</b>
                  <span>faturado</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      )}
    </main>
  )
}

/** Arquivos da PF já importados, do mais recente para o mais antigo. */
function HistoricoPf({ banco }: Pick<TelaProps, 'banco'>) {
  const arquivos = new Map<string, { arquivo: string; conta: ContaPf; importadoEm: string; n: number; gastos: number }>()
  for (const r of carteiraPf(banco).movimentacoes) {
    const k = `${r.conta}|${r.arquivo}`
    const a = arquivos.get(k) ?? { arquivo: r.arquivo, conta: r.conta, importadoEm: r.importadoEm, n: 0, gastos: 0 }
    a.n++
    if (r.tipo === 'saida') a.gastos += r.valor
    if (r.importadoEm > a.importadoEm) a.importadoEm = r.importadoEm
    arquivos.set(k, a)
  }
  const lista = [...arquivos.values()].sort((a, b) => b.importadoEm.localeCompare(a.importadoEm))
  return (
    <section aria-labelledby="hist-t" className="historico">
      <h2 id="hist-t">Extratos importados</h2>
      {lista.length === 0 ? (
        <p className="apoio">Nenhum extrato pessoal ainda.</p>
      ) : (
        <ol className="linha-tempo">
          {lista.map((a, i) => (
            <li key={`${a.conta}${a.arquivo}`} data-atual={i === 0}>
              <span className="ponto" aria-hidden="true" />
              <div>
                <b>{a.conta === 'cartao' ? 'Fatura do cartão' : 'Conta'}</b>
                <span>Importado em {dataCurtaBr(a.importadoEm)} · {a.n} {a.n === 1 ? 'movimentação' : 'movimentações'}</span>
              </div>
              <div className="valor">
                <b className="mm-num">{brl(a.gastos)}</b>
                <span>saídas</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
