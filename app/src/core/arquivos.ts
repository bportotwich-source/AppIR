// Leitura dos formatos que o Nubank PJ exporta: OFX, CSV e PDF.
// OFX e CSV são estruturados e não dependem de layout; o PDF é a reserva.

import { lerExtrato, type Movimentacao } from './parser'

const mov = (data: string, valor: number, descricao: string): Movimentacao => ({
  data,
  descricao: descricao.trim(),
  valor: Math.abs(valor),
  tipo: valor >= 0 ? 'entrada' : 'saida',
})

/** OFX 1.x (SGML) ou 2.x (XML): uma movimentação por <STMTTRN>. */
export function parseOfx(texto: string): Movimentacao[] {
  const campo = (bloco: string, nome: string) =>
    new RegExp(`<${nome}>([^<\\r\\n]*)`, 'i').exec(bloco)?.[1].trim() ?? ''
  const movs: Movimentacao[] = []
  for (const [, bloco] of texto.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)) {
    const d = campo(bloco, 'DTPOSTED')
    const valor = Number(campo(bloco, 'TRNAMT').replace(',', '.'))
    if (!/^\d{8}/.test(d) || Number.isNaN(valor) || valor === 0) continue
    movs.push(mov(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, valor, campo(bloco, 'MEMO') || campo(bloco, 'NAME')))
  }
  return movs
}

function separarCsv(linha: string, sep: string): string[] {
  const campos: string[] = []
  let atual = ''
  let aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else aspas = !aspas
    } else if (c === sep && !aspas) {
      campos.push(atual)
      atual = ''
    } else atual += c
  }
  campos.push(atual)
  return campos.map((c) => c.trim())
}

function dataCsv(texto: string): string | null {
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function valorCsv(texto: string): number {
  const t = texto.replace(/R\$\s*/, '').replace(/\s/g, '')
  // "1.234,56" (vírgula decimal) ou "1234.56" (ponto decimal)
  return Number(/,\d{1,2}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, ''))
}

/** CSV com colunas Data, Valor e Descrição (o Nubank usa "Data,Valor,Identificador,Descrição"). */
export function parseCsv(texto: string): Movimentacao[] {
  const linhas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (linhas.length < 2) return []
  const sep = (linhas[0].match(/;/g)?.length ?? 0) > (linhas[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const cab = separarCsv(linhas[0], sep).map((c) => c.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase())
  const iData = cab.findIndex((c) => c.startsWith('data'))
  const iValor = cab.findIndex((c) => c.startsWith('valor'))
  const iDesc = cab.findIndex((c) => c.startsWith('descri') || c.startsWith('historico'))
  if (iData < 0 || iValor < 0) throw new Error('O CSV precisa ter as colunas Data e Valor.')

  const movs: Movimentacao[] = []
  for (const linha of linhas.slice(1)) {
    const c = separarCsv(linha, sep)
    const data = dataCsv(c[iData] ?? '')
    const valor = valorCsv(c[iValor] ?? '')
    if (!data || Number.isNaN(valor) || valor === 0) continue
    movs.push(mov(data, valor, iDesc >= 0 ? c[iDesc] : ''))
  }
  return movs
}

export async function lerArquivo(arquivo: File): Promise<Movimentacao[]> {
  const nome = arquivo.name.toLowerCase()
  if (nome.endsWith('.ofx')) {
    // OFX 1.x pode vir em Windows-1252; o cabeçalho diz qual.
    const bytes = await arquivo.arrayBuffer()
    const cabecalho = new TextDecoder('latin1').decode(bytes.slice(0, 400))
    const charset = /CHARSET:\s*1252|ENCODING="?windows-1252/i.test(cabecalho) ? 'windows-1252' : 'utf-8'
    return parseOfx(new TextDecoder(charset).decode(bytes))
  }
  if (nome.endsWith('.csv')) return parseCsv(await arquivo.text())
  return lerExtrato(await arquivo.arrayBuffer())
}
