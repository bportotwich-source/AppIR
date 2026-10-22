// Leitura do PDF "Extrato Consolidado Inteligente" da conta corrente do Santander.
//
// No texto do pdf.js cada lançamento vem em várias linhas: a descrição (com a
// data do dia na primeira), às vezes um detalhe (quem recebeu o Pix, a loja do
// cartão de débito) e por fim "documento  valor[-]  [saldo]". O "-" no fim do
// valor é débito.

import { MESES } from './formato'
import { valorBr, type Movimentacao } from './parser'

export const ehExtratoSantander = (linhas: string[]) =>
  linhas.some((l) => /extrato consolidado inteligente/i.test(l)) && linhas.some((l) => /santander/i.test(l))

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const NOMES_MES = MESES.map(semAcento)
const RE_MES = new RegExp(`^(${NOMES_MES.join('|')})/(\\d{4})$`)
// "[dd/mm   ][descrição   ]documento   valor[-][   saldo]"; documento é "-" ou número.
const RE_VALOR = /^(?:(\d{2})\/(\d{2})\s{2,})?(?:(.*?)\s+)?(-|\d{3,})\s+(\d{1,3}(?:\.\d{3})*,\d{2})(-?)(?:\s+\d{1,3}(?:\.\d{3})*,\d{2}-?)?$/
const RE_DIA = /^(\d{2})\/(\d{2})\s{2,}(.*)$/ // data do lançamento: seguida de vários espaços
const RE_DETALHE_DATA = /^\d{2}\/\d{2}\s(?=\S)/ // "12/01 LOJA": dia da compra no débito
const RE_FIM = /^(saldos por per[íi]odo|compras com cart[ãa]o de d[ée]bito)/i
const RE_PULAR = /^(data\s+descri|extrato consolidado|extrato_pf|balp_|pagina:|(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\/\d{4}$)/i
const RE_SEM_VALOR_NA_DESCRICAO = /^(periodo:|[a-z]{2,4}\d{6,}$)/i // período dos juros, código do título

function descricao(partes: string[]): string {
  const [principal = '', ...resto] = partes.filter((p) => !RE_SEM_VALOR_NA_DESCRICAO.test(p))
  const detalhe = resto.join(' ').replace(RE_DETALHE_DATA, '').trim()
  // Mesmo texto do Nubank, para o nome e a categoria saírem do mesmo jeito.
  if (/^debito visa electron/i.test(principal) && detalhe) return `Compra no débito ${detalhe}`
  return [principal, detalhe].filter(Boolean).join(' ')
}

export function parseSantander(linhas: string[]): Movimentacao[] {
  let ano = new Date().getFullYear()
  let mesExtrato = 12
  for (const l of linhas) {
    const m = RE_MES.exec(semAcento(l.trim()))
    if (m) {
      ano = Number(m[2])
      mesExtrato = NOMES_MES.indexOf(m[1]) + 1
      break
    }
  }
  const dataDe = (dia: string, mes: string) => `${Number(mes) > mesExtrato ? ano - 1 : ano}-${mes}-${dia}`

  const movs: Movimentacao[] = []
  let dentro = false
  let data: string | null = null
  let partes: string[] = []
  for (const bruta of linhas) {
    const linha = bruta.trim()
    if (!linha) continue
    if (!dentro) {
      dentro = /^movimenta[çc][ãa]o$/i.test(linha)
      continue
    }
    if (RE_FIM.test(linha)) break
    if (RE_PULAR.test(linha)) continue
    if (/^saldo em \d{2}\/\d{2}/i.test(linha)) {
      partes = []
      continue
    }
    const v = RE_VALOR.exec(linha)
    if (v) {
      const [, dia, mes, texto, , valor, menos] = v
      if (dia) data = dataDe(dia, mes)
      if (texto) partes.push(texto.trim())
      if (data && partes.length) movs.push({ data, descricao: descricao(partes), valor: valorBr(valor), tipo: menos ? 'saida' : 'entrada' })
      partes = []
      continue
    }
    const d = RE_DIA.exec(linha)
    if (d) {
      data = dataDe(d[1], d[2])
      partes = [d[3].trim()]
      continue
    }
    partes.push(linha)
  }
  return movs
}
