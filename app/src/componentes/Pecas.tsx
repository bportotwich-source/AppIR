// Peças repetidas das telas do canvas (Meu MEI · Telas).

import type { ReactNode } from 'react'

/** Cabeçalho com botão redondo de voltar, como em Revisar e Declaração. */
export function Cabecalho({ titulo, sub, voltar, empilhado, rotuloVoltar = 'Voltar para o início' }: { titulo: string; sub?: string; voltar: () => void; empilhado?: boolean; rotuloVoltar?: string }) {
  return (
    <header className={'cabecalho' + (empilhado ? ' empilhado' : '')}>
      <button className="voltar-redondo" aria-label={rotuloVoltar} onClick={voltar}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <div>
        <h1>{titulo}</h1>
        {sub && <p>{sub}</p>}
      </div>
    </header>
  )
}

function serra(baixo: boolean): string {
  const n = 25, w = 350 / n
  let d = baixo ? 'M0 0' : 'M0 10'
  for (let i = 0; i < n; i++) {
    d += baixo ? ` L${i * w + w / 2} 10 L${(i + 1) * w} 0` : ` L${i * w + w / 2} 0 L${(i + 1) * w} 10`
  }
  return d + ' Z'
}

/** Papel de recibo com as bordas serrilhadas em cima e embaixo. */
export function Recibo({ children, rotulo, className }: { children: ReactNode; rotulo: string; className?: string }) {
  return (
    <section aria-label={rotulo} className={'recibo-serra' + (className ? ' ' + className : '')}>
      <svg aria-hidden="true" viewBox="0 0 350 10" preserveAspectRatio="none"><path d={serra(false)} /></svg>
      <div className="recibo-papel">{children}</div>
      <svg aria-hidden="true" viewBox="0 0 350 10" preserveAspectRatio="none"><path d={serra(true)} /></svg>
    </section>
  )
}

/** Linha "rótulo ........ valor" do recibo. */
export function Pontilhado({ rotulo, valor, cor, forte }: { rotulo: ReactNode; valor: ReactNode; cor?: string; forte?: boolean }) {
  return (
    <div className="pontilhado" style={{ color: cor, fontWeight: forte ? 600 : undefined }}>
      <dt>{rotulo}</dt>
      <span aria-hidden="true" />
      <dd className="mm-num">{valor}</dd>
    </div>
  )
}
