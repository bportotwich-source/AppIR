import { useMemo, useState } from 'react'
import type { TelaProps } from '../App'
import { chaveDescricao, corrigirEntrada, esquecerRegra, type Banco, type Categoria, type Registro } from '../core/banco'
import { dataCurta, MESES, pagador } from '../core/formato'
import { brl } from '../core/relatorio'
import { corrigirSaida, despesa, ehDas, esquecerRegraSaida } from '../core/saidas'
import { Cabecalho } from '../componentes/Pecas'
import Folha from '../componentes/Folha'

const maiuscula = (s: string) => s[0].toUpperCase() + s.slice(1)
const semAcento = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()

type Filtro = 'todas' | 'entradas' | 'saidas' | 'revisar'
const FILTROS: { id: Filtro; nome: string }[] = [
  { id: 'todas', nome: 'Todas' },
  { id: 'entradas', nome: 'Entradas' },
  { id: 'saidas', nome: 'Saídas' },
  { id: 'revisar', nome: 'A revisar' },
]

type Marca = 'servicos' | 'comercio' | 'fora' | 'revisar' | 'despesa' | 'retirada' | 'separar' | 'das'
const NOME_MARCA: Record<Marca, string> = {
  servicos: 'Serviços', comercio: 'Comércio', fora: 'Fora do faturamento', revisar: 'A revisar',
  despesa: 'Despesa', retirada: 'Retirada', separar: 'A separar', das: 'DAS',
}

function marca(r: Registro): Marca {
  if (r.tipo === 'saida') {
    if (ehDas(r)) return 'das'
    const d = despesa(r)
    return d === null ? 'separar' : d ? 'despesa' : 'retirada'
  }
  if (r.faturamento === null || (r.faturamento && r.categoria === null)) return 'revisar'
  return r.faturamento ? (r.categoria as Categoria) : 'fora'
}

const pendente = (m: Marca) => m === 'revisar' || m === 'separar'

/** Todas as movimentações do ano, com busca, filtro e correção, e os pagadores lembrados. */
export default function Movimentacoes({ banco, ano, mudar, ir, pagadores }: TelaProps & { pagadores?: boolean }) {
  const [aba, setAba] = useState<'lista' | 'pagadores'>(pagadores ? 'pagadores' : 'lista')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [mes, setMes] = useState(0) // 0 = ano todo
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Registro | null>(null)

  const doAno = useMemo(
    () => banco.movimentacoes.filter((r) => r.data.startsWith(`${ano}-`)).sort((a, b) => b.data.localeCompare(a.data)),
    [banco.movimentacoes, ano],
  )
  const meses = [...new Set(doAno.map((r) => Number(r.data.slice(5, 7))))].sort((a, b) => b - a)
  const termo = semAcento(busca.trim())
  const lista = doAno.filter((r) => {
    if (mes && Number(r.data.slice(5, 7)) !== mes) return false
    if (filtro === 'entradas' && r.tipo !== 'entrada') return false
    if (filtro === 'saidas' && r.tipo !== 'saida') return false
    if (filtro === 'revisar' && !pendente(marca(r))) return false
    if (!termo) return true
    return semAcento(r.descricao).includes(termo) || brl(r.valor).includes(termo) || r.valor.toFixed(2).includes(termo.replace(',', '.'))
  })
  const porMes = new Map<number, Registro[]>()
  for (const r of lista) {
    const m = Number(r.data.slice(5, 7))
    porMes.set(m, [...(porMes.get(m) ?? []), r])
  }

  return (
    <main className="conteudo topo movs">
      <Cabecalho titulo={`Movimentações de ${ano}`} sub="Toque numa movimentação para corrigir a marcação." voltar={() => ir('extratos')} rotuloVoltar="Voltar para os extratos" empilhado />

      <div className="movs-abas" role="tablist" aria-label="O que mostrar">
        <button role="tab" aria-selected={aba === 'lista'} onClick={() => setAba('lista')}>Movimentações</button>
        <button role="tab" aria-selected={aba === 'pagadores'} onClick={() => setAba('pagadores')}>Pagadores lembrados</button>
      </div>

      {aba === 'lista' ? (
        <>
          <div className="movs-filtros">
            <label className="movs-busca">
              <span className="so-leitor">Buscar</span>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input type="search" placeholder="Buscar pagador ou valor" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </label>
            <div className="graficos" role="radiogroup" aria-label="Tipo">
              {FILTROS.map((f) => (
                <button key={f.id} role="radio" aria-checked={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.nome}</button>
              ))}
            </div>
            {meses.length > 1 && (
              <div className="graficos" role="radiogroup" aria-label="Mês">
                <button role="radio" aria-checked={mes === 0} onClick={() => setMes(0)}>Ano todo</button>
                {meses.map((m) => (
                  <button key={m} role="radio" aria-checked={mes === m} onClick={() => setMes(m)}>{maiuscula(MESES[m - 1])}</button>
                ))}
              </div>
            )}
          </div>

          <p className="movs-resumo" aria-live="polite">
            {lista.length === 0 ? (doAno.length === 0 ? `Nenhum extrato de ${ano} ainda.` : 'Nada encontrado com esses filtros.') : `${lista.length} ${lista.length === 1 ? 'movimentação' : 'movimentações'}`}
          </p>

          {[...porMes.entries()].map(([m, itens]) => (
            <section key={m} aria-labelledby={`movs-m${m}`} className="movs-mes">
              <h2 id={`movs-m${m}`}>{maiuscula(MESES[m - 1])}</h2>
              <ul>
                {itens.map((r) => {
                  const k = marca(r)
                  const p = pagador(r.descricao)
                  return (
                    <li key={r.id}>
                      <button type="button" onClick={() => setEditando(r)} aria-label={`${p.nome}, ${dataCurta(r.data)}, ${r.tipo === 'saida' ? 'saída de' : 'entrada de'} ${brl(r.valor)}, ${NOME_MARCA[k]}. Corrigir`}>
                        <span className="movs-nome">
                          <b>{p.nome}</b>
                          <span>{dataCurta(r.data)} · {p.operacao === 'Entrada' ? (r.tipo === 'saida' ? 'Saída' : 'Entrada') : p.operacao}</span>
                        </span>
                        <span className="movs-valor">
                          <b className="mm-num" data-tipo={r.tipo}>{r.tipo === 'saida' ? '− ' : '+ '}{brl(r.valor)}</b>
                          <span className="movs-marca" data-marca={k}>{NOME_MARCA[k]}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </>
      ) : (
        <Pagadores banco={banco} mudar={mudar} />
      )}

      {editando && (
        <FolhaCorrigir
          registro={editando}
          banco={banco}
          fechar={() => setEditando(null)}
          salvar={(novo) => { mudar(novo); setEditando(null) }}
        />
      )}
    </main>
  )
}

type Opcao = { id: string; nome: string; sub: string }
const OPCOES_ENTRADA: Opcao[] = [
  { id: 'servicos', nome: 'Serviços', sub: 'Faturamento de prestação de serviço' },
  { id: 'comercio', nome: 'Comércio', sub: 'Faturamento de venda de mercadoria' },
  { id: 'fora', nome: 'Fora do faturamento', sub: 'Dinheiro seu, empréstimo, estorno' },
  { id: 'revisar', nome: 'Voltar para a revisão', sub: 'Decido depois no Revisar' },
]
const OPCOES_SAIDA: Opcao[] = [
  { id: 'despesa', nome: 'Despesa da empresa', sub: 'Material, ferramenta, internet, imposto' },
  { id: 'retirada', nome: 'Retirada', sub: 'Pix para você e gastos da casa' },
  { id: 'separar', nome: 'Separar depois', sub: 'Fica fora da conta do Imposto de Renda' },
]

function FolhaCorrigir({ registro: r, banco, fechar, salvar }: { registro: Registro; banco: Banco; fechar: () => void; salvar: (b: Banco) => void }) {
  const atual = marca(r)
  const [escolha, setEscolha] = useState<string>(atual)
  const chave = chaveDescricao(r.descricao)
  const outras = banco.movimentacoes.filter((o) => o.id !== r.id && o.tipo === r.tipo && chaveDescricao(o.descricao) === chave).length
  const [todas, setTodas] = useState(outras > 0)
  const p = pagador(r.descricao)
  const opcoes = r.tipo === 'saida' ? OPCOES_SAIDA : OPCOES_ENTRADA
  const das = ehDas(r)

  function enviar() {
    if (r.tipo === 'saida') {
      salvar(corrigirSaida(banco, r.id, escolha === 'separar' ? null : escolha === 'despesa', todas))
    } else if (escolha === 'revisar') {
      salvar(corrigirEntrada(banco, r.id, null, null, todas))
    } else {
      salvar(corrigirEntrada(banco, r.id, escolha !== 'fora', escolha === 'fora' ? null : (escolha as Categoria), todas))
    }
  }

  return (
    <Folha etiqueta={`${dataCurta(r.data)} · ${brl(r.valor)}`} titulo={p.nome} fechar={fechar} enviar={das ? undefined : enviar}>
      {(fecharFolha) => das ? (
        <>
          <p className="folha-texto">Pagamento do DAS. Ele sempre conta como despesa da empresa e é conferido no DAS do ano, no Início.</p>
          <div className="folha-acoes"><button type="button" className="principal" onClick={fecharFolha}>Entendi</button></div>
        </>
      ) : (
        <>
          <p className="folha-texto">{p.operacao === 'Entrada' ? r.descricao : `${p.operacao}. ${r.tipo === 'saida' ? 'Saída' : 'Entrada'} de ${brl(r.valor)}.`}</p>
          <fieldset className="folha-opcoes">
            <legend className="so-leitor">Marcação</legend>
            {opcoes.map((o) => (
              <label key={o.id} data-marcada={escolha === o.id}>
                <input type="radio" name="marcacao" value={o.id} checked={escolha === o.id} onChange={() => setEscolha(o.id)} />
                <span><b>{o.nome}</b><span>{o.sub}</span></span>
              </label>
            ))}
          </fieldset>
          <button type="button" role="switch" aria-checked={todas} className="chave-lembrar" onClick={() => setTodas(!todas)}>
            <span>
              <b>{r.tipo === 'saida' ? 'Todas para este destino' : 'Todas deste pagador'}</b>
              <span>{outras > 0 ? `Muda também as outras ${outras} e as próximas` : 'Vale para as próximas'}</span>
            </span>
            <span className="chave-trilho" aria-hidden="true"><span /></span>
          </button>
          <div className="folha-acoes">
            <button type="submit" className="principal" disabled={escolha === atual && !todas}>Salvar</button>
            <button type="button" className="folha-cancelar" onClick={fecharFolha}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function Pagadores({ banco, mudar }: { banco: Banco; mudar: (b: Banco) => void }) {
  // Nome legível de cada chave, tirado de uma movimentação dela.
  const nomes = new Map<string, string>()
  for (const r of banco.movimentacoes) {
    const k = chaveDescricao(r.descricao)
    if (!nomes.has(k)) nomes.set(k, pagador(r.descricao).nome)
  }
  const entradas = Object.entries(banco.regras).map(([k, v]) => ({
    k, nome: nomes.get(k) ?? k, marca: (v.faturamento ? v.categoria ?? 'revisar' : 'fora') as Marca,
  }))
  const saidas = Object.entries(banco.regrasSaida ?? {}).map(([k, v]) => ({ k, nome: nomes.get(k) ?? k, marca: (v ? 'despesa' : 'retirada') as Marca }))
  const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, 'pt-BR')

  const grupo = (titulo: string, itens: typeof entradas, esquecer: (k: string) => Banco, vazio: string) => (
    <section aria-label={titulo} className="movs-mes">
      <h2>{titulo}</h2>
      {itens.length === 0 ? <p className="apoio">{vazio}</p> : (
        <ul>
          {itens.sort(porNome).map((i) => (
            <li key={i.k} className="pagador">
              <span className="movs-nome"><b>{i.nome}</b><span className="movs-marca" data-marca={i.marca}>{NOME_MARCA[i.marca]}</span></span>
              <button type="button" className="esquecer" aria-label={`Esquecer ${i.nome}`} onClick={() => mudar(esquecer(i.k))}>Esquecer</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  return (
    <>
      <p className="apoio">O app marca sozinho os próximos Pix destes pagadores. Esquecer não muda o que já foi marcado: só faz o próximo Pix voltar para a revisão.</p>
      {grupo('Entradas', entradas, (k) => esquecerRegra(banco, k), 'Nenhum pagador lembrado ainda.')}
      {grupo('Saídas', saidas, (k) => esquecerRegraSaida(banco, k), 'Nenhum destino de saída lembrado ainda.')}
    </>
  )
}
