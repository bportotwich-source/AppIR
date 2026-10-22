// Prazos do MEI e resumo dos extratos importados, para o Início e a aba Extratos.

import type { Banco } from './banco'
import { MESES } from './formato'

const DIA_MS = 86_400_000
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const diasAte = (de: Date, ate: Date) =>
  Math.round((Date.UTC(ate.getFullYear(), ate.getMonth(), ate.getDate()) - Date.UTC(de.getFullYear(), de.getMonth(), de.getDate())) / DIA_MS)

export interface Prazo {
  data: string // AAAA-MM-DD
  titulo: string
  dias: number
}

/** O próximo DAS (dia 20, referente ao mês anterior) e a próxima DASN-SIMEI (31 de maio). */
export function proximosPrazos(hoje = new Date()): Prazo[] {
  const das = new Date(hoje.getFullYear(), hoje.getMonth() + (hoje.getDate() > 20 ? 1 : 0), 20)
  const referencia = MESES[(das.getMonth() + 11) % 12]
  const dasn = new Date(hoje.getFullYear() + (hoje.getMonth() > 4 ? 1 : 0), 4, 31)
  return [
    { data: iso(das), titulo: `DAS de ${referencia}`, dias: diasAte(hoje, das) },
    { data: iso(dasn), titulo: `DASN-SIMEI ${dasn.getFullYear() - 1}`, dias: diasAte(hoje, dasn) },
  ]
}

export const quando = (dias: number) => (dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`)

export interface MesImportado {
  mes: number // 1 a 12
  nome: string
  importadoEm: string // ISO da última importação com movimentações do mês
  movimentacoes: number
  faturado: number
}

/** Um item por mês com extrato no ano, do mais recente ao mais antigo. */
export function extratosDoAno(banco: Banco, ano: number): MesImportado[] {
  const meses = new Map<number, MesImportado>()
  for (const r of banco.movimentacoes) {
    if (!r.data.startsWith(`${ano}-`)) continue
    const mes = Number(r.data.slice(5, 7))
    const m = meses.get(mes) ?? { mes, nome: MESES[mes - 1], importadoEm: '', movimentacoes: 0, faturado: 0 }
    m.movimentacoes++
    if (r.tipo === 'entrada' && r.faturamento === true) m.faturado += r.valor
    if (r.importadoEm > m.importadoEm) m.importadoEm = r.importadoEm
    meses.set(mes, m)
  }
  return [...meses.values()].sort((a, b) => b.mes - a.mes)
}

/** "Maria Souza" vira "MS"; "DELTA EVENTOS LTDA" vira "DE". */
export function iniciais(nome: string): string {
  const palavras = nome.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase().split(/[^A-Z]+/).filter((p) => p.length > 1)
  return ((palavras[0]?.[0] ?? '?') + (palavras[1]?.[0] ?? '')).slice(0, 2)
}
