import { useState } from 'react'
import type { TelaProps } from '../App'
import { MESES, dataCurta } from '../core/formato'
import { carteiraPf } from '../core/pf'
import type { Comprovante } from '../core/comprovantes'

/** Meses ("AAAA-MM") com movimento na PF ou retirada da PJ, mais o atual; o mais recente primeiro. */
export function mesesComDados(banco: TelaProps['banco']): string[] {
  const atual = new Date().toLocaleDateString('sv-SE').slice(0, 7)
  const meses = new Set([atual, ...carteiraPf(banco).movimentacoes.map((r) => r.data.slice(0, 7)), ...banco.movimentacoes.map((r) => r.data.slice(0, 7))])
  return [...meses].sort().reverse()
}

export const nomeMes = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1].slice(0, 3)} ${ym.slice(0, 4)}`
export const mesLongo = (ym: string) => MESES[Number(ym.slice(5, 7)) - 1]

export function useMes(banco: TelaProps['banco']): [string, (m: string) => void, string[]] {
  const meses = mesesComDados(banco)
  const comDados = meses.find((m) => carteiraPf(banco).movimentacoes.some((r) => r.data.startsWith(m)) || banco.movimentacoes.some((r) => r.data.startsWith(m)))
  const [mes, setMes] = useState(comDados ?? meses[0])
  return [mes, setMes, meses]
}

export function rotuloComprovante(c: Comprovante): string {
  const tipo = { nfce: 'Cupom NFC-e', pdf: 'PDF da nota', foto: 'Foto', saude: c.saude?.tipo ?? 'Recibo' }[c.tipo]
  const itens = c.itens?.length ? ` · ${c.itens.length} ${c.itens.length === 1 ? 'item' : 'itens'}` : ''
  return `${tipo}${itens}${c.data ? ' · ' + dataCurta(c.data) : ''}`
}
