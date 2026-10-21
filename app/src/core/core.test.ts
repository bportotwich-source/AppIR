import { describe, expect, it } from 'vitest'
import { parseLinhas, valorBr } from './parser'
import { bancoVazio, chaveDescricao, entradas, importar, marcar } from './banco'
import { dataCurta, pagador } from './formato'
import { alerta, limiteProporcional, pendentes, totaisAno, totaisPorMes } from './relatorio'

// Layout imaginado do Nubank PJ; troca por linhas de um extrato real na etapa 3.
const EXTRATO = [
  'Extrato gerado em 01 NOV 2026',
  'CNPJ 12.345.678/0001-90 Agência 0001 Conta 1234567-8',
  'Saldo inicial R$ 1.000,00',
  '03 OUT 2026 Total de entradas + 1.850,00',
  'Transferência recebida pelo Pix',
  'MARIA SOUZA - •••.123.456-•• 350,00',
  'Transferência recebida pelo Pix DELTA EVENTOS LTDA 1.500,00',
  'Total de saídas - 120,00',
  'Pagamento de boleto ENERGIA 120,00',
  '04 OUT 2026',
  'Transferência recebida pelo Pix MARIA SOUZA + 350,00',
  'Transferência recebida pelo Pix MARIA SOUZA + 350,00',
  'Tarifa 5,00',
  'Página 1 de 2',
]

describe('parser', () => {
  it('converte valor brasileiro', () => {
    expect(valorBr('1.234.567,89')).toBe(1234567.89)
    expect(valorBr('0,05')).toBe(0.05)
  })

  it('lê datas, seções, descrições em várias linhas e sinais', () => {
    const movs = parseLinhas(EXTRATO)
    expect(movs).toEqual([
      { data: '2026-10-03', descricao: 'Transferência recebida pelo Pix MARIA SOUZA - •••.123.456-••', valor: 350, tipo: 'entrada' },
      { data: '2026-10-03', descricao: 'Transferência recebida pelo Pix DELTA EVENTOS LTDA', valor: 1500, tipo: 'entrada' },
      { data: '2026-10-03', descricao: 'Pagamento de boleto ENERGIA', valor: 120, tipo: 'saida' },
      { data: '2026-10-04', descricao: 'Transferência recebida pelo Pix MARIA SOUZA', valor: 350, tipo: 'entrada' },
      { data: '2026-10-04', descricao: 'Transferência recebida pelo Pix MARIA SOUZA', valor: 350, tipo: 'entrada' },
      { data: '2026-10-04', descricao: 'Tarifa', valor: 5, tipo: 'saida' },
    ])
  })

  it('ignora linhas antes da primeira data', () => {
    expect(parseLinhas(['Pix recebido 100,00'])).toEqual([])
  })
})

describe('banco', () => {
  it('normaliza descrições parecidas para a mesma chave', () => {
    expect(chaveDescricao('Transferência recebida pelo Pix MARIA SOUZA - •••.123.456-••')).toBe(
      'transferencia recebida pelo pix maria souza',
    )
    expect(chaveDescricao('Transferência recebida pelo Pix MARIA SOUZA')).toBe(
      'transferencia recebida pelo pix maria souza',
    )
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
    expect(pagador('Crédito de empréstimo')).toEqual({ nome: 'Crédito de empréstimo', operacao: 'Entrada' })
  })
})
