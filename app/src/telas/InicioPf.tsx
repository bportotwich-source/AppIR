import type { TelaProps } from '../App'
import { brl } from '../core/relatorio'
import { dataCurta } from '../core/formato'
import { mesLongo, nomeMes, rotuloComprovante, useMes } from './mes'
import { carteiraPf, gruposSemCategoria, maioresGastos, mesesPf, nomeCategoria, nomesPerfis, resumoPf, retiradasPj, titularDo } from '../core/pf'
import { comprovantes } from '../core/comprovantes'
import { irpfPfDoAno } from '../core/irpfPf'
import { CirculosResumo, TopoInicio } from '../componentes/Perfil'
import { LembretesAparelho } from '../componentes/Lembretes'
import Icone from '../componentes/Icone'
import { Recibo } from '../componentes/Pecas'
import ListaMaiores from '../componentes/ListaMaiores'

export function SeletorMes({ mes, meses, mudar }: { mes: string; meses: string[]; mudar: (m: string) => void }) {
  return (
    <>
      <label className="so-leitor" htmlFor="mes">Mês</label>
      <select id="mes" value={mes} onChange={(e) => mudar(e.target.value)}>
        {meses.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
      </select>
    </>
  )
}

export default function InicioPf({ banco, mudar, ir, perfil, mudarPerfil, oculto, alternarOlho, dadosProtegidos, instalar }: TelaProps) {
  const [mes, setMes, meses] = useMes(banco)
  const ano = Number(mes.slice(0, 4))
  const m = Number(mes.slice(5, 7))
  const r = resumoPf(banco, ano, m)
  const nomes = nomesPerfis(titularDo(banco))
  const pf = carteiraPf(banco)
  const temPf = pf.movimentacoes.length > 0
  const retiradas = retiradasPj(banco, ano, m)
  const grupos = gruposSemCategoria(banco, ano)
  const valorSem = grupos.reduce((s, g) => s + g.valor, 0)
  const ultimos = [...comprovantes(banco)].filter((c) => c.perfil === 'pf' && c.tipo !== 'saude').sort((a, b) => (b.data || b.criadoEm).localeCompare(a.data || a.criadoEm)).slice(0, 3)
  const totalCategorias = r.porCategoria.reduce((soma, c) => soma + c.valor, 0)
  const hoje = new Date()
  const ehAtual = mes === hoje.toLocaleDateString('sv-SE').slice(0, 7)
  const faltamDias = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate() - hoje.getDate()
  const historico = mesesPf(banco, mes)
  const anterior = historico[historico.length - 2]
  const diferenca = r.gastos - anterior.gastos
  const maximo = Math.max(1, ...historico.flatMap((h) => [h.entradas, h.gastos]))
  const maiores = maioresGastos(banco, ano, m)
  const irpf = irpfPfDoAno(banco, ano)
  const abate = irpf.totalSaude + irpf.totalEducacao

  return (
    <main className="conteudo inicio">
      <TopoInicio perfil={perfil} mudarPerfil={mudarPerfil} titular={titularDo(banco)} oculto={oculto} alternarOlho={alternarOlho} abrirAjustes={() => ir('ajustes')} />

      <div>
        <div className="inicio-titulo">
          <h1>{ehAtual ? 'Seu mês até aqui' : `Seu mês de ${mesLongo(mes)}`}</h1>
          <SeletorMes mes={mes} meses={meses} mudar={setMes} />
        </div>
        <p className="apoio">{ehAtual ? `${faltamDias} ${faltamDias === 1 ? 'dia' : 'dias'} para fechar o mês` : 'Mês fechado'}</p>
      </div>

      <section className="resumo" aria-label="Resumo do mês">
        <CirculosResumo />
        <span className="rotulo">Gasto em {mesLongo(mes)}</span>
        <p className="faixa-grande mm-num">{brl(r.gastos)}</p>
        <ul className="resumo-linhas">
          <li className="linha-ponto"><i aria-hidden="true" style={{ background: '#2dd4bf' }} />Entrou<span className="pont" aria-hidden="true" /><b className="sensivel">{brl(r.entradas)}</b></li>
          <li className="linha-ponto"><i aria-hidden="true" style={{ background: r.sobra < 0 ? '#fca5a5' : '#a5b4fc' }} />Sobra<span className="pont" aria-hidden="true" /><b className="sensivel" data-negativo={r.sobra < 0}>{brl(r.sobra)}</b></li>
        </ul>
      </section>

      {anterior.gastos > 0 && Math.abs(diferenca) >= 1 && (
        <p className="tendencia" data-subiu={diferenca > 0}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{diferenca > 0 ? <><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></> : <><path d="M3 7l6 6 4-4 8 8" /><path d="M14 17h7v-7" /></>}</svg>
          <span><b className="sensivel">{brl(Math.abs(diferenca))}</b> {diferenca > 0 ? 'a mais' : 'a menos'} que em {mesLongo(anterior.mes)}.</span>
        </p>
      )}

      {!temPf && (
        <section>
          <h2>Comece pela conta pessoal</h2>
          <p>Importe o extrato da sua conta ou a fatura do cartão em OFX, CSV ou PDF. Fica só no celular, separado da empresa.</p>
          <button className="principal" onClick={() => ir('importar')}>Importar extrato pessoal</button>
        </section>
      )}

      {!titularDo(banco) && (
        <section className="lembrete">
          <b>Qual é o seu nome?</b>
          <span>Com ele, o Pix que sai de {nomes.pj} para você entra aqui sozinho.</span>
          <button className="principal" onClick={() => ir('ajustes')}>Abrir Ajustes</button>
        </section>
      )}

      {grupos.length > 0 && (
        <button className="aviso-link" onClick={() => ir('revisar-pf')}>
          <span className="aviso-marca" aria-hidden="true">!</span>
          <span>
            <b>{grupos.length} {grupos.length === 1 ? 'gasto sem categoria' : 'gastos sem categoria'}</b>
            <span><span className="mm-num">{brl(valorSem)}</span> de {ano} para separar</span>
          </span>
          <Icone nome="seta" tamanho={18} />
        </button>
      )}

      {r.retiradas > 0 && (
        <button className="passagem" data-de="pj" onClick={() => mudarPerfil('pj')}>
          <span className="passagem-icone" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h14" /><path d="m13 6 6 6-6 6" /></svg></span>
          <span>
            <b><span className="sensivel">{brl(r.retiradas)}</span> vindos de {nomes.pj}</b>
            <span>{retiradas.length === 1 ? `Pix de ${dataCurta(retiradas[0].data)}` : `${retiradas.length} Pix no mês`}. Entrou aqui sozinho, sem contar duas vezes. Toque para abrir {nomes.pj}.</span>
          </span>
        </button>
      )}

      {r.porCategoria.length > 0 && (
        <Recibo rotulo="Para onde foi" className="para-onde">
          <span className="etiqueta">Para onde foi</span>
          <h2>{mesLongo(mes)[0].toUpperCase() + mesLongo(mes).slice(1)}</h2>
          <ul>
            {r.porCategoria.map((c) => (
              <li key={c.id} className="linha-ponto">
                <i aria-hidden="true" style={{ background: c.cor }} />
                <span>{c.nome}</span>
                <span className="pont" aria-hidden="true" />
                <b className="sensivel">{brl(c.valor)}</b>
                <small>{totalCategorias > 0 ? Math.round((c.valor / totalCategorias) * 100) : 0}%</small>
              </li>
            ))}
          </ul>
          <div className="para-onde-total"><span>Total do mês</span><b className="sensivel">{brl(totalCategorias)}</b></div>
        </Recibo>
      )}

      {maiores.length > 0 && (
        <section aria-labelledby="maiores-t">
          <div className="titulo-linha">
            <h2 id="maiores-t">Onde mais gastou</h2>
            <span>{mesLongo(mes)}</span>
          </div>
          <div className="cartao">
            <ListaMaiores itens={maiores.map((g) => ({ nome: g.nome, detalhe: `${nomeCategoria(g.categoria)}${g.quantas > 1 ? ` · ${g.quantas} vezes` : ''}`, valor: g.valor }))} />
          </div>
        </section>
      )}

      {temPf && (
        <section aria-labelledby="meses-t">
          <div className="titulo-linha">
            <h2 id="meses-t">Mês a mês</h2>
            <span className="legenda-pf"><i data-s="entrou" />Entrou <i data-s="gastou" />Gastou</span>
          </div>
          <div className="meses-pf" role="group" aria-label="Entradas e gastos dos últimos meses">
            {historico.map((h) => (
              <button key={h.mes} aria-pressed={h.mes === mes} disabled={!meses.includes(h.mes)} onClick={() => setMes(h.mes)}
                aria-label={`${mesLongo(h.mes)}: entrou ${brl(h.entradas)}, gastou ${brl(h.gastos)}`}>
                <span className="barras" aria-hidden="true">
                  <i data-s="entrou" style={{ height: `${(h.entradas / maximo) * 100}%` }} />
                  <i data-s="gastou" style={{ height: `${(h.gastos / maximo) * 100}%` }} />
                </span>
                <span>{mesLongo(h.mes).slice(0, 3)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {r.porBanco.length > 1 && (
        <section aria-labelledby="bancos-t">
          <div className="titulo-linha">
            <h2 id="bancos-t">Por banco</h2>
            <span>{mesLongo(mes)}</span>
          </div>
          <ul className="por-banco">
            {r.porBanco.map((b) => (
              <li key={b.id}>
                <span><i aria-hidden="true" style={{ background: b.cor }} />{b.nome}</span>
                <b className="mm-num">{brl(b.gastos)}</b>
              </li>
            ))}
          </ul>
          {r.entreContas > 0 && <p className="apoio"><span className="sensivel">{brl(r.entreContas)}</span> passaram de uma conta sua para a outra. Não contam como gasto nem como entrada.</p>}
        </section>
      )}

      <button className="passagem" data-de="ir" onClick={() => ir('irpf')}>
        <span className="passagem-icone" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></svg></span>
        <span>
          <b>Imposto de Renda {ano + 1}</b>
          <span>
            {abate > 0 ? <><span className="sensivel">{brl(abate)}</span> em recibos que abatem.</> : 'Nenhum recibo de saúde ou escola ainda.'}
            {irpf.pendentes.length > 0 ? ` ${irpf.pendentes.length} ${irpf.pendentes.length === 1 ? 'recibo precisa' : 'recibos precisam'} de dado.` : ' Toque para ver o que vai na declaração.'}
          </span>
        </span>
      </button>

      <section>
        <div className="titulo-linha">
          <h2>Últimos comprovantes</h2>
          {ultimos.length > 0 && <button className="link" onClick={() => ir('comprovantes')}>Ver todos</button>}
        </div>
        {ultimos.length === 0 ? (
          <p className="apoio">Leia o QR code de um cupom pelo botão + e ele aparece aqui, ligado à compra do extrato.</p>
        ) : (
          <ul className="lista-cartao">
            {ultimos.map((c) => (
              <li key={c.id}>
                <button onClick={() => ir('comprovante', c.id)}>
                  <span className="sigla" data-tipo={c.tipo} aria-hidden="true">{c.loja.slice(0, 2).toUpperCase()}</span>
                  <span className="movs-nome"><b>{c.loja}</b><span>{rotuloComprovante(c)}</span></span>
                  <b className="mm-num">{brl(c.valor)}</b>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LembretesAparelho banco={banco} mudar={mudar} dadosProtegidos={dadosProtegidos} instalar={instalar} comDados={temPf} />
    </main>
  )
}
