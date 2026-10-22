// Saídas do extrato: o DAS de cada mês e a separação entre despesa da empresa
// e retirada, que o Imposto de Renda de pessoa física usa.
//
// As saídas não entram no faturamento do MEI. Elas servem para conferir se o
// DAS foi pago e para calcular o lucro da empresa.

import { chaveDescricao, type Banco, type Registro } from './banco'
import { pagador } from './formato'
import { totaisAno } from './relatorio'

const RE_DAS = /\bDAS\b|simples nacional|pgmei/i

export const ehDas = (r: Pick<Registro, 'tipo' | 'descricao'>) => r.tipo === 'saida' && RE_DAS.test(r.descricao)

/** A saída é despesa da empresa? O DAS sempre é; null = ainda não separada. */
export function despesa(r: Registro): boolean | null {
  if (ehDas(r)) return true
  return r.despesa ?? null
}

const saidasDoAno = (banco: Banco, ano: number) =>
  banco.movimentacoes.filter((r) => r.tipo === 'saida' && r.data.startsWith(`${ano}-`))

/** Marca todas as saídas para o mesmo destino e lembra para as próximas. */
export function marcarSaida(banco: Banco, chave: string, ehDespesa: boolean): Banco {
  return {
    ...banco,
    movimentacoes: banco.movimentacoes.map((r) =>
      r.tipo === 'saida' && !ehDas(r) && chaveDescricao(r.descricao) === chave ? { ...r, despesa: ehDespesa } : r,
    ),
    regrasSaida: { ...banco.regrasSaida, [chave]: ehDespesa },
  }
}

export interface GrupoSaida {
  chave: string
  nome: string
  operacao: string
  quantas: number
  valor: number
  das: boolean
  despesa: boolean | null // null também quando o grupo tem marcações diferentes
}

/** Saídas do ano agrupadas por destino, das maiores para as menores, com o DAS no fim. */
export function gruposSaida(banco: Banco, ano: number): GrupoSaida[] {
  const grupos = new Map<string, GrupoSaida>()
  for (const r of saidasDoAno(banco, ano)) {
    const chave = chaveDescricao(r.descricao)
    const g = grupos.get(chave)
    if (g) {
      g.quantas++
      g.valor += r.valor
      if (g.despesa !== despesa(r)) g.despesa = null
    } else {
      const { nome, operacao } = pagador(r.descricao)
      grupos.set(chave, { chave, nome, operacao, quantas: 1, valor: r.valor, das: ehDas(r), despesa: despesa(r) })
    }
  }
  // Ordem fixa: marcar um grupo não pode fazer a lista pular na tela.
  return [...grupos.values()].sort((a, b) => Number(a.das) - Number(b.das) || b.valor - a.valor)
}

// ---------- DAS ----------

export type EstadoDas = 'pago' | 'atrasado' | 'a-vencer' | 'sem-extrato' | 'antes'

export interface MesDas {
  mes: number // competência, 1 a 12
  estado: EstadoDas
  vence: string // "AAAA-MM-20" do mês seguinte
  pagoEm?: string
  valor?: number
  manual?: boolean
}

const ym = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}`
const anterior = (chave: string) => {
  const [a, m] = chave.split('-').map(Number)
  return m === 1 ? ym(a - 1, 12) : ym(a, m - 1)
}

/** Situação do DAS de cada mês do ano.
 *
 * O DAS de um mês vence no dia 20 do mês seguinte. Cada pagamento achado no
 * extrato quita o mês anterior ao do pagamento; se esse já está quitado, quita
 * o mês em aberto mais próximo antes dele (pagamento atrasado). Sem extrato
 * do mês do vencimento, não dá para saber se foi pago.
 */
export function dasDoAno(banco: Banco, ano: number, hoje = new Date()): MesDas[] {
  const pagos = new Map<string, Registro>()
  const pagamentos = banco.movimentacoes.filter(ehDas).sort((a, b) => a.data.localeCompare(b.data))
  for (const p of pagamentos) {
    let comp = anterior(p.data.slice(0, 7))
    // Mês já quitado: é pagamento atrasado do mês em aberto mais próximo.
    for (let k = 0; pagos.has(comp) && k < 24; k++) comp = anterior(comp)
    if (pagos.has(comp) || (banco.abertura && comp < banco.abertura)) continue
    pagos.set(comp, p)
  }

  const comExtrato = new Set(banco.movimentacoes.map((r) => r.data.slice(0, 7)))
  const hojeIso = hoje.toLocaleDateString('sv-SE')
  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1
    const comp = ym(ano, mes)
    const vence = `${mes === 12 ? ym(ano + 1, 1) : ym(ano, mes + 1)}-20`
    const manual = banco.dasPago?.[comp]
    const p = pagos.get(comp)
    if (banco.abertura && comp < banco.abertura) return { mes, estado: 'antes', vence }
    if (manual === true) return { mes, estado: 'pago', vence, manual: true }
    if (p && manual !== false) return { mes, estado: 'pago', vence, pagoEm: p.data, valor: p.valor }
    if (hojeIso <= vence) return { mes, estado: 'a-vencer', vence }
    return { mes, estado: comExtrato.has(vence.slice(0, 7)) ? 'atrasado' : 'sem-extrato', vence }
  })
}

/** Marca à mão (pago por outra conta) ou desfaz a marcação. */
export function marcarDas(banco: Banco, ano: number, mes: number, pago: boolean | null): Banco {
  const dasPago = { ...banco.dasPago }
  if (pago === null) delete dasPago[ym(ano, mes)]
  else dasPago[ym(ano, mes)] = pago
  return { ...banco, dasPago }
}

// ---------- Imposto de Renda ----------

// Percentuais de presunção do lucro usados para a parte isenta.
export const PRESUNCAO = { servicos: 0.32, comercio: 0.08 }

export interface Irpf {
  receita: number
  isenta: number // parte do lucro isenta de IR
  despesas: number
  das: number
  retiradas: number
  lucro: number // receita menos despesas
  tributavel: number // lucro que passa da parte isenta
  semSeparar: number // saídas que ainda não foram separadas
}

/** Lucro isento e tributável do ano, pelo método da Receita para o MEI.
 *
 * Parte isenta = 32% da receita de serviços + 8% da de comércio. Com as
 * despesas separadas, o lucro é a receita menos as despesas, e o que passar
 * da parte isenta é rendimento tributável na declaração de pessoa física.
 */
export function irpfDoAno(banco: Banco, ano: number): Irpf {
  const t = totaisAno(banco, ano)
  const receita = t.servicos + t.comercio
  const isenta = t.servicos * PRESUNCAO.servicos + t.comercio * PRESUNCAO.comercio
  let despesas = 0, das = 0, retiradas = 0, semSeparar = 0
  for (const r of saidasDoAno(banco, ano)) {
    const d = despesa(r)
    if (d === true) despesas += r.valor
    else if (d === false) retiradas += r.valor
    else semSeparar++
    if (ehDas(r)) das += r.valor
  }
  const lucro = Math.max(0, receita - despesas)
  return { receita, isenta, despesas, das, retiradas, lucro, tributavel: Math.max(0, lucro - isenta), semSeparar }
}
