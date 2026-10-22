import { describe, expect, it } from 'vitest'
import { bancoVazio, importar, type Banco } from './banco'
import { parseCsv } from './arquivos'
import { marcarSaida, irpfDoAno } from './saidas'
import { totaisAno } from './relatorio'
import { categorizarPf, ehDoTitular, gruposSemCategoria, importarPf, paresPjPf, resumoPf, resumoTudo, separarRetiradasDoTitular } from './pf'
import { comprasPossiveis, guardarComprovante, lerChave, lerDanfe, lerQrNfce, mascararDoc, type Comprovante } from './comprovantes'
import { irpfPfDoAno, reciboCompleto } from './irpfPf'
import { chaveDescricao } from './banco'

const pj = (): Banco =>
  importar(bancoVazio(), [
    { data: '2026-10-03', descricao: 'Transferência recebida pelo Pix MARIA SOUZA', valor: 3500, tipo: 'entrada' },
    { data: '2026-10-05', descricao: 'Transferência enviada pelo Pix BRUNO SILVA PORTO - •••.123.456-•• - NU PAGAMENTOS', valor: 3000, tipo: 'saida' },
    { data: '2026-10-20', descricao: 'Pagamento de boleto efetuado DAS-SIMPLES NACIONAL', valor: 80.9, tipo: 'saida' },
    { data: '2026-10-12', descricao: 'Compra no débito KALUNGA', valor: 120, tipo: 'saida' },
  ], 'pj.ofx').banco

const contaPf = [
  { data: '2026-10-05', descricao: 'Transferência recebida pelo Pix BRUNO SILVA PORTO', valor: 3000, tipo: 'entrada' as const },
  { data: '2026-10-08', descricao: 'Transferência recebida pelo Pix ANA SOUZA', valor: 200, tipo: 'entrada' as const },
  { data: '2026-10-19', descricao: 'Compra no débito SUPERMERCADO BOM PRECO', valor: 312.48, tipo: 'saida' as const },
  { data: '2026-10-21', descricao: 'Pagamento de fatura', valor: 500, tipo: 'saida' as const },
  { data: '2026-10-22', descricao: 'Transferência enviada pelo Pix JOAO LIMA', valor: 100, tipo: 'saida' as const },
]

describe('perfil PF', () => {
  it('lê a fatura do cartão do Nubank com a compra positiva', () => {
    const movs = parseCsv('date,title,amount\n2026-10-10,Uber *Trip,23.50\n2026-10-11,Pagamento recebido,-500.00\n')
    expect(movs).toEqual([
      { data: '2026-10-10', descricao: 'Uber *Trip', valor: 23.5, tipo: 'saida' },
      { data: '2026-10-11', descricao: 'Pagamento recebido', valor: 500, tipo: 'entrada' },
    ])
  })

  it('importa a conta PF sem duplicar e sugere categoria pelo nome', () => {
    const r = importarPf(pj(), contaPf, 'conta', 'pf.csv')
    expect(r.novas).toBe(5)
    const deNovo = importarPf(r.banco, contaPf, 'conta', 'pf.ofx')
    expect(deNovo.novas).toBe(0)
    expect(r.banco.pf!.movimentacoes.find((m) => m.valor === 312.48)!.categoria).toBe('mercado')
    expect(r.semCategoria).toBe(2) // fatura e Pix para João
  })

  it('não muda nada da empresa', () => {
    const antes = pj()
    const depois = importarPf(antes, contaPf, 'conta').banco
    expect(totaisAno(depois, 2026)).toEqual(totaisAno(antes, 2026))
    expect(irpfDoAno(depois, 2026)).toEqual(irpfDoAno(antes, 2026))
    expect(depois.movimentacoes).toBe(antes.movimentacoes)
  })

  it('reconhece o titular na saída da PJ e marca como retirada', () => {
    expect(ehDoTitular('Transferência enviada pelo Pix BRUNO SILVA PORTO - •••.123.456-••', 'Bruno Porto')).toBe(true)
    expect(ehDoTitular('Transferência enviada pelo Pix BRUNO MARS', 'Bruno Porto')).toBe(false)
    const b = separarRetiradasDoTitular({ ...pj(), titular: 'Bruno Porto' })
    const r = b.movimentacoes.find((m) => m.valor === 3000)!
    expect(r.despesa).toBe(false)
    expect(b.movimentacoes.find((m) => m.valor === 120)!.despesa ?? null).toBe(null)
  })

  it('a retirada entra na PF uma vez só, com ou sem o extrato da PF', () => {
    const base = separarRetiradasDoTitular({ ...pj(), titular: 'Bruno Porto' })
    // Sem extrato da PF: a retirada aparece como entrada.
    expect(resumoPf(base, 2026, 10).entradas).toBe(3000)
    // Com o extrato: o Pix recebido vira par da retirada e não soma de novo.
    const b = importarPf(base, contaPf, 'conta').banco
    expect(paresPjPf(b).size).toBe(1)
    const r = resumoPf(b, 2026, 10)
    expect(r.retiradas).toBe(3000)
    expect(r.outrasEntradas).toBe(200)
    expect(r.gastos).toBeCloseTo(412.48) // pagamento de fatura não é gasto
    expect(r.sobra).toBeCloseTo(2787.52)
  })

  it('soma os dois perfis sem contar a passagem duas vezes', () => {
    const b = importarPf(separarRetiradasDoTitular({ ...pj(), titular: 'Bruno Porto' }), contaPf, 'conta').banco
    const t = resumoTudo(b, 2026, 10)
    expect(t.pj.entradas).toBe(3500)
    expect(t.pj.retiradas).toBe(3000)
    expect(t.pj.despesas).toBeCloseTo(200.9)
    // dinheiro que sobrou nas duas contas = entradas externas - gastos externos
    expect(t.sobra).toBeCloseTo(3500 + 200 - 200.9 - 412.48)
  })

  it('categoria escolhida vale para o mesmo destino e para as próximas', () => {
    let b = importarPf(pj(), contaPf, 'conta').banco
    expect(gruposSemCategoria(b, 2026).map((g) => g.nome)).toEqual(['JOAO LIMA'])
    b = categorizarPf(b, chaveDescricao('Transferência enviada pelo Pix JOAO LIMA'), 'casa')
    expect(gruposSemCategoria(b, 2026)).toEqual([])
    const r = importarPf(b, [{ data: '2026-11-22', descricao: 'Transferência enviada pelo Pix JOAO LIMA', valor: 100, tipo: 'saida' }], 'conta')
    expect(r.banco.pf!.movimentacoes.at(-1)!.categoria).toBe('casa')
  })

  it('marcar a saída PJ como despesa tira ela da PF', () => {
    let b = separarRetiradasDoTitular({ ...pj(), titular: 'Bruno Porto' })
    b = marcarSaida(b, chaveDescricao('Transferência enviada pelo Pix BRUNO SILVA PORTO'), true)
    expect(resumoPf(b, 2026, 10).retiradas).toBe(0)
  })
})

const CHAVE = '35261012345678000199650010000482111000048217'

describe('comprovantes', () => {
  it('lê a chave de acesso e confere o dígito', () => {
    expect(lerChave(CHAVE)).toMatchObject({ uf: 'SP', mes: '2026-10', cnpj: '12345678000199', modelo: '65', numero: 48211 })
    expect(lerChave(CHAVE.slice(0, 43) + '0')).toBeNull()
  })

  it('lê o QR code online e offline do cupom', () => {
    const online = lerQrNfce(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE}|2|1|1|ABCDEF0123`)
    expect(online).toMatchObject({ uf: 'SP', mes: '2026-10' })
    expect(online!.valor).toBeUndefined()
    const offline = lerQrNfce(`http://nfce.sefaz.pr.gov.br/nfce/qrcode?p=${CHAVE}|2|1|19|312.48|6a6b|1|ABCDEF`)
    expect(offline).toMatchObject({ dia: '2026-10-19', valor: 312.48 })
    expect(lerQrNfce('https://exemplo.com')).toBeNull()
  })

  it('lê loja, total e itens do PDF da nota', () => {
    const d = lerDanfe([
      'LOJA EXEMPLO COMERCIO LTDA',
      'CNPJ: 12.345.678/0001-99',
      'DATA DE EMISSÃO 14/10/2026',
      'FONE DE OUVIDO BLUETOOTH   1 UN   159,00   159,00',
      'VALOR TOTAL DA NOTA   159,00',
      'CHAVE DE ACESSO 3526 1012 3456 7800 0199 6500 1000 0482 1110 0004 8217',
    ])
    expect(d).toMatchObject({ loja: 'LOJA EXEMPLO COMERCIO LTDA', cnpj: '12345678000199', data: '2026-10-14', valor: 159 })
    expect(d.itens).toEqual([{ nome: 'FONE DE OUVIDO BLUETOOTH', total: 159 }])
    expect(d.chave?.chave).toBe(CHAVE)
  })

  it('liga o comprovante à compra certa do extrato', () => {
    const b = importarPf(pj(), contaPf, 'conta').banco
    const c: Comprovante = { id: 'c1', tipo: 'nfce', perfil: 'pf', loja: 'Bom Preço', data: '2026-10-19', valor: 312.48, criadoEm: '' }
    expect(comprasPossiveis(b, c)).toHaveLength(1)
    const g = guardarComprovante(b, c)
    expect(g.comprovantes![0].movId).toContain('pf|conta|2026-10-19')
    // a mesma compra não serve para outro comprovante
    expect(comprasPossiveis(g, c)).toHaveLength(0)
    // sem o dia, usa o mês da chave
    expect(comprasPossiveis(b, { ...c, data: '', mes: '2026-10' })).toHaveLength(1)
  })

  it('esconde CPF e CNPJ deixando o fim', () => {
    expect(mascararDoc('12.345.678/0001-99')).toBe('••.•••.•••/0001-99')
    expect(mascararDoc('123.456.789-09')).toBe('•••.•••.789-09')
  })
})

describe('IRPF da pessoa física', () => {
  const recibo = (id: string, valor: number, tipo: string, doc: string, paciente = 'Bruno'): Comprovante => ({
    id, tipo: 'saude', perfil: 'pf', loja: 'X', data: '2026-03-10', valor, criadoEm: '', saude: { tipo, prestador: 'Dr. X', doc, paciente },
  })

  it('soma saúde completa, separa pendentes e limita educação por pessoa', () => {
    const b: Banco = {
      ...bancoVazio(),
      comprovantes: [
        recibo('a', 350, 'Dentista', '12.345.678/0001-99'),
        recibo('b', 240, 'Consulta médica', ''),
        recibo('c', 3000, 'Escola ou faculdade', '12.345.678/0001-99'),
        recibo('d', 1000, 'Escola ou faculdade', '12.345.678/0001-99'),
      ],
    }
    const r = irpfPfDoAno(b, 2026)
    expect(r.totalSaude).toBe(350)
    expect(r.pendentes.map((c) => c.id)).toEqual(['b'])
    expect(r.educacaoBruta).toBe(4000)
    expect(r.totalEducacao).toBe(3561.5)
    expect(reciboCompleto(recibo('e', 10, 'Exames', '123.456.789-09'))).toBe(true)
  })

  it('farmácia fica de fora e aparece só como aviso', () => {
    const b = importarPf(bancoVazio(), [{ data: '2026-10-17', descricao: 'Compra no débito DROGARIA SAO PAULO', valor: 89.9, tipo: 'saida' }], 'conta').banco
    const r = irpfPfDoAno(b, 2026)
    expect(r.farmacia).toBe(89.9)
    expect(r.totalSaude).toBe(0)
  })
})
