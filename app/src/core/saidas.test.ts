import { describe, expect, it } from 'vitest'
import { bancoVazio, chaveDescricao, importar, marcar, type Banco } from './banco'
import type { Movimentacao } from './parser'
import { dasDoAno, gruposSaida, irpfDoAno, marcarDas, marcarSaida } from './saidas'

const das = (data: string, valor = 86.05): Movimentacao => ({ data, descricao: 'Pagamento de boleto efetuado - DAS-SIMPLES NACIONAL', valor, tipo: 'saida' })
const pix = (data: string, valor: number, nome: string, tipo: 'entrada' | 'saida' = 'entrada'): Movimentacao => ({
  data, valor, tipo,
  descricao: `Transferência ${tipo === 'entrada' ? 'recebida' : 'enviada'} pelo Pix - ${nome} - •••.962.147-•• - NU PAGAMENTOS - IP (0260)`,
})
const estados = (b: Banco, hoje: string) => dasDoAno(b, 2026, new Date(hoje + 'T12:00:00')).map((m) => m.estado)

describe('DAS do ano', () => {
  it('o pagamento de outubro quita setembro; sem extrato não dá para saber', () => {
    const b = importar(bancoVazio(), [das('2026-10-20'), pix('2026-10-15', 1000, 'LINHAFLEX LTDA')]).banco
    const e = estados(b, '2026-10-22')
    expect(e[8]).toBe('pago') // setembro
    expect(e[7]).toBe('sem-extrato') // agosto vence em 20/09, sem extrato de setembro
    expect(e[9]).toBe('a-vencer') // outubro vence em 20/11
  })

  it('mês com extrato do vencimento e sem pagamento fica em aberto', () => {
    const b = importar(bancoVazio(), [pix('2026-09-10', 500, 'MARIA SOUZA'), das('2026-10-20')]).banco
    expect(estados(b, '2026-10-22')[7]).toBe('atrasado') // agosto: extrato de setembro sem DAS
  })

  it('dois pagamentos no mesmo mês: o segundo quita o mês em aberto anterior', () => {
    const b = importar(bancoVazio(), [das('2026-10-05'), das('2026-10-20')]).banco
    const e = estados(b, '2026-10-22')
    expect(e[8]).toBe('pago')
    expect(e[7]).toBe('pago')
  })

  it('antes da abertura não conta e marcação à mão vale', () => {
    let b: Banco = { ...importar(bancoVazio(), [pix('2026-10-10', 500, 'MARIA SOUZA')]).banco, abertura: '2026-08' }
    expect(estados(b, '2026-10-22').slice(0, 9)).toEqual(['antes', 'antes', 'antes', 'antes', 'antes', 'antes', 'antes', 'sem-extrato', 'atrasado'])
    b = marcarDas(b, 2026, 9, true)
    expect(dasDoAno(b, 2026, new Date('2026-10-22T12:00:00'))[8]).toMatchObject({ estado: 'pago', manual: true })
    expect(estados(marcarDas(b, 2026, 9, null), '2026-10-22')[8]).toBe('atrasado')
  })

  it('DAS marcado à mão com valor entra nas despesas do ano', () => {
    const b = marcarDas(marcarDas(importar(bancoVazio(), [das('2026-10-20', 86.05)]).banco, 2026, 8, 86.05), 2025, 12, 80)
    expect(dasDoAno(b, 2026, new Date('2026-10-22T12:00:00'))[7]).toMatchObject({ estado: 'pago', manual: true, valor: 86.05 })
    expect(irpfDoAno(b, 2026)).toMatchObject({ das: 172.1, despesas: 172.1 })
  })
})

describe('saídas e lucro isento', () => {
  const movs = [
    pix('2026-10-03', 10_000, 'MARIA SOUZA'),
    pix('2026-10-04', 5_000, 'LOJA CENTRO'),
    pix('2026-10-15', 1230, 'Bruno Silva Porto', 'saida'),
    pix('2026-10-16', 800, 'GRAFICA RAPIDA LTDA', 'saida'),
    das('2026-10-20', 80),
  ]
  const base = importar(bancoVazio(), movs).banco
  const [s, c] = base.movimentacoes
  const marcado = marcar(marcar(base, s.id, true, 'servicos'), c.id, true, 'comercio')

  it('agrupa por destino, com o DAS já como despesa', () => {
    const g = gruposSaida(marcado, 2026)
    expect(g.map((x) => [x.nome, x.despesa, x.das])).toEqual([
      ['Bruno Silva Porto', null, false],
      ['GRAFICA RAPIDA LTDA', null, false],
      ['DAS-SIMPLES NACIONAL', true, true],
    ])
  })

  it('sem separar, a parte isenta é 32% dos serviços e 8% do comércio', () => {
    const r = irpfDoAno(marcado, 2026)
    expect(r.isenta).toBeCloseTo(3_200 + 400)
    expect(r.despesas).toBe(80)
    expect(r.semSeparar).toBe(2)
  })

  it('com as despesas separadas, o lucro acima da parte isenta é tributável', () => {
    const chaveBruno = chaveDescricao(movs[2].descricao)
    let b = marcarSaida(marcado, chaveBruno, false)
    b = marcarSaida(b, chaveDescricao(movs[3].descricao), true)
    const r = irpfDoAno(b, 2026)
    expect(r).toMatchObject({ despesas: 880, retiradas: 1230, lucro: 14_120, semSeparar: 0 })
    expect(r.tributavel).toBeCloseTo(14_120 - 3_600)
    // a próxima retirada para a mesma pessoa já entra separada
    const novo = importar(b, [pix('2026-11-15', 900, 'Bruno Silva Porto', 'saida')]).banco
    expect(novo.movimentacoes[novo.movimentacoes.length - 1].despesa).toBe(false)
  })
})
