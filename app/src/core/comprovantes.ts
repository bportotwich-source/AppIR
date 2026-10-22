// Comprovantes de compra: cupom NFC-e (QR code), nota de loja online (PDF),
// foto de cupom ou recibo, e recibo de saúde para o Imposto de Renda.
//
// Tudo é lido no celular. Do QR code sai a chave de acesso de 44 dígitos, que
// já diz a loja (CNPJ), o estado e o mês; a lista de itens só existe na página
// da SEFAZ, que o navegador não deixa ler (fica para o app instalado).

import type { Banco } from './banco'
import { carteiraPf, ehPagamentoFatura, type CategoriaPf } from './pf'
import type { Perfil } from './pf'
import { lerValor } from './formato'

export type TipoComprovante = 'nfce' | 'pdf' | 'foto' | 'saude'

export const TIPOS_SAUDE = ['Consulta médica', 'Dentista', 'Psicólogo', 'Fisioterapia', 'Fonoaudiólogo', 'Terapia ocupacional', 'Exames', 'Hospital', 'Plano de saúde', 'Aparelho ou prótese', 'Escola ou faculdade'] as const

export interface ItemNota {
  nome: string
  total: number
}

export interface Comprovante {
  id: string
  tipo: TipoComprovante
  perfil: Perfil
  loja: string
  cnpj?: string
  data: string // AAAA-MM-DD; '' quando só se sabe o mês
  mes?: string // AAAA-MM, da chave de acesso
  valor: number
  chave?: string
  url?: string // consulta na SEFAZ
  itens?: ItemNota[]
  categoria?: CategoriaPf | string
  movId?: string // compra do extrato ligada
  imagem?: string // data URL comprimida
  saude?: { tipo: string; prestador: string; doc: string; paciente: string }
  criadoEm: string
}

export const comprovantes = (banco: Banco) => banco.comprovantes ?? []

const UFS: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN',
  '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC',
  '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
}

export interface Chave {
  chave: string
  uf: string
  mes: string // AAAA-MM
  cnpj: string
  modelo: string // 65 = NFC-e, 55 = NF-e
  numero: number
}

/** Confere o dígito verificador (módulo 11) e separa as partes da chave de 44 dígitos. */
export function lerChave(texto: string): Chave | null {
  const chave = texto.replace(/\D/g, '')
  if (chave.length !== 44) return null
  let soma = 0
  let peso = 2
  for (let i = 42; i >= 0; i--) {
    soma += Number(chave[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  const dv = resto < 2 ? 0 : 11 - resto
  if (dv !== Number(chave[43])) return null
  return {
    chave,
    uf: UFS[chave.slice(0, 2)] ?? chave.slice(0, 2),
    mes: `20${chave.slice(2, 4)}-${chave.slice(4, 6)}`,
    cnpj: chave.slice(6, 20),
    modelo: chave.slice(20, 22),
    numero: Number(chave.slice(25, 34)),
  }
}

export interface QrNfce extends Chave {
  url: string
  valor?: number // só no QR de emissão offline
  dia?: string // AAAA-MM-DD, só offline
}

/** Lê o texto do QR code do cupom. Online: `p=chave|2|amb|idCSC|hash`.
 * Offline: `p=chave|2|amb|dia|valor|digVal|idCSC|hash`. */
export function lerQrNfce(texto: string): QrNfce | null {
  const t = texto.trim()
  let p = ''
  try {
    p = new URL(t).searchParams.get('p') ?? ''
  } catch {
    p = /[?&]p=([^&\s]+)/.exec(t)?.[1] ?? t
  }
  const partes = decodeURIComponent(p).split('|')
  const chave = lerChave(partes[0] ?? '')
  if (!chave) return null
  const qr: QrNfce = { ...chave, url: t.startsWith('http') ? t : '' }
  if (partes.length >= 8) {
    const dia = partes[3]
    if (/^\d{2}$/.test(dia)) qr.dia = `${chave.mes}-${dia}`
    const v = Number(partes[4])
    if (v > 0) qr.valor = v
  }
  return qr
}

export const formatarCnpj = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
export const formatarChave = (c: string) => c.replace(/(\d{4})(?=\d)/g, '$1 ')

/** Esconde o começo do CPF ou CNPJ, deixando o fim para conferir. */
export function mascararDoc(doc: string): string {
  const d = doc.replace(/\D/g, '')
  if (d.length === 14) return `••.•••.•••/${d.slice(8, 12)}-${d.slice(12)}`
  if (d.length === 11) return `•••.•••.${d.slice(6, 9)}-${d.slice(9)}`
  return doc ? '••••' : ''
}

export interface Danfe {
  chave?: Chave
  loja?: string
  cnpj?: string
  data?: string
  valor?: number
  itens: ItemNota[]
}

/** Lê o texto do PDF de uma nota (DANFE de NF-e ou NFC-e), como o pdf.js extrai.
 * Heurístico: o que não achar fica em branco para a pessoa completar. */
export function lerDanfe(linhas: string[]): Danfe {
  const texto = linhas.join('\n')
  const chave = lerChave(/(\d{4}\s?){10}\d{4}/.exec(texto)?.[0] ?? '') ?? undefined
  const cnpj = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.exec(texto)?.[0]?.replace(/\D/g, '') ?? chave?.cnpj
  const total = /valor total (da nota|a pagar|r\$)[^\d]*([\d.]+,\d{2})/i.exec(texto) ?? /total\s*r\$\s*([\d.]+,\d{2})/i.exec(texto)
  const valor = total ? lerValor(total[total.length - 1]) : undefined
  const d = /(\d{2})\/(\d{2})\/(\d{4})/.exec(/emiss[aã]o[^\n]*\n?[^\n]*/i.exec(texto)?.[0] ?? texto)
  const data = d ? `${d[3]}-${d[2]}-${d[1]}` : undefined
  // A razão social costuma ser a primeira linha em maiúsculas com LTDA, S.A., ME ou EIRELI.
  const loja = linhas.map((l) => l.trim()).find((l) => /\b(ltda|s\.?a\.?|eireli|me|comercio|com[eé]rcio)\b/i.test(l) && l.length < 80 && !/cnpj|cpf/i.test(l))
  const itens: ItemNota[] = []
  for (const l of linhas) {
    // "ARROZ TIPO 1 5KG   1 UN   27,90   27,90": nome, quantidade, unitário e total.
    const m = /^\s*(?:\d{1,4}\s+)?([A-Za-zÀ-ú][^\d]{2,60}?)\s+[\d.,]+\s*(?:un|kg|g|l|ml|cx|pc|pct)?\b.*?\s([\d.]+,\d{2})\s*$/i.exec(l)
    if (m && !/total|desconto|troco|pagamento|tribut|cnpj|valor/i.test(m[1])) itens.push({ nome: m[1].trim(), total: lerValor(m[2]) })
  }
  return { chave, loja, cnpj, data, valor, itens }
}

const DIA_MS = 86_400_000
const dias = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / DIA_MS

export interface CompraCandidata {
  id: string
  perfil: 'pj' | 'pf'
  data: string
  valor: number
  descricao: string
}

/** Compras (saídas) dos dois perfis que podem ser deste comprovante: mesmo valor,
 * até 3 dias de diferença (ou no mesmo mês, quando o dia não é conhecido). */
export function comprasPossiveis(banco: Banco, c: Pick<Comprovante, 'valor' | 'data' | 'mes' | 'perfil'>): CompraCandidata[] {
  const ligadas = new Set(comprovantes(banco).map((x) => x.movId).filter(Boolean))
  const todas: CompraCandidata[] = [
    ...carteiraPf(banco).movimentacoes.filter((r) => r.tipo === 'saida' && !ehPagamentoFatura(r)).map((r) => ({ id: r.id, perfil: 'pf' as const, data: r.data, valor: r.valor, descricao: r.descricao })),
    ...banco.movimentacoes.filter((r) => r.tipo === 'saida').map((r) => ({ id: r.id, perfil: 'pj' as const, data: r.data, valor: r.valor, descricao: r.descricao })),
  ]
  return todas
    .filter((m) => !ligadas.has(m.id) && Math.abs(m.valor - c.valor) < 0.005)
    .filter((m) => (c.data ? dias(m.data, c.data) <= 3 : c.mes ? m.data.startsWith(c.mes) : false))
    .sort((a, b) => Number(b.perfil === c.perfil) - Number(a.perfil === c.perfil) || (c.data ? dias(a.data, c.data) - dias(b.data, c.data) : 0))
}

/** Guarda o comprovante e, se houver uma compra só que combine, já liga as duas. */
export function guardarComprovante(banco: Banco, c: Comprovante): Banco {
  let novo = c
  if (!novo.movId) {
    const possiveis = comprasPossiveis(banco, novo)
    if (possiveis.length === 1 || (possiveis.length > 1 && possiveis[0].perfil === novo.perfil && possiveis[1].perfil !== novo.perfil)) {
      novo = { ...novo, movId: possiveis[0].id, data: novo.data || possiveis[0].data }
    }
  }
  const lista = comprovantes(banco).filter((x) => x.id !== novo.id)
  return { ...banco, comprovantes: [...lista, novo] }
}

export const apagarComprovante = (banco: Banco, id: string): Banco => ({ ...banco, comprovantes: comprovantes(banco).filter((x) => x.id !== id) })

/** Já existe comprovante com essa chave de acesso? (ler o mesmo cupom duas vezes) */
export const comprovanteDaChave = (banco: Banco, chave: string) => comprovantes(banco).find((x) => x.chave === chave)

export function compraLigada(banco: Banco, c: Comprovante): CompraCandidata | undefined {
  if (!c.movId) return undefined
  const pf = carteiraPf(banco).movimentacoes.find((r) => r.id === c.movId)
  if (pf) return { id: pf.id, perfil: 'pf', data: pf.data, valor: pf.valor, descricao: pf.descricao }
  const pj = banco.movimentacoes.find((r) => r.id === c.movId)
  return pj && { id: pj.id, perfil: 'pj', data: pj.data, valor: pj.valor, descricao: pj.descricao }
}

export const novoId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Reduz a foto para caber no celular e no backup: lado maior de 1400 px, JPEG. */
export async function comprimirImagem(arquivo: Blob, lado = 1400, qualidade = 0.6): Promise<string> {
  const bmp = await createImageBitmap(arquivo)
  const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * escala)
  canvas.height = Math.round(bmp.height * escala)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', qualidade)
}

/** A categoria do comprovante passa para a compra ligada da PF, se ela ainda não tiver uma. */
export function categorizarCompra(banco: Banco, c: Comprovante): Banco {
  const pf = carteiraPf(banco)
  const alvo = pf.movimentacoes.find((r) => r.id === c.movId)
  if (!alvo || alvo.categoria || !c.categoria) return banco
  return { ...banco, pf: { ...pf, movimentacoes: pf.movimentacoes.map((r) => (r.id === alvo.id ? { ...r, categoria: c.categoria as CategoriaPf } : r)) } }
}
