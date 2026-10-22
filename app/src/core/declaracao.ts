// DASN-SIMEI (o que ela precisa e se foi entregue) e o Relatório Mensal das
// Receitas Brutas, que o MEI preenche todo mês e guarda com as notas.

import type { Banco, Declaracao } from './banco'
import { totaisPorMes } from './relatorio'

const DIA_MS = 86_400_000
const isoHoje = (d: Date) => d.toLocaleDateString('sv-SE')

export const declaracaoDo = (banco: Banco, ano: number): Declaracao => banco.declaracoes?.[String(ano)] ?? {}

export function mudarDeclaracao(banco: Banco, ano: number, mudanca: Partial<Declaracao>): Banco {
  const atual = { ...declaracaoDo(banco, ano), ...mudanca }
  for (const k of Object.keys(atual) as (keyof Declaracao)[]) if (atual[k] === undefined) delete atual[k]
  return { ...banco, declaracoes: { ...banco.declaracoes, [String(ano)]: atual } }
}

export const entregar = (banco: Banco, ano: number, entregueEm: string, recibo: string) =>
  mudarDeclaracao(banco, ano, { entregueEm, recibo: recibo.trim() || undefined })

export const desfazerEntrega = (banco: Banco, ano: number) =>
  mudarDeclaracao(banco, ano, { entregueEm: undefined, recibo: undefined })

export interface AvisoDasn {
  ano: number // ano-calendário a declarar
  dias: number // até 31 de maio; negativo = atrasada
}

// A partir daqui o Início lembra da DASN que ainda não foi entregue.
export const DIAS_AVISO_DASN = 45

/** DASN do ano anterior ainda não entregue, a 45 dias do prazo ou até um mês atrasada. */
export function avisoDasn(banco: Banco, hoje = new Date()): AvisoDasn | null {
  const ano = hoje.getFullYear() - 1
  if (declaracaoDo(banco, ano).entregueEm) return null
  // Só cobra de quem já era MEI naquele ano.
  const teveMovimento = banco.movimentacoes.some((r) => r.data.startsWith(`${ano}-`))
  const a = banco.abertura // null = aberto antes do ano atual
  const eraMei = teveMovimento || a === null || (typeof a === 'string' && Number(a.slice(0, 4)) <= ano)
  if (!eraMei) return null
  const dias = Math.round((Date.UTC(ano + 1, 4, 31) - Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / DIA_MS)
  // Depois de um mês de atraso para de cobrar: quem começou a usar o app agora
  // provavelmente já entregou, e a Declaração continua mostrando o que falta.
  if (dias > DIAS_AVISO_DASN || dias < -30) return null
  return { ano, dias }
}

export const hojeIso = (hoje = new Date()) => isoHoje(hoje)

export interface LinhaRelatorio {
  semNota: number
  comNota: number
  total: number
}

export interface RelatorioMensal {
  comercio: LinhaRelatorio
  industria: LinhaRelatorio
  servicos: LinhaRelatorio
  total: number
}

const linha = (total: number, comNota = 0): LinhaRelatorio => {
  const com = Math.min(Math.max(0, comNota), total)
  return { semNota: total - com, comNota: com, total }
}

/** Valores do Relatório Mensal das Receitas Brutas de um mês. O que não foi
 * informado como nota fiscal emitida entra como venda sem nota (dispensada
 * para venda a pessoa física). Indústria fica zerada: o app não separa. */
export function relatorioMensal(banco: Banco, ano: number, mes: number): RelatorioMensal {
  const t = totaisPorMes(banco, ano)[mes - 1]
  const notas = banco.notasFiscais?.[`${ano}-${String(mes).padStart(2, '0')}`] ?? {}
  const comercio = linha(t.comercio, notas.comercio)
  const servicos = linha(t.servicos, notas.servicos)
  return { comercio, industria: linha(0), servicos, total: comercio.total + servicos.total }
}

export function mudarNotas(banco: Banco, ano: number, mes: number, notas: { servicos?: number; comercio?: number }): Banco {
  const chave = `${ano}-${String(mes).padStart(2, '0')}`
  return { ...banco, notasFiscais: { ...banco.notasFiscais, [chave]: { ...banco.notasFiscais?.[chave], ...notas } } }
}
