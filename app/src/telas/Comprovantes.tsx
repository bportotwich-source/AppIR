import { useState } from 'react'
import type { TelaProps } from '../App'
import { brl } from '../core/relatorio'
import { MESES } from '../core/formato'
import { comprovantes, type Comprovante } from '../core/comprovantes'
import { Cabecalho } from '../componentes/Pecas'
import { rotuloComprovante } from './mes'

type Filtro = 'todos' | 'pf' | 'pj' | 'saude' | 'soltos'
const FILTROS: { id: Filtro; nome: string; passa: (c: Comprovante) => boolean }[] = [
  { id: 'todos', nome: 'Todos', passa: () => true },
  { id: 'pf', nome: 'PF', passa: (c) => c.perfil === 'pf' },
  { id: 'pj', nome: 'PJ', passa: (c) => c.perfil === 'pj' },
  { id: 'saude', nome: 'Saúde e escola', passa: (c) => c.tipo === 'saude' },
  { id: 'soltos', nome: 'Sem compra', passa: (c) => !c.movId && c.tipo !== 'saude' },
]

const mesDe = (c: Comprovante) => (c.data || c.mes || c.criadoEm).slice(0, 7)

export default function Comprovantes({ banco, ir }: TelaProps) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const lista = comprovantes(banco).filter(FILTROS.find((f) => f.id === filtro)!.passa)
  const meses = [...new Set(lista.map(mesDe))].sort().reverse()

  return (
    <main className="conteudo topo">
      <Cabecalho titulo="Comprovantes" sub="Notas e recibos lidos no celular. Cada um é ligado à compra certa do extrato." voltar={() => ir('inicio')} empilhado />

      <div className="chips" role="group" aria-label="Mostrar">
        {FILTROS.map((f) => <button key={f.id} type="button" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.nome}</button>)}
      </div>

      {comprovantes(banco).length === 0 ? (
        <section>
          <p className="apoio">Nenhum comprovante ainda. Leia o QR code de um cupom de mercado ou farmácia, ou escolha o PDF de uma nota de loja online.</p>
          <div className="botoes">
            <button className="principal" onClick={() => ir('ler-nota')}>Ler QR code</button>
            <button className="botao" onClick={() => ir('comprovante', 'novo')}>Escolher PDF ou foto</button>
          </div>
        </section>
      ) : lista.length === 0 ? (
        <p className="apoio">Nenhum comprovante neste filtro.</p>
      ) : (
        meses.map((m) => {
          const doMes = lista.filter((c) => mesDe(c) === m).sort((a, b) => (b.data || b.criadoEm).localeCompare(a.data || a.criadoEm))
          return (
            <section key={m} aria-label={`${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`}>
              <div className="titulo-linha">
                <h2>{MESES[Number(m.slice(5, 7)) - 1]} {m.slice(0, 4)}</h2>
                <span className="mm-num">{brl(doMes.reduce((s, c) => s + c.valor, 0))}</span>
              </div>
              <ul className="lista-cartao">
                {doMes.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => ir(c.tipo === 'saude' ? 'recibo' : 'comprovante', c.id)}>
                      <span className="sigla" data-tipo={c.tipo} aria-hidden="true">{(c.saude?.prestador || c.loja).slice(0, 2).toUpperCase()}</span>
                      <span className="movs-nome">
                        <b>{c.saude?.prestador || c.loja}</b>
                        <span>{c.perfil.toUpperCase()} · {rotuloComprovante(c)}</span>
                        <span className="estado" data-ok={!!c.movId}>{c.movId ? 'Ligado à compra' : c.tipo === 'saude' ? 'Para o IR' : 'Sem compra no extrato'}</span>
                      </span>
                      <b className="mm-num">{brl(c.valor)}</b>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </main>
  )
}
