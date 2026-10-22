import type { TelaProps } from '../App'
import { brl } from '../core/relatorio'
import { MESES } from '../core/formato'
import { nomesPerfis, resumoTudo, titularDo } from '../core/pf'
import { BotaoOlho, Engrenagem, SeletorPerfil } from '../componentes/Perfil'
import { SeletorMes } from './InicioPf'
import { nomeMes, useMes } from './mes'

export default function InicioTudo({ banco, ir, perfil, mudarPerfil, oculto, alternarOlho }: TelaProps) {
  const [mes, setMes, meses] = useMes(banco)
  const ano = Number(mes.slice(0, 4))
  const t = resumoTudo(banco, ano, Number(mes.slice(5, 7)))
  const nomes = nomesPerfis(titularDo(banco))
  // Sobra dos meses anteriores, do mais antigo para o atual.
  const ultimos = meses.slice(0, 4).reverse().map((m) => {
    const r = resumoTudo(banco, Number(m.slice(0, 4)), Number(m.slice(5, 7)))
    return { mes: m, pj: r.pj.sobra, pf: r.pf.sobra, total: r.sobra }
  })
  const maior = Math.max(1, ...ultimos.map((u) => Math.abs(u.pj) + Math.abs(u.pf)))

  return (
    <main>
      <section className="faixa" aria-label="Resumo dos dois perfis">
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
        <p className="faixa-nota">Sobrou em {MESES[Number(mes.slice(5, 7)) - 1]}, somando tudo</p>
        <p className="faixa-grande mm-num">{brl(t.sobra)}</p>
        <p className="faixa-sub"><span className="sensivel">{brl(t.pj.sobra)}</span> no PJ · <span className="sensivel">{brl(t.pf.sobra)}</span> no PF</p>
        <svg className="faixa-onda" aria-hidden="true" viewBox="0 0 390 56" preserveAspectRatio="none"><path d="M0 56 V30 C 70 6, 150 6, 205 24 S 330 50, 390 18 V56 Z" /></svg>
      </section>

      <div className="conteudo">
        <section aria-labelledby="fluxo-t">
          <h2 id="fluxo-t">Como o dinheiro andou</h2>
          <div className="fluxo">
            <button className="fluxo-perfil" data-perfil="pj" onClick={() => mudarPerfil('pj')}>
              <b>{nomes.pj}</b>
              <dl>
                <div><dt>Faturou</dt><dd className="mm-num">{brl(t.pj.entradas)}</dd></div>
                <div><dt>Despesas e DAS</dt><dd className="mm-num">− {brl(t.pj.despesas)}</dd></div>
              </dl>
            </button>
            <div className="fluxo-passagem">
              <span aria-hidden="true">↓</span>
              <span>Pix de {nomes.pj} para {nomes.pf}</span>
              <b className="mm-num">{brl(t.pj.retiradas)}</b>
            </div>
            <button className="fluxo-perfil" data-perfil="pf" onClick={() => mudarPerfil('pf')}>
              <b>{nomes.pf}</b>
              <dl>
                <div><dt>Outras entradas</dt><dd className="mm-num">{brl(t.pf.outrasEntradas)}</dd></div>
                <div><dt>Gastos</dt><dd className="mm-num">− {brl(t.pf.gastos)}</dd></div>
              </dl>
            </button>
          </div>
          <p className="apoio">O Pix que sai do PJ para você entra no PF. Aqui ele aparece uma vez só, como passagem entre os perfis.</p>
        </section>

        <section aria-labelledby="sobra-t">
          <h2 id="sobra-t">Sobra dos últimos meses</h2>
          <ul className="sobra-meses">
            {ultimos.map((u) => (
              <li key={u.mes}>
                <span>{nomeMes(u.mes)}</span>
                <span className="sobra-barra" aria-hidden="true">
                  <i data-perfil="pj" style={{ width: `${(Math.abs(u.pj) / maior) * 100}%` }} />
                  <i data-perfil="pf" style={{ width: `${(Math.abs(u.pf) / maior) * 100}%` }} />
                </span>
                <b className="mm-num">{brl(u.total)}</b>
              </li>
            ))}
          </ul>
          <p className="sobra-legenda"><span><i data-perfil="pj" />no PJ</span><span><i data-perfil="pf" />no PF</span></p>
        </section>
      </div>
    </main>
  )
}
