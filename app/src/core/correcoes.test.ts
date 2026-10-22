import { describe, expect, it } from 'vitest'
import { bancoVazio, chaveDescricao, corrigirEntrada, esquecerRegra, importar, marcar } from './banco'
import type { Movimentacao } from './parser'
import { corrigirSaida, esquecerRegraSaida, marcarSaida } from './saidas'

const pix = (data: string, valor: number, nome: string, tipo: 'entrada' | 'saida' = 'entrada'): Movimentacao => ({
  data, valor, tipo,
  descricao: `Transferência ${tipo === 'entrada' ? 'recebida' : 'enviada'} pelo Pix - ${nome} - •••.962.147-•• - NU PAGAMENTOS - IP (0260)`,
})

describe('corrigir marcações', () => {
  const base = importar(bancoVazio(), [pix('2026-09-03', 500, 'MARIA SOUZA'), pix('2026-10-03', 600, 'MARIA SOUZA'), pix('2026-10-04', 90, 'JOAO LIMA')]).banco
  const [set, out, joao] = base.movimentacoes

  it('corrige só uma entrada sem mexer na regra', () => {
    const b = corrigirEntrada(marcar(base, set.id, true, 'servicos'), out.id, true, 'comercio', false)
    expect(b.movimentacoes.map((r) => r.categoria)).toEqual(['servicos', 'comercio', null])
    expect(b.regras[chaveDescricao(set.descricao)]).toEqual({ faturamento: true, categoria: 'servicos' })
  })

  it('com todas, corrige o pagador inteiro e lembra; não mexe em outro pagador', () => {
    const b = corrigirEntrada(base, set.id, false, 'servicos', true)
    expect(b.movimentacoes.map((r) => r.faturamento)).toEqual([false, false, null])
    expect(b.movimentacoes[0].categoria).toBeNull()
    expect(b.regras[chaveDescricao(set.descricao)]).toEqual({ faturamento: false, categoria: null })
    expect(b.movimentacoes[2]).toBe(joao)
  })

  it('voltar para a revisão esquece o pagador quando é para todas', () => {
    const b = corrigirEntrada(marcar(base, set.id, true, 'servicos'), set.id, null, null, true)
    expect(b.movimentacoes[0].faturamento).toBeNull()
    expect(b.regras).toEqual({})
  })

  it('esquecer o pagador mantém as marcações e a próxima importação pede revisão', () => {
    const marcado = marcar(base, set.id, true, 'servicos')
    const b = esquecerRegra(marcado, chaveDescricao(set.descricao))
    expect(b.movimentacoes[0].faturamento).toBe(true)
    expect(importar(b, [pix('2026-11-03', 700, 'MARIA SOUZA')]).banco.movimentacoes[3].faturamento).toBeNull()
  })

  it('saídas: corrige uma ou o destino inteiro, e esquecer mantém o que já foi separado', () => {
    const s = importar(bancoVazio(), [pix('2026-10-01', 100, 'KALUNGA', 'saida'), pix('2026-10-09', 50, 'KALUNGA', 'saida')]).banco
    const [a] = s.movimentacoes
    const chave = chaveDescricao(a.descricao)
    expect(corrigirSaida(s, a.id, true, false).movimentacoes.map((r) => r.despesa)).toEqual([true, null])
    const todas = corrigirSaida(s, a.id, false, true)
    expect(todas.movimentacoes.map((r) => r.despesa)).toEqual([false, false])
    expect(todas.regrasSaida).toEqual({ [chave]: false })
    const esquecido = esquecerRegraSaida(marcarSaida(s, chave, true), chave)
    expect(esquecido.regrasSaida).toEqual({})
    expect(esquecido.movimentacoes.map((r) => r.despesa)).toEqual([true, true])
  })
})
