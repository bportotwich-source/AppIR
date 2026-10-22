import type { TelaProps } from '../App'
import { brl } from '../core/relatorio'
import { dataCurta } from '../core/formato'
import { mesLongo, nomeMes, rotuloComprovante, useMes } from './mes'
import { carteiraPf, gruposSemCategoria, nomesPerfis, resumoPf, retiradasPj, titularDo } from '../core/pf'
import { comprovantes } from '../core/comprovantes'
import { BotaoOlho, Engrenagem, SeletorPerfil } from '../componentes/Perfil'
import Icone from '../componentes/Icone'

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

export default function InicioPf({ banco, ir, perfil, mudarPerfil, oculto, alternarOlho }: TelaProps) {
  const { SplitBar } = window.MeuMEI
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
  const usado = r.entradas > 0 ? Math.min(100, Math.round((r.gastos / r.entradas) * 100)) : 0
  const hoje = new Date()
  const ehAtual = mes === hoje.toLocaleDateString('sv-SE').slice(0, 7)
  const faltamDias = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate() - hoje.getDate()

  return (
    <main>
      <section className="faixa" aria-label="Resumo do mês">
        <div className="faixa-topo">
          <span className="marca">
            <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="10" fill="#2dd4bf" /><rect x="8" y="17" width="4" height="8" rx="2" fill="#0c2a27" /><rect x="14" y="12" width="4" height="13" rx="2" fill="#0c2a27" /><rect x="20" y="7" width="4" height="18" rx="2" fill="#0c2a27" /></svg>
            Meu MEI
          </span>
          <div className="faixa-acoes">
            <BotaoOlho oculto={oculto} alternar={alternarOlho} />
            <SeletorMes mes={mes} meses={meses} mudar={setMes} />
            <Engrenagem abrir={() => ir('ajustes')} />
          </div>
        </div>
        <SeletorPerfil perfil={perfil} mudar={mudarPerfil} titular={titularDo(banco)} />
        <p className="faixa-nota">Você gastou em {mesLongo(mes)}</p>
        <p className="faixa-grande mm-num">{brl(r.gastos)}</p>
        <p className="faixa-sub">de <span className="sensivel">{brl(r.entradas)}</span> que entraram · sobram <b className="sensivel">{brl(r.sobra)}</b></p>
        <div className="barra-uso" aria-hidden="true"><span style={{ width: `${usado}%` }} /></div>
        <p className="faixa-legenda"><span>{r.entradas > 0 ? `${usado}% do que entrou` : 'Nada entrou ainda'}</span>{ehAtual && <span>{faltamDias} {faltamDias === 1 ? 'dia' : 'dias'} para fechar o mês</span>}</p>
        <svg className="faixa-onda" aria-hidden="true" viewBox="0 0 390 56" preserveAspectRatio="none"><path d="M0 56 V30 C 70 6, 150 6, 205 24 S 330 50, 390 18 V56 Z" /></svg>
      </section>

      <div className="conteudo">
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
          <section>
            <div className="titulo-linha">
              <h2>Para onde foi</h2>
              <span>{mesLongo(mes)}</span>
            </div>
            <SplitBar items={r.porCategoria.map((c) => ({ label: c.nome, value: c.valor, color: c.cor }))} />
          </section>
        )}

        {grupos.length > 0 && (
          <button className="ticket" onClick={() => ir('revisar-pf')} aria-label={`${grupos.length} destinos sem categoria, ${brl(valorSem)}. Abrir revisão.`}>
            <span className="ticket-rostos ticket-etiqueta" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
            </span>
            <span className="ticket-corte" aria-hidden="true" />
            <span className="ticket-texto">
              <span className="rotulo">{grupos.length} sem categoria</span>
              <b>Gastos para separar</b>
              <span><span className="sensivel">{brl(valorSem)}</span> em {ano} ainda sem categoria</span>
            </span>
            <span className="ticket-seta" aria-hidden="true"><Icone nome="seta" tamanho={18} /></span>
          </button>
        )}

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
      </div>
    </main>
  )
}
