// Estado do app: movimentações importadas e marcações lembradas.
//
// Tudo fica num único objeto serializável. A persistência (store.ts) grava
// esse objeto no navegador, e o backup é o mesmo objeto em JSON.

import type { Movimentacao } from './parser'
import { pagador } from './formato'

export type Categoria = 'servicos' | 'comercio'

export interface Registro extends Movimentacao {
  id: string
  faturamento: boolean | null // null = não revisado
  categoria: Categoria | null
  // Só saídas: true = despesa da empresa; false = retirada ou gasto pessoal;
  // null ou ausente = ainda não separada (ver despesa() em saidas.ts).
  despesa?: boolean | null
  arquivo: string
  importadoEm: string
}

export interface Regra {
  faturamento: boolean
  categoria: Categoria | null
}

export interface Banco {
  versao: 1
  movimentacoes: Registro[]
  regras: Record<string, Regra> // por descrição normalizada
  regrasSaida?: Record<string, boolean> // por descrição normalizada: é despesa?
  dasPago?: Record<string, boolean> // "AAAA-MM" da competência: marcado à mão
  // Mês de abertura do MEI ("AAAA-MM"). null = aberto antes do ano atual;
  // ausente = a pessoa ainda não respondeu.
  abertura?: string | null
  ultimoBackup?: string // ISO
  alteradoEm?: string // ISO; última mudança em movimentações ou marcações
}

export function bancoVazio(): Banco {
  return { versao: 1, movimentacoes: [], regras: {} }
}

// Sufixos de razão social que o banco às vezes corta ("Ltda" vira "Ltd").
const SUFIXOS = new Set(['ltda', 'ltd', 'me', 'mei', 'epp', 'eireli', 'sa', 's', 'a'])

/** Chave do pagador para lembrar marcações.
 *
 * Usa só o tipo de operação e o nome de quem pagou, sem acentos, números,
 * CPF/CNPJ e sufixos de empresa. Assim o mesmo pagador casa no PDF, no CSV
 * e no OFX, que escrevem a descrição de jeitos diferentes.
 */
export function chaveDescricao(descricao: string): string {
  const { nome, operacao } = pagador(descricao)
  const palavras = `${operacao} ${nome}`
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\d•*]+/g, ' ')
    .replace(/[^a-z ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  while (palavras.length > 1 && SUFIXOS.has(palavras[palavras.length - 1])) palavras.pop()
  return palavras.join(' ')
}

// A descrição fica de fora: PDF, CSV e OFX escrevem a mesma movimentação de
// jeitos diferentes, e importar o mesmo mês em dois formatos não pode duplicar.
function identificador(m: Movimentacao, ocorrencia: number): string {
  return `${m.data}|${m.valor.toFixed(2)}|${m.tipo}|${ocorrencia}`
}

/** Grava as movimentações, ignorando as já importadas.
 *
 * Movimentações do mesmo dia, valor e tipo são diferenciadas pela ordem em
 * que aparecem no extrato.
 */
export function importar(
  banco: Banco,
  movs: Movimentacao[],
  arquivo = '',
  agora = new Date().toISOString(),
): { banco: Banco; novas: number; repetidas: number } {
  const existentes = new Set(banco.movimentacoes.map((r) => r.id))
  const vistos = new Map<string, number>()
  const novos: Registro[] = []

  for (const m of movs) {
    const base = identificador(m, 0)
    const n = (vistos.get(base) ?? 0) + 1
    vistos.set(base, n)
    const id = identificador(m, n)
    if (existentes.has(id)) continue
    existentes.add(id)

    const chave = chaveDescricao(m.descricao)
    const regra = m.tipo === 'entrada' ? banco.regras[chave] : undefined
    novos.push({
      ...m,
      id,
      faturamento: regra ? regra.faturamento : m.tipo === 'saida' ? false : null,
      categoria: regra ? regra.categoria : null,
      ...(m.tipo === 'saida' && { despesa: banco.regrasSaida?.[chave] ?? null }),
      arquivo,
      importadoEm: agora,
    })
  }

  return {
    banco: { ...banco, movimentacoes: [...banco.movimentacoes, ...novos] },
    novas: novos.length,
    repetidas: movs.length - novos.length,
  }
}

export function marcar(
  banco: Banco,
  id: string,
  faturamento: boolean,
  categoria: Categoria | null,
  lembrar = true,
): Banco {
  const cat = faturamento ? categoria : null
  let descricao: string | null = null
  const movimentacoes = banco.movimentacoes.map((r) => {
    if (r.id !== id) return r
    descricao = r.descricao
    return { ...r, faturamento, categoria: cat }
  })
  const regras =
    lembrar && descricao !== null
      ? { ...banco.regras, [chaveDescricao(descricao)]: { faturamento, categoria: cat } }
      : banco.regras
  return { ...banco, movimentacoes, regras }
}

export function entradas(banco: Banco, ano: number, mes?: number): Registro[] {
  const prefixo = mes ? `${ano}-${String(mes).padStart(2, '0')}-` : `${ano}-`
  return banco.movimentacoes
    .filter((r) => r.tipo === 'entrada' && r.data.startsWith(prefixo))
    .sort((a, b) => a.data.localeCompare(b.data))
}

export function anosDisponiveis(banco: Banco): number[] {
  const anos = new Set(banco.movimentacoes.map((r) => Number(r.data.slice(0, 4))))
  return [...anos].sort((a, b) => b - a)
}
