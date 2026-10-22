// Barras por mês com uma faixa de corte fixa na média permitida e uma linha
// tracejada que segue o valor do mês escolhido.
// Inspirado no "hover trace bar chart" do shadcn, refeito em SVG com as cores
// e o AnimatedNumber do design system: sem Tailwind, Recharts nem Motion.

import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { MonthDatum } from '../../../design/design-system/components/index'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const W = 350
const H = 190
const TOPO = 16
const BASE = H - 22
const ESQ = 4
const FAIXA = (W - ESQ) / 12
const LARG = 16

const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })

interface Props {
  data: MonthDatum[]
  /** Média permitida por mês. Padrão 6750. */
  avg?: number
}

export default function BarrasRastro({ data, avg = 6750 }: Props) {
  const { AnimatedNumber } = window.MeuMEI
  const totais = Array.from({ length: 12 }, (_, i) => (data[i]?.s ?? 0) + (data[i]?.c ?? 0))
  const maior = totais.reduce((m, v, i) => (v > totais[m] ? i : m), 0)
  const [escolhido, setEscolhido] = useState<number | null>(null)
  const sel = escolhido ?? maior

  const topoEscala = Math.max(avg * 1.25, ...totais) * 1.08
  const y = (v: number) => BASE - (v / topoEscala) * (BASE - TOPO)
  const ySel = y(totais[sel])
  const diff = totais[sel] - avg

  function mesNoPonto(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    setEscolhido(Math.min(11, Math.max(0, Math.floor((x - ESQ) / FAIXA))))
  }

  function teclado(e: KeyboardEvent<SVGSVGElement>) {
    const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!passo) return
    e.preventDefault()
    setEscolhido(Math.min(11, Math.max(0, sel + passo)))
  }

  return (
    <div className="rastro">
      <div className="rastro-topo">
        <div>
          <span className="rotulo">{escolhido === null ? 'Maior mês do ano' : 'Mês escolhido'}</span>
          <AnimatedNumber value={totais[sel]} style={{ fontSize: 26, lineHeight: '32px', fontWeight: 500, whiteSpace: 'nowrap' }} />
        </div>
        <div className="rastro-mes">
          <b>{MESES[sel]}</b>
          {totais[sel] > 0 && (
            <span data-acima={diff > 0}>
              R$ {fmt(Math.abs(diff))} {diff > 0 ? 'acima' : 'abaixo'} do corte
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="slider"
        tabIndex={0}
        aria-label="Faturamento por mês"
        aria-valuemin={1}
        aria-valuemax={12}
        aria-valuenow={sel + 1}
        aria-valuetext={`${MESES[sel]}: R$ ${fmt(totais[sel])}`}
        onPointerDown={mesNoPonto}
        onPointerMove={mesNoPonto}
        onKeyDown={teclado}
        style={{ display: 'block', overflow: 'visible', touchAction: 'pan-y' }}
      >
        {/* Faixa de corte fixa na média permitida: o que passa dela fica em destaque. */}
        <rect x={ESQ} y={TOPO - 8} width={W - ESQ} height={y(avg) - TOPO + 8} fill="var(--warning-surface)" />
        <line x1={ESQ} x2={W} y1={y(avg)} y2={y(avg)} stroke="var(--warning)" strokeWidth={1.5} />
        <text x={W} y={y(avg) - 6} textAnchor="end" fontSize={10} fontWeight={600} fill="var(--warning)">
          corte R$ {fmt(avg)}
        </text>

        {totais.map((t, i) => {
          const cx = ESQ + FAIXA * i + FAIXA / 2
          const ativo = i === sel
          const s = data[i]?.s ?? 0
          const c = data[i]?.c ?? 0
          return (
            <g key={i} opacity={ativo ? 1 : 0.28} style={{ transition: 'opacity .2s' }}>
              {t === 0 ? (
                <circle cx={cx} cy={BASE - 2} r={2.5} fill="var(--ink-muted)" />
              ) : (
                <>
                  <rect x={cx - LARG / 2} y={y(s)} width={LARG} height={BASE - y(s)} rx={4} fill="var(--servicos)" />
                  {c > 0 && (
                    <rect x={cx - LARG / 2} y={y(t)} width={LARG} height={y(s) - y(t) - 2} rx={4} fill="var(--comercio)" />
                  )}
                  {t > avg && (
                    <rect x={cx - LARG / 2} y={y(t)} width={LARG} height={y(avg) - y(t)} rx={4} fill="var(--warning)" />
                  )}
                </>
              )}
              <text x={cx} y={H - 4} textAnchor="middle" fontSize={11} fontWeight={ativo ? 700 : 500} fill="var(--ink)">
                {MESES[i][0]}
              </text>
            </g>
          )
        })}

        {/* Linha que segue o valor: desliza com transição, como a mola do original. */}
        <g style={{ transform: `translateY(${ySel}px)`, transition: 'transform .45s cubic-bezier(.2,.8,.2,1)' }}>
          <line x1={ESQ} x2={W} y1={0} y2={0} stroke="var(--ink)" strokeDasharray="3 3" />
          <rect x={ESQ - 2} y={-9} width={fmt(totais[sel]).length * 7 + 14} height={18} rx={4} fill="var(--ink)" />
          <text x={ESQ + 5} y={4} fontSize={11} fontWeight={600} fill="var(--surface)" className="mm-num">
            {fmt(totais[sel])}
          </text>
          <circle cx={W} cy={0} r={3} fill="var(--ink)" />
        </g>
      </svg>

      <div className="rastro-legenda">
        <span><i style={{ background: 'var(--servicos)' }} />Serviços</span>
        <span><i style={{ background: 'var(--comercio)' }} />Comércio</span>
        <span><i style={{ background: 'var(--warning)' }} />Acima do corte de R$ {fmt(avg)}</span>
      </div>
    </div>
  )
}
