// Perfil Bruno PF: conta e cartão pessoais, ao lado do perfil da empresa.
//
// As movimentações da PF ficam separadas das da PJ (banco.pf), então nada do
// faturamento, do DAS ou da DASN muda quando a PF é usada. O Pix que sai da PJ
// para o titular (saída marcada como retirada) entra na PF sozinho; se o
// extrato da PF também trouxer esse Pix, os dois viram um par e contam uma vez.

import type { Movimentacao } from './parser'
import { chaveDescricao, type Banco, type Registro } from './banco'
import { despesa, ehDas } from './saidas'
import { pagador } from './formato'

export type Perfil = 'pj' | 'pf'
export type ContaPf = 'conta' | 'cartao'

export const CATEGORIAS_PF = [
  { id: 'mercado', nome: 'Mercado', cor: '#0f766e' },
  { id: 'casa', nome: 'Casa', cor: '#6366f1' },
  { id: 'transporte', nome: 'Transporte', cor: '#d97706' },
  { id: 'saude', nome: 'Saúde', cor: '#db2777' },
  { id: 'farmacia', nome: 'Farmácia', cor: '#be185d' },
  { id: 'educacao', nome: 'Educação', cor: '#7c3aed' },
  { id: 'lazer', nome: 'Lazer', cor: '#0891b2' },
  { id: 'compras', nome: 'Compras online', cor: '#0369a1' },
  { id: 'assinaturas', nome: 'Assinaturas', cor: '#65a30d' },
  { id: 'outros', nome: 'Outros', cor: '#94a3b8' },
] as const
export type CategoriaPf = (typeof CATEGORIAS_PF)[number]['id']

export const nomeCategoria = (id: string | null | undefined) => CATEGORIAS_PF.find((c) => c.id === id)?.nome ?? 'Sem categoria'

export interface RegistroPf extends Movimentacao {
  id: string
  conta: ContaPf
  categoria: CategoriaPf | null // só saídas; null = ainda não separada
  arquivo: string
  importadoEm: string
}

export interface CarteiraPf {
  movimentacoes: RegistroPf[]
  regras: Record<string, CategoriaPf> // por descrição normalizada
}

export const carteiraPf = (banco: Banco): CarteiraPf => banco.pf ?? { movimentacoes: [], regras: {} }

// Palavras que já dizem a categoria, para a primeira importação não vir toda vazia.
const SUGESTOES: [RegExp, CategoriaPf][] = [
  [/drogaria|farmacia|drogasil|droga raia|raia|pague menos|panvel|pacheco/i, 'farmacia'],
  [/supermerc|mercado|atacad|assai|carrefour|hortifruti|padaria|acougue|sacolao|zaffari|pao de acucar/i, 'mercado'],
  [/uber|99app|\b99\b|posto|combust|ipiranga|shell|petrobras|estaciona|metro|onibus|bilhete/i, 'transporte'],
  [/amazon|mercadolivre|mercado livre|mercadopago|magalu|magazine|shopee|aliexpress|americanas|shein/i, 'compras'],
  [/netflix|spotify|disney|hbo|max\b|prime video|youtube|apple\.com|google one|icloud/i, 'assinaturas'],
  [/clinica|hospital|laborat|odonto|medic|dr\.? |dra\.? |psicolog|fisioter|unimed|amil|hapvida|bradesco saude|sulamerica/i, 'saude'],
  [/escola|colegio|faculdade|universidade|curso|mensalidade/i, 'educacao'],
  [/energia|enel|cemig|copel|light|sabesp|agua|aluguel|condominio|internet|vivo|claro|tim\b|oi\b|gas\b/i, 'casa'],
  [/ifood|restaurante|bar\b|lanchonete|cinema|ingresso|rappi/i, 'lazer'],
]

const semAcento = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '')

export function sugerirCategoria(descricao: string): CategoriaPf | null {
  const d = semAcento(descricao)
  return SUGESTOES.find(([re]) => re.test(d))?.[1] ?? null
}

/** Grava o extrato da conta ou a fatura do cartão da PF, ignorando o que já foi importado. */
export function importarPf(
  banco: Banco,
  movs: Movimentacao[],
  conta: ContaPf,
  arquivo = '',
  agora = new Date().toISOString(),
): { banco: Banco; novas: number; repetidas: number; semCategoria: number } {
  const pf = carteiraPf(banco)
  const existentes = new Set(pf.movimentacoes.map((r) => r.id))
  const vistos = new Map<string, number>()
  const novos: RegistroPf[] = []
  for (const m of movs) {
    const base = `pf|${conta}|${m.data}|${m.valor.toFixed(2)}|${m.tipo}`
    const n = (vistos.get(base) ?? 0) + 1
    vistos.set(base, n)
    const id = `${base}|${n}`
    if (existentes.has(id)) continue
    existentes.add(id)
    const categoria = m.tipo === 'saida' ? pf.regras[chaveDescricao(m.descricao)] ?? sugerirCategoria(m.descricao) : null
    novos.push({ ...m, id, conta, categoria, arquivo, importadoEm: agora })
  }
  return {
    banco: { ...banco, pf: { ...pf, movimentacoes: [...pf.movimentacoes, ...novos] } },
    novas: novos.length,
    repetidas: movs.length - novos.length,
    semCategoria: novos.filter((r) => r.tipo === 'saida' && r.categoria === null).length,
  }
}

/** Separa todas as saídas do mesmo destino na categoria e lembra para as próximas. */
export function categorizarPf(banco: Banco, chave: string, categoria: CategoriaPf): Banco {
  const pf = carteiraPf(banco)
  return {
    ...banco,
    pf: {
      movimentacoes: pf.movimentacoes.map((r) => (r.tipo === 'saida' && chaveDescricao(r.descricao) === chave ? { ...r, categoria } : r)),
      regras: { ...pf.regras, [chave]: categoria },
    },
  }
}

const doPeriodo = (data: string, ano: number, mes?: number) =>
  data.startsWith(mes ? `${ano}-${String(mes).padStart(2, '0')}-` : `${ano}-`)

/** O nome do titular aparece na descrição? Compara palavras, sem acento e sem caixa. */
export function ehDoTitular(descricao: string, titular: string | undefined): boolean {
  if (!titular?.trim()) return false
  const nome = semAcento(pagador(descricao).nome).toLowerCase()
  const partes = semAcento(titular).toLowerCase().split(/\s+/).filter((p) => p.length > 2)
  return partes.length >= 2 && partes.every((p) => nome.includes(p))
}

/** Saídas da PJ que foram para o titular: entram na PF. */
export function retiradasPj(banco: Banco, ano: number, mes?: number): Registro[] {
  return banco.movimentacoes.filter((r) => r.tipo === 'saida' && !ehDas(r) && despesa(r) === false && doPeriodo(r.data, ano, mes))
}

const DIA_MS = 86_400_000
const dias = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / DIA_MS

/** Entradas da conta PF que são o mesmo Pix de uma retirada da PJ (mesmo valor, até 2 dias de diferença).
 * Devolve id da entrada PF → id da retirada PJ. */
export function paresPjPf(banco: Banco): Map<string, string> {
  const pares = new Map<string, string>()
  const usadas = new Set<string>()
  const retiradas = banco.movimentacoes.filter((r) => r.tipo === 'saida' && !ehDas(r) && despesa(r) === false)
  for (const e of carteiraPf(banco).movimentacoes) {
    if (e.tipo !== 'entrada' || e.conta !== 'conta') continue
    const par = retiradas.find((r) => !usadas.has(r.id) && Math.abs(r.valor - e.valor) < 0.005 && dias(r.data, e.data) <= 2)
    if (par) {
      pares.set(e.id, par.id)
      usadas.add(par.id)
    }
  }
  return pares
}

export interface ResumoPf {
  retiradas: number // da PJ para o titular
  outrasEntradas: number
  entradas: number
  gastos: number
  sobra: number
  porCategoria: { id: CategoriaPf | 'sem'; nome: string; cor: string; valor: number }[]
  semCategoria: { quantas: number; valor: number }
}

/** Entradas e gastos da PF no mês (ou no ano, sem `mes`). O pagamento da fatura
 * na conta não é gasto: o gasto são as compras do cartão. */
export function resumoPf(banco: Banco, ano: number, mes?: number): ResumoPf {
  const pares = paresPjPf(banco)
  const movs = carteiraPf(banco).movimentacoes.filter((r) => doPeriodo(r.data, ano, mes))
  const retiradas = retiradasPj(banco, ano, mes).reduce((s, r) => s + r.valor, 0)
  const outrasEntradas = movs.filter((r) => r.tipo === 'entrada' && r.conta === 'conta' && !pares.has(r.id)).reduce((s, r) => s + r.valor, 0)
  const gastosMovs = movs.filter((r) => r.tipo === 'saida' && !ehPagamentoFatura(r))
  const soma = new Map<string, number>()
  for (const r of gastosMovs) soma.set(r.categoria ?? 'sem', (soma.get(r.categoria ?? 'sem') ?? 0) + r.valor)
  const porCategoria = [
    ...CATEGORIAS_PF.filter((c) => soma.has(c.id)).map((c) => ({ id: c.id, nome: c.nome, cor: c.cor, valor: soma.get(c.id)! })),
    ...(soma.has('sem') ? [{ id: 'sem' as const, nome: 'Sem categoria', cor: '#cbd5d1', valor: soma.get('sem')! }] : []),
  ].sort((a, b) => b.valor - a.valor)
  const sem = gastosMovs.filter((r) => r.categoria === null)
  const gastos = gastosMovs.reduce((s, r) => s + r.valor, 0)
  const entradas = retiradas + outrasEntradas
  return {
    retiradas, outrasEntradas, entradas, gastos, sobra: entradas - gastos, porCategoria,
    semCategoria: { quantas: sem.length, valor: sem.reduce((s, r) => s + r.valor, 0) },
  }
}

/** Pagar a fatura na conta só move dinheiro para o cartão; o gasto já está nas compras. */
export const ehPagamentoFatura = (r: RegistroPf) =>
  r.conta === 'conta' && r.tipo === 'saida' && /pagamento de fatura|fatura (do )?cart[aã]o|nu pagamentos/i.test(r.descricao)

export interface GrupoPf {
  chave: string
  nome: string
  operacao: string
  quantas: number
  valor: number
  sugestao: CategoriaPf | null
}

/** Gastos sem categoria agrupados por destino, maiores primeiro. */
export function gruposSemCategoria(banco: Banco, ano: number): GrupoPf[] {
  const grupos = new Map<string, GrupoPf>()
  for (const r of carteiraPf(banco).movimentacoes) {
    if (r.tipo !== 'saida' || r.categoria !== null || ehPagamentoFatura(r) || !r.data.startsWith(`${ano}-`)) continue
    const chave = chaveDescricao(r.descricao)
    const g = grupos.get(chave)
    if (g) {
      g.quantas++
      g.valor += r.valor
    } else {
      const { nome, operacao } = pagador(r.descricao)
      grupos.set(chave, { chave, nome, operacao, quantas: 1, valor: r.valor, sugestao: sugerirCategoria(r.descricao) })
    }
  }
  return [...grupos.values()].sort((a, b) => b.valor - a.valor)
}

/** Nome do titular: o informado em Ajustes ou, sem ele, o nome da empresa
 * (o MEI costuma ser "12.345.678 NOME DO TITULAR"). */
export const titularDo = (banco: Banco) =>
  banco.titular?.trim() || banco.empresa?.nome?.replace(/[\d./-]+/g, ' ').replace(/\s+/g, ' ').trim() || undefined

/** Marca como retirada as saídas da PJ para o titular que ainda não foram separadas. */
export function separarRetiradasDoTitular(banco: Banco): Banco {
  const titular = titularDo(banco)
  if (!titular) return banco
  let mudou = false
  const movimentacoes = banco.movimentacoes.map((r) => {
    if (r.tipo !== 'saida' || ehDas(r) || (r.despesa ?? null) !== null || !ehDoTitular(r.descricao, titular)) return r
    mudou = true
    return { ...r, despesa: false }
  })
  return mudou ? { ...banco, movimentacoes } : banco
}

/** Primeiro nome do titular, para os perfis se chamarem "Bruno PJ" e "Bruno PF". */
export function primeiroNome(titular: string | undefined): string {
  const n = titular?.trim().split(/\s+/)[0] ?? ''
  return n ? n[0].toUpperCase() + n.slice(1).toLowerCase() : ''
}

export function nomesPerfis(titular: string | undefined) {
  const n = primeiroNome(titular)
  return { pj: n ? `${n} PJ` : 'Empresa', pf: n ? `${n} PF` : 'Pessoal' }
}
