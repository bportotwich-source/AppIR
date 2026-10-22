import { describe, expect, it } from 'vitest'
import { bancoVazio, importar, marcar, type Banco } from './banco'
import { avisoDasn, declaracaoDo, desfazerEntrega, entregar, mudarDeclaracao, mudarNotas, relatorioMensal } from './declaracao'

const dia = (iso: string) => new Date(iso + 'T12:00:00')
const pix = (data: string, valor: number, nome: string) => ({ data, valor, tipo: 'entrada' as const, descricao: `Transferência recebida pelo Pix - ${nome}` })

describe('DASN-SIMEI', () => {
  const com2025: Banco = importar(bancoVazio(), [pix('2025-06-10', 1000, 'MARIA')]).banco

  it('guarda empregado e entrega por ano, e desfaz sem perder o empregado', () => {
    let b = mudarDeclaracao(com2025, 2025, { empregado: true })
    b = entregar(b, 2025, '2026-03-02', ' 12345 ')
    expect(declaracaoDo(b, 2025)).toEqual({ empregado: true, entregueEm: '2026-03-02', recibo: '12345' })
    expect(declaracaoDo(b, 2026)).toEqual({})
    expect(declaracaoDo(desfazerEntrega(b, 2025), 2025)).toEqual({ empregado: true })
  })

  it('avisa a partir de 45 dias do prazo e até um mês atrasada; some quando entregue', () => {
    expect(avisoDasn(com2025, dia('2026-04-15'))).toBeNull()
    expect(avisoDasn(com2025, dia('2026-04-16'))).toEqual({ ano: 2025, dias: 45 })
    expect(avisoDasn(com2025, dia('2026-06-02'))).toEqual({ ano: 2025, dias: -2 })
    expect(avisoDasn(com2025, dia('2026-10-22'))).toBeNull()
    expect(avisoDasn(entregar(com2025, 2025, '2026-04-20', ''), dia('2026-05-10'))).toBeNull()
  })

  it('não cobra de quem abriu o MEI depois daquele ano', () => {
    expect(avisoDasn({ ...bancoVazio(), abertura: '2026-08' }, dia('2026-05-10'))).toBeNull()
    expect(avisoDasn({ ...bancoVazio(), abertura: null }, dia('2026-05-10'))).toEqual({ ano: 2025, dias: 21 })
  })
})

describe('Relatório Mensal das Receitas Brutas', () => {
  it('separa com e sem nota fiscal, sem passar do total', () => {
    let b = importar(bancoVazio(), [pix('2026-10-03', 1850, 'MARIA'), pix('2026-10-12', 2400, 'DELTA'), pix('2026-09-12', 99, 'DELTA')]).banco
    const [m, d] = b.movimentacoes
    b = marcar(marcar(b, m.id, true, 'servicos'), d.id, true, 'comercio')
    expect(relatorioMensal(b, 2026, 10)).toEqual({
      comercio: { semNota: 2400, comNota: 0, total: 2400 },
      industria: { semNota: 0, comNota: 0, total: 0 },
      servicos: { semNota: 1850, comNota: 0, total: 1850 },
      total: 4250,
    })
    b = mudarNotas(b, 2026, 10, { servicos: 1000 })
    b = mudarNotas(b, 2026, 10, { comercio: 9999 })
    const r = relatorioMensal(b, 2026, 10)
    expect(r.servicos).toEqual({ semNota: 850, comNota: 1000, total: 1850 })
    expect(r.comercio).toEqual({ semNota: 0, comNota: 2400, total: 2400 })
  })
})
