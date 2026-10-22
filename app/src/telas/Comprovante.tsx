import { useState } from 'react'
import type { TelaProps } from '../App'
import { brl } from '../core/relatorio'
import { dataCurta, lerValor } from '../core/formato'
import {
  apagarComprovante, categorizarCompra, compraLigada, comprasPossiveis, comprimirImagem, comprovantes, formatarChave, formatarCnpj,
  guardarComprovante, lerDanfe, mascararDoc, novoId, urlSefaz, type Comprovante,
} from '../core/comprovantes'
import { nomesPerfis, titularDo } from '../core/pf'
import { extrairTexto } from '../core/parser'
import { Cabecalho } from '../componentes/Pecas'
import { Alternar, Categorias } from '../componentes/Perfil'

const ORIGEM = { nfce: 'Lido do QR code', pdf: 'Lido do PDF da nota', foto: 'Foto do comprovante', saude: 'Recibo' }

/** Lê um PDF (nota de loja online) ou uma foto e devolve o rascunho do comprovante. */
async function lerArquivo(arquivo: File, perfil: Comprovante['perfil']): Promise<Comprovante> {
  const base: Comprovante = { id: novoId(), tipo: 'foto', perfil, loja: '', data: '', valor: 0, criadoEm: new Date().toISOString() }
  if (arquivo.type === 'application/pdf' || arquivo.name.toLowerCase().endsWith('.pdf')) {
    const d = lerDanfe(await extrairTexto(await arquivo.arrayBuffer()))
    return {
      ...base, tipo: 'pdf', loja: d.loja ?? '', cnpj: d.cnpj, data: d.data ?? '', mes: d.chave?.mes, valor: d.valor ?? 0,
      chave: d.chave?.chave, itens: d.itens.length ? d.itens : undefined,
    }
  }
  return { ...base, imagem: await comprimirImagem(arquivo) }
}

export default function ComprovanteTela({ banco, mudar, ir, param, perfil }: TelaProps) {
  const existente = comprovantes(banco).find((c) => c.id === param)
  const [rascunho, setRascunho] = useState<Comprovante | null>(null)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState('')
  const [trocando, setTrocando] = useState(false)
  const [todosItens, setTodosItens] = useState(false)
  const c = existente ?? rascunho
  const nomes = nomesPerfis(titularDo(banco))
  const esconderDocs = !!banco.privacidade?.esconderDocs
  const voltar = () => ir('comprovantes')

  // Já salvo: cada mudança grava na hora. Rascunho: só ao tocar em Salvar.
  const alterar = (parte: Partial<Comprovante>) => {
    if (!c) return
    const novo = { ...c, ...parte }
    if (existente) mudar(categorizarCompra(guardarComprovante(banco, novo), novo))
    else setRascunho(novo)
  }

  if (!c) {
    return (
      <main className="conteudo topo">
        <Cabecalho titulo="Novo comprovante" sub="PDF da nota de uma loja online, ou foto de um cupom ou recibo. Fica só no celular." voltar={voltar} rotuloVoltar="Voltar para os comprovantes" empilhado />
        <label className="arquivo-grande">
          <input
            type="file"
            accept="application/pdf,.pdf,image/*"
            disabled={lendo}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setLendo(true)
              setErro('')
              try {
                setRascunho(await lerArquivo(f, perfil === 'pj' ? 'pj' : 'pf'))
              } catch {
                setErro('Não deu para ler esse arquivo. Tente outro PDF ou uma foto.')
              } finally {
                setLendo(false)
              }
            }}
          />
          <b>{lendo ? 'Lendo…' : 'Escolher PDF ou foto'}</b>
          <span>Do PDF saem loja, data, total e itens. Na foto você preenche.</span>
        </label>
        {erro && <p className="aviso perigo" role="alert">{erro}</p>}
      </main>
    )
  }

  const ligada = compraLigada(banco, c)
  const semEste = { ...banco, comprovantes: comprovantes(banco).filter((x) => x.id !== c.id) }
  const opcoes = comprasPossiveis(semEste, c)
  const itens = c.itens ?? []

  return (
    <main className="conteudo topo comprovante">
      <Cabecalho titulo="Comprovante" voltar={voltar} rotuloVoltar="Voltar para os comprovantes" />

      <section className="cupom" aria-label="Nota">
        <span className="rotulo">{ORIGEM[c.tipo]}{c.chave ? ` · Nº ${Number(c.chave.slice(25, 34)).toLocaleString('pt-BR')}` : ''}</span>
        {existente ? (
          <>
            <h2>{c.loja || 'Loja sem nome'}</h2>
            <p className="apoio">
              {c.data ? dataCurta(c.data) : 'Dia não informado'}
              {c.cnpj && <> · CNPJ <span className="sensivel">{esconderDocs ? mascararDoc(c.cnpj) : formatarCnpj(c.cnpj)}</span></>}
            </p>
          </>
        ) : (
          <div className="folha-campos">
            <label className="campo">Loja<input value={c.loja} onChange={(e) => alterar({ loja: e.target.value })} placeholder="Nome da loja" /></label>
            <label className="campo">Data<input type="date" value={c.data} onChange={(e) => alterar({ data: e.target.value })} /></label>
            <label className="campo">Valor<input inputMode="decimal" defaultValue={c.valor ? c.valor.toFixed(2).replace('.', ',') : ''} onChange={(e) => alterar({ valor: lerValor(e.target.value) || 0 })} placeholder="0,00" /></label>
          </div>
        )}
        {c.imagem && <img className="cupom-foto" src={c.imagem} alt="Foto do comprovante" />}
        {itens.length > 0 && (
          <ul className="cupom-itens">
            {(todosItens ? itens : itens.slice(0, 4)).map((i, n) => <li key={n}><span>{i.nome}</span><b className="mm-num">{brl(i.total)}</b></li>)}
          </ul>
        )}
        {itens.length > 4 && !todosItens && <button className="link" onClick={() => setTodosItens(true)}>Ver mais {itens.length - 4} itens</button>}
        {c.tipo === 'nfce' && !itens.length && <p className="apoio">Os itens do cupom só aparecem na página da SEFAZ. No app instalado eles virão sozinhos.</p>}
        <p className="cupom-total"><span>Total</span><b className="mm-num">{brl(c.valor)}</b></p>
      </section>

      <section aria-labelledby="compra-t">
        <h2 id="compra-t">Compra no extrato</h2>
        {ligada && !trocando ? (
          <div className="ligada">
            <span>
              <b>{ligada.descricao}</b>
              <span>{dataCurta(ligada.data)} · conta {ligada.perfil === 'pf' ? nomes.pf : nomes.pj} · <span className="mm-num">{brl(ligada.valor)}</span></span>
            </span>
            <button className="link" onClick={() => setTrocando(true)}>Trocar</button>
          </div>
        ) : opcoes.length === 0 ? (
          <p className="apoio">Nenhuma compra de {brl(c.valor)} perto dessa data. Ela aparece aqui quando você importar o extrato.</p>
        ) : (
          <ul className="lista-cartao">
            {opcoes.map((o) => (
              <li key={o.id}>
                <button onClick={() => { alterar({ movId: o.id, data: c.data || o.data }); setTrocando(false) }}>
                  <span className="movs-nome"><b>{o.descricao}</b><span>{dataCurta(o.data)} · {o.perfil === 'pf' ? nomes.pf : nomes.pj}</span></span>
                  <b className="mm-num">{brl(o.valor)}</b>
                </button>
              </li>
            ))}
            {ligada && <li><button onClick={() => { alterar({ movId: undefined }); setTrocando(false) }}><span className="movs-nome"><b>Não ligar a nenhuma</b></span></button></li>}
          </ul>
        )}
      </section>

      <section aria-labelledby="dono-t">
        <h2 id="dono-t">De quem foi a compra?</h2>
        <Alternar rotulo="De quem foi a compra" valor={c.perfil} mudar={(p) => alterar({ perfil: p })} opcoes={[{ id: 'pf', nome: nomes.pf }, { id: 'pj', nome: `${nomes.pj} · despesa` }]} />
        {c.perfil === 'pf' && <Categorias rotulo="Categoria" valor={c.categoria} mudar={(cat) => alterar({ categoria: cat })} />}
      </section>

      {c.chave && (
        <section aria-labelledby="chave-t">
          <h2 id="chave-t">Chave de acesso</h2>
          <p className="chave-acesso mm-num">{formatarChave(c.chave)}</p>
          {urlSefaz(c.url) && <a className="link" href={urlSefaz(c.url)} target="_blank" rel="noreferrer">Ver na SEFAZ</a>}
        </section>
      )}

      {existente ? (
        <button className="botao perigo" onClick={() => { if (confirm('Apagar este comprovante?')) { mudar(apagarComprovante(banco, c.id)); voltar() } }}>Apagar</button>
      ) : (
        <button className="principal" disabled={!c.valor} onClick={() => { const b = guardarComprovante(banco, c); mudar(categorizarCompra(b, comprovantes(b).find((x) => x.id === c.id)!)); ir('comprovante', c.id) }}>Salvar comprovante</button>
      )}
    </main>
  )
}
