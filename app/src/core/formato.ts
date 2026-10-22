// Textos curtos para as telas, no formato do guia de conteúdo.

const CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** "2026-10-03" vira "03 out". */
export const dataCurta = (iso: string) => `${iso.slice(8, 10)} ${CURTO[Number(iso.slice(5, 7)) - 1]}`

const PREFIXOS = /^(transfer[êe]ncia (recebida|enviada)( pelo pix)?|pix (recebido|enviado)|dep[óo]sito( recebido)?|ted (recebida|enviada)|pagamento de boleto( efetuado)?|compra no d[ée]bito|pagamento de fatura)\s*/i

/** Separa quem pagou (ou recebeu, nas saídas) do tipo de operação, para mostrar o nome em destaque. */
export function pagador(descricao: string): { nome: string; operacao: string } {
  const m = PREFIXOS.exec(descricao)
  const resto = descricao
    .slice(m ? m[0].length : 0)
    .replace(/^[\s-]+/, '')
    .split(/\s+-\s+/)[0] // OFX: "NOME - CPF/CNPJ - BANCO ..."
    .replace(/\s*-?\s*[•*\d.\-/]{6,}.*$/, '')
    .trim()
  return { nome: resto || descricao, operacao: m ? m[0].trim() : 'Entrada' }
}
