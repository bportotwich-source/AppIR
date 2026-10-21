// Textos curtos para as telas, no formato do guia de conteúdo.

const CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** "2026-10-03" vira "03 out". */
export const dataCurta = (iso: string) => `${iso.slice(8, 10)} ${CURTO[Number(iso.slice(5, 7)) - 1]}`

const PREFIXOS = /^(transfer[êe]ncia recebida( pelo pix)?|pix recebido|dep[óo]sito( recebido)?|ted recebida)\s*/i

/** Separa quem pagou do tipo de operação, para mostrar o nome em destaque. */
export function pagador(descricao: string): { nome: string; operacao: string } {
  const m = PREFIXOS.exec(descricao)
  const resto = descricao.slice(m ? m[0].length : 0).replace(/\s*-?\s*[•*\d.\-/]{6,}.*$/, '').trim()
  return { nome: resto || descricao, operacao: m ? m[0].trim() : 'Entrada' }
}
