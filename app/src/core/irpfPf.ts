// Imposto de Renda da pessoa física: o lucro da empresa (saidas.ts) e as
// despesas que abatem, comprovadas por recibo.
//
// Saúde não tem limite; educação tem limite por pessoa. Remédio de farmácia
// não abate (só quando vem na conta do hospital), então fica de fora.

import type { Banco } from './banco'
import { comprovantes, type Comprovante } from './comprovantes'
import { carteiraPf } from './pf'
import { irpfDoAno, type Irpf } from './saidas'

// Limites por ano-calendário. Ao mudar a lei, acrescente o ano novo aqui.
export const LIMITE_EDUCACAO: Record<number, number> = { 2024: 3561.5, 2025: 3561.5, 2026: 3561.5 }
export const limiteEducacao = (ano: number) => LIMITE_EDUCACAO[ano] ?? LIMITE_EDUCACAO[Math.max(...Object.keys(LIMITE_EDUCACAO).map(Number))]

export const ehEducacao = (c: Comprovante) => c.saude?.tipo === 'Escola ou faculdade'

/** O recibo tem o que a Receita pede: quem atendeu, CPF ou CNPJ válido no tamanho, paciente e valor. */
export function reciboCompleto(c: Comprovante): boolean {
  const d = c.saude?.doc.replace(/\D/g, '') ?? ''
  return !!c.saude?.prestador.trim() && (d.length === 11 || d.length === 14) && !!c.saude.paciente.trim() && c.valor > 0
}

export interface IrpfPf {
  empresa: Irpf
  saude: Comprovante[]
  educacao: Comprovante[]
  totalSaude: number // só recibos completos
  totalEducacao: number // já com o limite por pessoa
  educacaoBruta: number
  limiteEducacao: number
  pendentes: Comprovante[] // recibos sem algum dado obrigatório
  farmacia: number // gasto com farmácia no ano, que não abate
}

export function irpfPfDoAno(banco: Banco, ano: number): IrpfPf {
  const recibos = comprovantes(banco).filter((c) => c.tipo === 'saude' && c.data.startsWith(`${ano}-`)).sort((a, b) => a.data.localeCompare(b.data))
  const saude = recibos.filter((c) => !ehEducacao(c))
  const educacao = recibos.filter(ehEducacao)
  const limite = limiteEducacao(ano)
  const porPessoa = new Map<string, number>()
  for (const c of educacao.filter(reciboCompleto)) {
    const p = c.saude!.paciente.trim().toLowerCase()
    porPessoa.set(p, (porPessoa.get(p) ?? 0) + c.valor)
  }
  const farmacia = carteiraPf(banco).movimentacoes
    .filter((r) => r.tipo === 'saida' && r.categoria === 'farmacia' && r.data.startsWith(`${ano}-`))
    .reduce((s, r) => s + r.valor, 0)
  return {
    empresa: irpfDoAno(banco, ano),
    saude,
    educacao,
    totalSaude: saude.filter(reciboCompleto).reduce((s, c) => s + c.valor, 0),
    totalEducacao: [...porPessoa.values()].reduce((s, v) => s + Math.min(v, limite), 0),
    educacaoBruta: [...porPessoa.values()].reduce((s, v) => s + v, 0),
    limiteEducacao: limite,
    pendentes: recibos.filter((c) => !reciboCompleto(c)),
    farmacia,
  }
}
