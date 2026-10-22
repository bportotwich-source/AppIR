// Totais de faturamento e alerta de limite do MEI.

import type { Banco } from './banco'
import { MESES } from './formato'

export const LIMITE_ANUAL = 81_000
// Até 20% acima do limite o desenquadramento vale a partir do ano seguinte;
// acima disso, é retroativo a janeiro.
export const LIMITE_TOLERANCIA = LIMITE_ANUAL * 1.2

export interface Totais {
  servicos: number
  comercio: number
}

export const total = (t: Totais) => t.servicos + t.comercio

/** Totais de janeiro (índice 0) a dezembro (índice 11). */
export function totaisPorMes(banco: Banco, ano: number): Totais[] {
  const meses = Array.from({ length: 12 }, () => ({ servicos: 0, comercio: 0 }))
  for (const r of banco.movimentacoes) {
    if (r.tipo !== 'entrada' || r.faturamento !== true || !r.data.startsWith(`${ano}-`)) continue
    const m = meses[Number(r.data.slice(5, 7)) - 1]
    // Faturamento sem categoria conta como serviço até ser classificado.
    if (r.categoria === 'comercio') m.comercio += r.valor
    else m.servicos += r.valor
  }
  return meses
}

export function totaisAno(banco: Banco, ano: number): Totais {
  return totaisPorMes(banco, ano).reduce(
    (acc, m) => ({ servicos: acc.servicos + m.servicos, comercio: acc.comercio + m.comercio }),
    { servicos: 0, comercio: 0 },
  )
}

export function pendentes(banco: Banco, ano: number): number {
  return banco.movimentacoes.filter(
    (r) =>
      r.tipo === 'entrada' &&
      r.data.startsWith(`${ano}-`) &&
      (r.faturamento === null || (r.faturamento && r.categoria === null)),
  ).length
}

export type Nivel = 'ok' | 'atencao' | 'perigo' | 'estourou' | 'critico'

export const brl = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function alerta(valor: number, limite = LIMITE_ANUAL): { nivel: Nivel; mensagem: string } {
  const fracao = (valor / limite) * 100
  const pct = Math.round(fracao)
  if (valor > limite * 1.2) {
    return {
      nivel: 'critico',
      mensagem:
        `Faturamento ${pct}% do limite: passou de 20% acima de ${brl(limite)}. ` +
        'O desenquadramento é retroativo a janeiro. Procure um contador.',
    }
  }
  if (valor > limite) {
    return {
      nivel: 'estourou',
      mensagem:
        `Faturamento ${pct}% do limite. Até 20% acima, você paga DAS sobre o excesso ` +
        'e vira ME a partir do ano que vem.',
    }
  }
  if (fracao >= 90) {
    return { nivel: 'perigo', mensagem: `Atenção: ${pct}% do limite anual. Restam ${brl(limite - valor)}.` }
  }
  if (fracao >= 70) {
    return { nivel: 'atencao', mensagem: `${pct}% do limite anual usado. Restam ${brl(limite - valor)}.` }
  }
  return { nivel: 'ok', mensagem: `${pct}% do limite anual usado.` }
}

/** No ano de abertura, o limite é R$ 6.750 por mês de atividade. */
export function limiteProporcional(mesAbertura: number): number {
  return 6_750 * (13 - mesAbertura)
}

/** Limite de faturamento do ano: proporcional no ano de abertura. */
export function limiteDoAno(banco: Banco, ano: number): number {
  const a = banco.abertura
  if (!a || Number(a.slice(0, 4)) !== ano) return LIMITE_ANUAL
  return limiteProporcional(Number(a.slice(5, 7)))
}

/** Projeção do ano no ritmo atual: média de janeiro (ou do mês de abertura,
 * no ano em que o MEI abriu) até o último mês com extrato, estendida até
 * dezembro. Fora do ano de abertura é a mesma conta dos componentes
 * AccumulatedChart e LimitTrack, para os números baterem na tela.
 */
export function projecaoAno(banco: Banco, ano: number): number | null {
  const meses = banco.movimentacoes.filter((r) => r.data.startsWith(`${ano}-`)).map((r) => Number(r.data.slice(5, 7)))
  if (meses.length === 0) return null
  const a = banco.abertura
  const inicio = a && Number(a.slice(0, 4)) === ano ? Number(a.slice(5, 7)) : 1
  const ultimo = Math.max(...meses)
  if (ultimo < inicio) return null
  return (total(totaisAno(banco, ano)) / (ultimo - inicio + 1)) * (13 - inicio)
}

/** Explica o limite que vale para o ano de abertura escolhido. */
export function textoLimite(abertura: string | null | undefined, ano = new Date().getFullYear()): string {
  if (abertura === undefined) return ''
  if (!abertura || Number(abertura.slice(0, 4)) < ano) return `Limite de ${ano}: ${brl(LIMITE_ANUAL)}, o ano inteiro.`
  const mes = Number(abertura.slice(5, 7))
  const meses = 13 - mes
  return (
    `Aberto em ${MESES[mes - 1]} de ${abertura.slice(0, 4)}. Limite de ${abertura.slice(0, 4)}: ` +
    `${brl(limiteProporcional(mes))} (${meses} ${meses === 1 ? 'mês' : 'meses'} × R$ 6.750,00).`
  )
}
