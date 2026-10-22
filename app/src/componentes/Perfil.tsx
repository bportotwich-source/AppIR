// Seletor dos perfis (Bruno PJ · Bruno PF), olho que esconde os
// valores e a chave de duas opções usada no topo de Revisar e Declaração.

import { CATEGORIAS_PF, nomesPerfis, type CategoriaPf, type Perfil } from '../core/pf'

/** `claro`: versão para o topo das abas (Revisar, Notas, Declaração), sobre fundo claro. */
export function SeletorPerfil({ perfil, mudar, titular, claro }: { perfil: Perfil; mudar: (p: Perfil) => void; titular?: string; claro?: boolean }) {
  const nomes = nomesPerfis(titular)
  const opcoes: { id: Perfil; nome: string }[] = [{ id: 'pj', nome: nomes.pj }, { id: 'pf', nome: nomes.pf }]
  return (
    <div className={'perfis' + (claro ? ' claro' : '')} role="radiogroup" aria-label="Perfil">
      {opcoes.map((o) => (
        <button key={o.id} role="radio" aria-checked={perfil === o.id} onClick={() => mudar(o.id)}>{o.nome}</button>
      ))}
    </div>
  )
}

export function BotaoOlho({ oculto, alternar }: { oculto: boolean; alternar: () => void }) {
  return (
    <button className="engrenagem" aria-label="Esconder valores" aria-pressed={oculto} onClick={alternar}>
      {oculto ? (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
      ) : (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  )
}

export function Engrenagem({ abrir }: { abrir: () => void }) {
  return (
    <button className="engrenagem" aria-label="Ajustes" onClick={abrir}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  )
}

/** Duas telas irmãs (entradas PJ / gastos PF; DASN / IRPF), trocadas por um toque. */
export function Alternar<T extends string>({ rotulo, opcoes, valor, mudar }: { rotulo: string; opcoes: { id: T; nome: string }[]; valor: T; mudar: (v: T) => void }) {
  return (
    <div className="movs-abas" role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} onClick={() => mudar(o.id)}>{o.nome}</button>
      ))}
    </div>
  )
}

export function Categorias({ valor, mudar, rotulo, opcoes = CATEGORIAS_PF }: { valor: string | null | undefined; mudar: (c: CategoriaPf) => void; rotulo: string; opcoes?: readonly { id: string; nome: string; cor: string }[] }) {
  return (
    <div className="chips" role="group" aria-label={rotulo}>
      {opcoes.map((c) => (
        <button key={c.id} type="button" aria-pressed={valor === c.id} onClick={() => mudar(c.id as CategoriaPf)}>
          <i aria-hidden="true" style={{ background: c.cor }} />{c.nome}
        </button>
      ))}
    </div>
  )
}
