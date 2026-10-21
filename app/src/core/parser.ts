// Leitura do extrato PDF do Nubank PJ.
//
// O layout real ainda não foi validado: este parser é heurístico e será
// ajustado quando chegar um PDF de exemplo. A extração de texto (pdf.js)
// fica separada da interpretação das linhas (parseLinhas), para dar pra
// testar sem PDF.

export type Tipo = 'entrada' | 'saida'

export interface Movimentacao {
  data: string // AAAA-MM-DD
  descricao: string
  valor: number // sempre positivo
  tipo: Tipo
}

const MESES: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
}

const RE_DATA = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})\b\s*(.*)$/i
const RE_VALOR_FINAL = /^(.*?)\s*([+-])?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})$/
const RE_TOTAL_ENTRADAS = /total de entradas/i
const RE_TOTAL_SAIDAS = /total de sa[ií]das/i
// Cabeçalho/rodapé que não é movimentação.
const RE_IGNORAR = new RegExp(
  'saldo (inicial|final|do dia|anterior)|rendimento l[ií]quido|movimenta[çc][õo]es|' +
    'extrato gerado|ouvidoria|p[áa]gina \\d+|cnpj|ag[êe]ncia|conta\\b|valores em r\\$',
  'i',
)
const PALAVRAS_ENTRADA = /recebid|dep[óo]sito|estorno|reembolso/i

export function valorBr(texto: string): number {
  return Number(texto.replace(/\./g, '').replace(',', '.'))
}

export function parseLinhas(linhas: string[]): Movimentacao[] {
  const movs: Movimentacao[] = []
  let dataAtual: string | null = null
  let secao: Tipo | null = null // definida pelos "Total de entradas/saídas"
  let pendente: string[] = [] // texto que veio antes do valor

  for (const bruta of linhas) {
    let linha = bruta.split(/\s+/).filter(Boolean).join(' ')
    if (!linha) continue

    const m = RE_DATA.exec(linha)
    if (m) {
      const [, dia, mes, ano, resto] = m
      dataAtual = `${ano}-${String(MESES[mes.toUpperCase()]).padStart(2, '0')}-${dia}`
      secao = null
      pendente = []
      linha = resto.trim()
      if (!linha) continue
    }

    if (RE_TOTAL_ENTRADAS.test(linha)) {
      secao = 'entrada'
      pendente = []
      continue
    }
    if (RE_TOTAL_SAIDAS.test(linha)) {
      secao = 'saida'
      pendente = []
      continue
    }
    if (dataAtual === null || RE_IGNORAR.test(linha)) continue

    const mv = RE_VALOR_FINAL.exec(linha)
    if (!mv) {
      pendente.push(linha)
      continue
    }

    const [, descFinal, sinal, valor] = mv
    const descricao = [...pendente, descFinal].join(' ').trim()
    pendente = []
    if (!descricao) continue

    let tipo: Tipo
    if (sinal === '+') tipo = 'entrada'
    else if (sinal === '-') tipo = 'saida'
    else if (secao) tipo = secao
    else if (PALAVRAS_ENTRADA.test(descricao)) tipo = 'entrada'
    else tipo = 'saida' // na dúvida, não conta como faturamento

    movs.push({ data: dataAtual, descricao, valor: valorBr(valor), tipo })
  }

  return movs
}

export async function extrairTexto(arquivo: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const pdf = await pdfjs.getDocument({ data: arquivo }).promise
  const linhas: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const conteudo = await (await pdf.getPage(p)).getTextContent()
    // Junta os pedaços de texto por linha visual (mesma altura na página).
    let atual = ''
    for (const item of conteudo.items) {
      if (!('str' in item)) continue
      atual += item.str
      if (item.hasEOL) {
        linhas.push(atual)
        atual = ''
      } else {
        atual += ' '
      }
    }
    if (atual.trim()) linhas.push(atual)
  }
  return linhas
}

export async function lerExtrato(arquivo: ArrayBuffer): Promise<Movimentacao[]> {
  return parseLinhas(await extrairTexto(arquivo))
}
