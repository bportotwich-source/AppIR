import { describe, expect, it } from 'vitest'
import { parseLinhas, valorBr } from './parser'
import { bancoVazio, chaveDescricao, entradas, importar, marcar } from './banco'
import { dataCurta, pagador } from './formato'
import { parseCsv, parseOfx } from './arquivos'
import { alerta, limiteDoAno, limiteProporcional, pendentes, projecaoAno, textoLimite, totaisAno, totaisPorMes } from './relatorio'
import { backupAtrasado } from './store'
import { extratosDoAno, iniciais, proximosPrazos } from './agenda'

// Mesmo layout de um extrato real do Nubank PJ (out/2026, texto como o pdf.js
// extrai), com nomes e valores trocados.
const EXTRATO = [
  'a 15 DE OUTUBRO DE 2026   21 DE OUTUBRO DE 2026   VALORES EM R$',
  'Saldo final do período', 'R$ 1.450,24', 'Saldo inicial', 'Rendimento líquido',
  'Total de entradas', 'Total de saídas', 'Saldo final do período',
  '100,67', '+0,00', '+2.665,62', '-1.316,05', '1.450,24',
  'Movimentações',
  '03 OUT 2026   Total de entradas   + 1.850,00',
  'Transferência recebida pelo Pix   MARIA SOUZA   350,00',
  'Transferência recebida pelo Pix   Delta Eventos Ltda   1.500,00',
  'Total de saídas   - 120,00',
  'Pagamento de boleto efetuado   DAS-SIMPLES NACIONAL   120,00',
  'Saldo do dia   1.830,67',
  'Tem alguma dúvida? Mande uma mensagem para nosso time de atendimento pelo chat do app ou ligue 4020 0185 (capitais e regiões',
  'metropolitanas) ou 0800 591 2117 (demais localidades). Atendimento 24h.',
  'Extrato gerado dia 21 de outubro de 2026 às 15:23   1   de   2',
  'a 15 DE OUTUBRO DE 2026   21 DE OUTUBRO DE 2026   VALORES EM R$',
  '04 OUT 2026   Total de entradas   + 700,00',
  'Transferência recebida pelo Pix   MARIA SOUZA   350,00',
  'Transferência recebida pelo Pix   MARIA SOUZA   350,00',
  'Total de saídas   - 5,00',
  'Tarifa   5,00',
  'Saldo do dia   2.525,67',
  'Nu Financeira S.A. - Sociedade de Credito, Financiamento   Nu Pagamentos S.A. - Instituição de Pagamento',
]

describe('parser', () => {
  it('converte valor brasileiro', () => {
    expect(valorBr('1.234.567,89')).toBe(1234567.89)
    expect(valorBr('0,05')).toBe(0.05)
  })

  it('lê o layout do Nubank PJ: resumo, seções por dia, rodapé entre páginas', () => {
    const movs = parseLinhas(EXTRATO)
    expect(movs).toEqual([
      { data: '2026-10-03', descricao: 'Transferência recebida pelo Pix MARIA SOUZA', valor: 350, tipo: 'entrada' },
      { data: '2026-10-03', descricao: 'Transferência recebida pelo Pix Delta Eventos Ltda', valor: 1500, tipo: 'entrada' },
      { data: '2026-10-03', descricao: 'Pagamento de boleto efetuado DAS-SIMPLES NACIONAL', valor: 120, tipo: 'saida' },
      { data: '2026-10-04', descricao: 'Transferência recebida pelo Pix MARIA SOUZA', valor: 350, tipo: 'entrada' },
      { data: '2026-10-04', descricao: 'Transferência recebida pelo Pix MARIA SOUZA', valor: 350, tipo: 'entrada' },
      { data: '2026-10-04', descricao: 'Tarifa', valor: 5, tipo: 'saida' },
    ])
  })

  it('junta descrição quebrada em duas linhas', () => {
    expect(parseLinhas(['05 OUT 2026', 'Transferência recebida pelo Pix', 'JOÃO LIMA + 420,00'])).toEqual([
      { data: '2026-10-05', descricao: 'Transferência recebida pelo Pix JOÃO LIMA', valor: 420, tipo: 'entrada' },
    ])
  })

  it('ignora linhas antes da primeira data', () => {
    expect(parseLinhas(['Pix recebido 100,00'])).toEqual([])
  })
})

describe('banco', () => {
  it('dá a mesma chave ao mesmo pagador no PDF, no OFX e com sufixo cortado', () => {
    const chave = 'transferencia recebida pelo pix delta eventos'
    expect(chaveDescricao('Transferência recebida pelo Pix Delta Eventos Ltda')).toBe(chave)
    expect(chaveDescricao('Transferência recebida pelo Pix Delta Eventos Ltd')).toBe(chave)
    expect(chaveDescricao('Transferência recebida pelo Pix - DELTA EVENTOS LTDA - 12.345.678/0001-90 - BANCO X (0001) Agência: 1 Conta: 2-3')).toBe(chave)
  })

  it('não duplica o mesmo mês importado em PDF e depois em OFX', () => {
    const pdf = importar(bancoVazio(), parseLinhas(EXTRATO)).banco
    const ofx = importar(pdf, [
      { data: '2026-10-03', descricao: 'Transferência recebida pelo Pix - MARIA SOUZA - •••.123.456-••', valor: 350, tipo: 'entrada' },
      { data: '2026-10-04', descricao: 'Transferência recebida pelo Pix - MARIA SOUZA', valor: 350, tipo: 'entrada' },
      { data: '2026-10-04', descricao: 'Transferência recebida pelo Pix - MARIA SOUZA', valor: 350, tipo: 'entrada' },
      { data: '2026-10-05', descricao: 'Transferência recebida pelo Pix - JOÃO LIMA', valor: 420, tipo: 'entrada' },
    ])
    expect(ofx.novas).toBe(1)
    expect(ofx.repetidas).toBe(3)
  })

  it('não duplica ao importar o mesmo extrato duas vezes, mas mantém Pix iguais no mesmo dia', () => {
    const movs = parseLinhas(EXTRATO)
    const a = importar(bancoVazio(), movs, 'out.pdf')
    expect(a.novas).toBe(6)
    const b = importar(a.banco, movs, 'out.pdf')
    expect(b.novas).toBe(0)
    expect(b.repetidas).toBe(6)
    expect(b.banco.movimentacoes).toHaveLength(6)
  })

  it('saídas nunca são faturamento; entradas começam sem revisão', () => {
    const { banco } = importar(bancoVazio(), parseLinhas(EXTRATO))
    expect(banco.movimentacoes.filter((r) => r.tipo === 'saida').every((r) => r.faturamento === false)).toBe(true)
    expect(entradas(banco, 2026).every((r) => r.faturamento === null)).toBe(true)
  })

  it('lembra a marcação para o mesmo pagador nas próximas importações', () => {
    let { banco } = importar(bancoVazio(), parseLinhas(EXTRATO))
    const maria = entradas(banco, 2026)[0]
    banco = marcar(banco, maria.id, true, 'servicos')
    banco = importar(banco, [
      { data: '2026-11-02', descricao: 'Transferência recebida pelo Pix MARIA SOUZA', valor: 400, tipo: 'entrada' },
    ]).banco
    const nova = entradas(banco, 2026, 11)[0]
    expect(nova.faturamento).toBe(true)
    expect(nova.categoria).toBe('servicos')
  })

  it('marcar como fora do faturamento apaga a categoria', () => {
    let { banco } = importar(bancoVazio(), parseLinhas(EXTRATO))
    const id = entradas(banco, 2026)[1].id
    banco = marcar(banco, id, false, 'comercio')
    expect(banco.movimentacoes.find((r) => r.id === id)?.categoria).toBeNull()
  })
})

describe('relatório', () => {
  it('soma por mês e categoria só o que é faturamento', () => {
    let { banco } = importar(bancoVazio(), parseLinhas(EXTRATO))
    const [maria, delta] = entradas(banco, 2026)
    banco = marcar(banco, maria.id, true, 'servicos', false)
    banco = marcar(banco, delta.id, true, 'comercio', false)
    expect(totaisPorMes(banco, 2026)[9]).toEqual({ servicos: 350, comercio: 1500 })
    expect(totaisAno(banco, 2026)).toEqual({ servicos: 350, comercio: 1500 })
    expect(pendentes(banco, 2026)).toBe(2)
  })

  it('classifica o alerta pelo limite', () => {
    expect(alerta(30_000).nivel).toBe('ok')
    expect(alerta(60_000).nivel).toBe('atencao')
    expect(alerta(72_600).nivel).toBe('atencao') // 89,6% aparece como 90%, mas ainda não é perigo
    expect(alerta(72_900).nivel).toBe('perigo')
    expect(alerta(81_000).nivel).toBe('perigo')
    expect(alerta(90_000).nivel).toBe('estourou')
    expect(alerta(100_000).nivel).toBe('critico')
  })

  it('projeta o ano pela média de janeiro até o último mês com extrato', () => {
    let { banco } = importar(bancoVazio(), parseLinhas(EXTRATO))
    for (const r of entradas(banco, 2026)) banco = marcar(banco, r.id, true, 'servicos', false)
    expect(projecaoAno(banco, 2026)).toBeCloseTo((2550 / 10) * 12)
    expect(projecaoAno(banco, 2025)).toBeNull()
  })

  it('limite proporcional no ano de abertura', () => {
    expect(limiteProporcional(1)).toBe(81_000)
    expect(limiteProporcional(7)).toBe(40_500)
  })
})


describe('formato', () => {
  it('data curta', () => expect(dataCurta('2026-10-03')).toBe('03 out'))
  it('separa o pagador da operação', () => {
    expect(pagador('Transferência recebida pelo Pix MARIA SOUZA - •••.123.456-••')).toEqual({
      nome: 'MARIA SOUZA',
      operacao: 'Transferência recebida pelo Pix',
    })
    expect(pagador('Transferência recebida pelo Pix - DELTA EVENTOS LTDA - 12.345.678/0001-90 - BANCO X').nome).toBe(
      'DELTA EVENTOS LTDA',
    )
    expect(pagador('Crédito de empréstimo')).toEqual({ nome: 'Crédito de empréstimo', operacao: 'Entrada' })
  })
})

describe('OFX e CSV', () => {
  it('lê OFX 1.x (SGML, sem tags de fechamento nos campos)', () => {
    const ofx = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261003000000[-3:BRT]
<TRNAMT>350.00
<FITID>abc
<MEMO>Transferência recebida pelo Pix - MARIA SOUZA - •••.123.456-••
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261020
<TRNAMT>-86.05
<MEMO>Pagamento de boleto efetuado - DAS-SIMPLES NACIONAL
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`
    expect(parseOfx(ofx)).toEqual([
      { data: '2026-10-03', descricao: 'Transferência recebida pelo Pix - MARIA SOUZA - •••.123.456-••', valor: 350, tipo: 'entrada' },
      { data: '2026-10-20', descricao: 'Pagamento de boleto efetuado - DAS-SIMPLES NACIONAL', valor: 86.05, tipo: 'saida' },
    ])
  })

  it('lê OFX 2.x (XML)', () => {
    const ofx = '<?xml version="1.0"?><OFX><STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20261021</DTPOSTED>' +
      '<TRNAMT>1433.48</TRNAMT><MEMO>Pix recebido</MEMO></STMTTRN></OFX>'
    expect(parseOfx(ofx)).toEqual([{ data: '2026-10-21', descricao: 'Pix recebido', valor: 1433.48, tipo: 'entrada' }])
  })

  it('lê o CSV do Nubank (vírgula, ponto decimal, descrição com vírgula entre aspas)', () => {
    const csv = '\uFEFFData,Valor,Identificador,Descrição\n' +
      '15/10/2026,1232.14,id-1,"Transferência recebida pelo Pix - DELTA EVENTOS LTDA - 12.345.678/0001-90"\n' +
      '15/10/2026,-1230.00,id-2,Transferência enviada pelo Pix - MARIA SOUZA\n'
    expect(parseCsv(csv)).toEqual([
      { data: '2026-10-15', descricao: 'Transferência recebida pelo Pix - DELTA EVENTOS LTDA - 12.345.678/0001-90', valor: 1232.14, tipo: 'entrada' },
      { data: '2026-10-15', descricao: 'Transferência enviada pelo Pix - MARIA SOUZA', valor: 1230, tipo: 'saida' },
    ])
  })

  it('lê CSV com ponto e vírgula e vírgula decimal', () => {
    expect(parseCsv('Data;Descrição;Valor\n21/10/2026;Pix recebido;1.433,48')).toEqual([
      { data: '2026-10-21', descricao: 'Pix recebido', valor: 1433.48, tipo: 'entrada' },
    ])
  })
})

describe('ano de abertura', () => {
  const banco = (abertura?: string | null) => ({ ...bancoVazio(), abertura })

  it('usa o limite proporcional só no ano em que o MEI abriu', () => {
    expect(limiteDoAno(banco('2026-10'), 2026)).toBe(20_250)
    expect(limiteDoAno(banco('2026-10'), 2027)).toBe(81_000)
    expect(limiteDoAno(banco(null), 2026)).toBe(81_000)
    expect(limiteDoAno(banco(), 2026)).toBe(81_000)
  })

  it('alerta contra o limite proporcional', () => {
    expect(alerta(19_000, 20_250).nivel).toBe('perigo')
    expect(alerta(30_000, 20_250).mensagem).toContain('R$ 20.250,00')
  })

  it('explica o limite do ano', () => {
    expect(textoLimite('2026-10', 2026)).toBe('Aberto em outubro de 2026. Limite de 2026: R$ 20.250,00 (3 meses × R$ 6.750,00).')
    expect(textoLimite('2026-12', 2026)).toContain('(1 mês ×')
    expect(textoLimite(null, 2026)).toBe('Limite de 2026: R$ 81.000,00, o ano inteiro.')
    expect(textoLimite('2024-03', 2026)).toBe('Limite de 2026: R$ 81.000,00, o ano inteiro.')
    expect(textoLimite(undefined, 2026)).toBe('')
  })
})

describe('lembrete de backup', () => {
  const mov = importar(bancoVazio(), [{ data: '2026-10-03', descricao: 'Pix', valor: 10, tipo: 'entrada' }]).banco
  const agora = new Date('2026-10-22T12:00:00Z')

  it('não lembra sem dados', () => {
    expect(backupAtrasado(bancoVazio(), agora)).toBeNull()
  })

  it('lembra quem nunca fez backup', () => {
    expect(backupAtrasado(mov, agora)).toBe(Infinity)
  })

  it('lembra só com mudanças desde o backup e depois de 14 dias', () => {
    const feito = { ...mov, ultimoBackup: '2026-10-01T12:00:00Z' }
    expect(backupAtrasado({ ...feito, alteradoEm: '2026-09-30T00:00:00Z' }, agora)).toBeNull()
    expect(backupAtrasado({ ...feito, alteradoEm: '2026-10-20T00:00:00Z' }, agora)).toBe(21)
    expect(backupAtrasado({ ...feito, ultimoBackup: '2026-10-15T12:00:00Z', alteradoEm: '2026-10-20T00:00:00Z' }, agora)).toBeNull()
  })
})

describe('projeção no ano de abertura', () => {
  it('conta a média só a partir do mês em que o MEI abriu', () => {
    const movs = ['08', '09', '10'].map((m) => ({ data: `2026-${m}-05`, descricao: 'Pix', valor: 3_000, tipo: 'entrada' as const }))
    const b = importar(bancoVazio(), movs).banco
    const marcado = b.movimentacoes.reduce((acc, r) => marcar(acc, r.id, true, 'servicos'), b)
    expect(projecaoAno(marcado, 2026)).toBe(10_800) // 9.000 em 10 meses desde jan, × 12
    expect(projecaoAno({ ...marcado, abertura: '2026-08' }, 2026)).toBe(15_000) // 3.000 × 5 meses
  })
})

describe('prazos e extratos', () => {
  it('mostra o próximo DAS e a próxima DASN', () => {
    expect(proximosPrazos(new Date(2026, 9, 22))).toEqual([
      { data: '2026-11-20', titulo: 'DAS de outubro', dias: 29 },
      { data: '2027-05-31', titulo: 'DASN-SIMEI 2026', dias: 221 },
    ])
    expect(proximosPrazos(new Date(2026, 0, 20))[0]).toEqual({ data: '2026-01-20', titulo: 'DAS de dezembro', dias: 0 })
    expect(proximosPrazos(new Date(2026, 2, 1))[1]).toEqual({ data: '2026-05-31', titulo: 'DASN-SIMEI 2025', dias: 91 })
  })

  it('resume os extratos por mês', () => {
    const b = importar(bancoVazio(), [
      { data: '2026-09-03', descricao: 'Pix A', valor: 100, tipo: 'entrada' },
      { data: '2026-10-03', descricao: 'Pix B', valor: 200, tipo: 'entrada' },
      { data: '2026-10-05', descricao: 'Tarifa', valor: 5, tipo: 'saida' },
    ], 'x.ofx', '2026-10-21T10:00:00Z').banco
    const marcado = marcar(b, b.movimentacoes[1].id, true, 'servicos')
    expect(extratosDoAno(marcado, 2026)).toEqual([
      { mes: 10, nome: 'outubro', importadoEm: '2026-10-21T10:00:00Z', movimentacoes: 2, faturado: 200 },
      { mes: 9, nome: 'setembro', importadoEm: '2026-10-21T10:00:00Z', movimentacoes: 1, faturado: 0 },
    ])
  })

  it('tira as iniciais do pagador', () => {
    expect(iniciais('MARIA SOUZA')).toBe('MS')
    expect(iniciais('Delta Eventos Ltda')).toBe('DE')
    expect(iniciais('João')).toBe('J')
    expect(iniciais('')).toBe('?')
  })
})
