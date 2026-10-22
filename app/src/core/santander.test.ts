import { describe, expect, it } from 'vitest'
import { ehExtratoSantander, parseSantander } from './santander'

// Linhas como o pdf.js tira do "Extrato Consolidado Inteligente" (nomes e valores inventados).
const LINHAS = [
  'EXTRATO CONSOLIDADO INTELIGENTE', 'fevereiro/2026 ', 'santander.com.br/seguranca',
  'Movimentação ', 'Data   Descrição   Nº Documento   Movimento (R$)   Saldo (R$)', 'SALDO EM 31/01   100,00- ',
  '02/02   JUROS SALDO UTILIZ ATE LIMITE', 'PERIODO: 01/01 A 31/01/26', '-   12,34-',
  'IOF IMPOSTO OPERACOES FINANCEIRAS', 'PERIODO: 01/01 A 31/01/26', '-   1,00-   113,34-',
  '05/02   PIX RECEBIDO Joana Lima   -   1.500,00',
  'PIX ENVIADO', 'Carla Souza Pereira', '-   200,00-   1.186,66',
  '10/02   DEBITO VISA ELECTRON BRASIL', '09/02 SUPERMERCADOS BOM', '123456   45,90- ',
  'EXTRATO CONSOLIDADO INTELIGENTE', 'fevereiro/2026 ', 'Extrato_PF_A4_Inteligente - 27/11/2024', 'Pagina: 2/6 ',
  'Data   Descrição   Nº Documento   Movimento (R$)   Saldo (R$) ',
  'DEBITO AUT. TITULO CAPITALIZACAO', 'ICL12345678', '-   39,90-   1.100,86',
  'SALDO EM 28/02   1.100,86 ',
  'Saldos por Período ', '02   113,34-   0,00',
]

describe('extrato PDF do Santander', () => {
  it('reconhece o extrato', () => {
    expect(ehExtratoSantander(LINHAS)).toBe(true)
    expect(ehExtratoSantander(['01 OUT 2026 Total de entradas'])).toBe(false)
  })

  it('lê cada lançamento com data, valor e quem recebeu', () => {
    expect(parseSantander(LINHAS)).toEqual([
      { data: '2026-02-02', descricao: 'JUROS SALDO UTILIZ ATE LIMITE', valor: 12.34, tipo: 'saida' },
      { data: '2026-02-02', descricao: 'IOF IMPOSTO OPERACOES FINANCEIRAS', valor: 1, tipo: 'saida' },
      { data: '2026-02-05', descricao: 'PIX RECEBIDO Joana Lima', valor: 1500, tipo: 'entrada' },
      { data: '2026-02-05', descricao: 'PIX ENVIADO Carla Souza Pereira', valor: 200, tipo: 'saida' },
      { data: '2026-02-10', descricao: 'Compra no débito SUPERMERCADOS BOM', valor: 45.9, tipo: 'saida' },
      { data: '2026-02-10', descricao: 'DEBITO AUT. TITULO CAPITALIZACAO', valor: 39.9, tipo: 'saida' },
    ])
  })

  it('lançamento de dezembro no extrato de janeiro fica no ano anterior', () => {
    const l = ['EXTRATO CONSOLIDADO INTELIGENTE', 'janeiro/2027', 'Movimentação', '31/12   PIX RECEBIDO Ana   -   10,00']
    expect(parseSantander(l)[0].data).toBe('2026-12-31')
  })
})
