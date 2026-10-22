import { useState } from 'react'
import type { TelaProps } from '../App'
import { importar } from '../core/banco'
import { lerArquivo } from '../core/arquivos'

type Resultado =
  | { tipo: 'ok'; arquivo: string; lidas: number; novas: number; repetidas: number; aRevisar: number }
  | { tipo: 'erro'; mensagem: string }

export default function Importar({ banco, mudar, ir }: TelaProps) {
  const [lendo, setLendo] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function aoEscolher(arquivo: File | undefined) {
    if (!arquivo) return
    setLendo(true)
    setResultado(null)
    try {
      const movs = await lerArquivo(arquivo)
      if (movs.length === 0) throw new Error('Nenhuma movimentação encontrada. Esse arquivo é o extrato do Nubank PJ?')
      const r = importar(banco, movs, arquivo.name)
      mudar(r.banco)
      const ids = new Set(banco.movimentacoes.map((m) => m.id))
      const aRevisar = r.banco.movimentacoes.filter((m) => !ids.has(m.id) && m.faturamento === null).length
      setResultado({ tipo: 'ok', arquivo: arquivo.name, lidas: movs.length, novas: r.novas, repetidas: r.repetidas, aRevisar })
    } catch (e) {
      setResultado({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Não deu para ler esse arquivo.' })
    } finally {
      setLendo(false)
    }
  }

  return (
    <main className="conteudo topo">
      <h1>Importar extrato</h1>
      <p className="apoio">Use o extrato do Nubank PJ em OFX (o mais confiável), CSV ou PDF. Ele é lido aqui e não sai do celular.</p>

      <label className="envio">
        <input type="file" accept=".ofx,.csv,.pdf,application/pdf,text/csv,application/x-ofx" disabled={lendo} onChange={(e) => aoEscolher(e.target.files?.[0])} />
        <b>{lendo ? 'Lendo o extrato…' : 'Escolher arquivo do extrato'}</b>
        <span>Toque para abrir os arquivos</span>
      </label>

      {resultado?.tipo === 'erro' && <p className="aviso perigo" role="alert">{resultado.mensagem}</p>}
      {resultado?.tipo === 'ok' && (
        <section className="recibo" aria-live="polite">
          <span className="rotulo">Leitura do extrato</span>
          <p className="arquivo">{resultado.arquivo}</p>
          <dl>
            <div><dt>Movimentações lidas</dt><dd>{resultado.lidas}</dd></div>
            <div><dt>Novas</dt><dd>{resultado.novas}</dd></div>
            <div><dt>Já importadas, ignoradas</dt><dd>{resultado.repetidas}</dd></div>
            <div><dt>Entradas para revisar</dt><dd>{resultado.aRevisar}</dd></div>
          </dl>
          {resultado.aRevisar > 0 && (
            <button className="principal" onClick={() => ir('revisar')}>Revisar {resultado.aRevisar} entradas</button>
          )}
        </section>
      )}
    </main>
  )
}
