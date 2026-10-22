import { useState } from 'react'
import type { TelaProps } from '../App'
import { MESES } from '../core/formato'
import { alerta, brl, limiteDoAno, pendentes, total, totaisAno } from '../core/relatorio'
import { Cabecalho, Pontilhado, Recibo } from '../componentes/Pecas'
import { dasDoAno, irpfDoAno, irpfPorMes, PRESUNCAO } from '../core/saidas'
import { declaracaoDo, desfazerEntrega, entregar, hojeIso, mudarDeclaracao } from '../core/declaracao'
import Folha from '../componentes/Folha'
import { SeletorPerfil } from '../componentes/Perfil'
import { titularDo } from '../core/pf'

const DIA_MS = 86_400_000

function Passo({ ok, titulo, children }: { ok: boolean; titulo: string; children: React.ReactNode }) {
  return (
    <li>
      <span className="passo-marca" data-ok={ok} aria-hidden="true">
        {ok ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg> : '!'}
      </span>
      <div>
        <span className="passo-titulo">{titulo}</span>
        {children}
      </div>
    </li>
  )
}

export default function Declaracao({ banco, ano, mudar, ir, perfil, mudarPerfil }: TelaProps) {
  const { CountdownRing, AnimatedNumber } = window.MeuMEI
  const decl = declaracaoDo(banco, ano)
  const empregado = decl.empregado ?? false
  const setEmpregado = (v: boolean) => mudar(mudarDeclaracao(banco, ano, { empregado: v }))
  const [entregando, setEntregando] = useState(false)
  const dataBr = (iso: string) => iso.split('-').reverse().join('/')
  const [copiado, setCopiado] = useState(false)
  const t = totaisAno(banco, ano)
  const nPendentes = pendentes(banco, ano)
  const meses = new Set(banco.movimentacoes.filter((r) => r.data.startsWith(`${ano}-`)).map((r) => Number(r.data.slice(5, 7))))
  const ultimo = meses.size ? Math.max(...meses) : 0
  const faltam = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => !meses.has(m))
  const limite = limiteDoAno(banco, ano)
  const aviso = alerta(total(t), limite)
  const dentro = total(t) <= limite
  const prazo = new Date(ano + 1, 4, 31)
  const hoje = new Date()
  const dias = Math.max(0, Math.round((Date.UTC(ano + 1, 4, 31) - Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / DIA_MS))

  const texto =
    `DASN-SIMEI ${ano}\n` +
    `Comércio e indústria: ${brl(t.comercio)}\n` +
    `Prestação de serviços: ${brl(t.servicos)}\n` +
    `Receita bruta total: ${brl(total(t))}\n` +
    `Teve empregado: ${empregado ? 'Sim' : 'Não'}`

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      // sem área de transferência: o botão continua como estava
    }
  }

  const renda = irpfDoAno(banco, ano)
  const rendaMeses = irpfPorMes(banco, ano).map((r, i) => ({ ...r, mes: i + 1 })).filter((r) => r.receita > 0 || r.despesas > 0)
  const dasAbertos = dasDoAno(banco, ano).filter((m) => m.estado === 'atrasado').map((m) => MESES[m.mes - 1])
  const juntar = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}` : l[0])

  const listaFaltam = faltam.map((m) => MESES[m - 1])
  const faltamTexto = listaFaltam.length > 1 ? `${listaFaltam.slice(0, -1).join(', ')} e ${listaFaltam[listaFaltam.length - 1]}` : listaFaltam[0]

  return (
    <main className="conteudo topo declaracao">
      <Cabecalho titulo="Declaração anual" voltar={() => ir('inicio')} />
      <SeletorPerfil claro perfil={perfil} mudar={mudarPerfil} titular={titularDo(banco)} />

      <section aria-label="Prazo" className="prazo-dasn">
        <CountdownRing value={dias} max={365} label="dias" sub={`até ${prazo.toLocaleDateString('pt-BR')}`} size={124} />
        <div>
          <span className="rotulo">Prazo da DASN-SIMEI</span>
          <strong>31 de maio de {ano + 1}</strong>
          <span>{decl.entregueEm ? `Entregue em ${dataBr(decl.entregueEm)}.` : 'A entrega abre em 1º de janeiro. É obrigatória mesmo sem faturamento.'}</span>
        </div>
      </section>

      <Recibo rotulo={`Prévia da DASN-SIMEI ${ano}`} className="sobe">
        <span className="carimbo">PRÉVIA</span>
        <span className="etiqueta">DASN-SIMEI</span>
        <h2>Ano-calendário {ano}</h2>
        <p className="nota">{ultimo ? `Atualizado até ${MESES[ultimo - 1]} · ${meses.size} de 12 meses` : 'Nenhum extrato importado ainda'}</p>
        <div className="tracejado" aria-hidden="true" />

        <dl className="linhas-dasn">
          <div className="pontilhado">
            <dt><i style={{ background: '#6366f1' }} aria-hidden="true" />Comércio e indústria</dt><span aria-hidden="true" /><dd className="mm-num">{brl(t.comercio)}</dd>
            <dd className="sub">Inclui transporte intermunicipal, se houver</dd>
          </div>
          <div className="pontilhado">
            <dt><i style={{ background: '#0d9488' }} aria-hidden="true" />Prestação de serviços</dt><span aria-hidden="true" /><dd className="mm-num">{brl(t.servicos)}</dd>
            <dd className="sub">Soma das entradas marcadas como Serviços</dd>
          </div>
        </dl>

        <div className="linha-dupla" aria-hidden="true" />
        <div className="total-dasn">
          <span>Receita bruta total</span>
          <AnimatedNumber value={total(t)} duration={1200} className="total-dasn-valor" />
        </div>

        <div className="tracejado" aria-hidden="true" />

        <div className="empregado">
          <span>Teve empregado no ano?</span>
          <div role="group" aria-label="Teve empregado no ano">
            <button type="button" aria-pressed={!empregado} onClick={() => { setEmpregado(false); setCopiado(false) }}>Não</button>
            <button type="button" aria-pressed={empregado} onClick={() => { setEmpregado(true); setCopiado(false) }}>Sim</button>
          </div>
        </div>

        <div className="acoes-dasn">
          <button type="button" className="copiar" data-copiado={copiado} onClick={copiar}>
            {copiado
              ? <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
              : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>}
            <span aria-live="polite">{copiado ? 'Valores copiados' : 'Copiar valores'}</span>
          </button>
          <a className="portal" href="https://www8.receita.fazenda.gov.br/SimplesNacional/" target="_blank" rel="noreferrer">
            Abrir Portal do Simples Nacional
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M9 7h8v8" /></svg>
          </a>
        </div>
      </Recibo>

      <section aria-labelledby="entrega-t" className="entrega">
        <h2 id="entrega-t" className="so-leitor">Entrega</h2>
        {decl.entregueEm ? (
          <div className="entrega-ok">
            <span className="passo-marca" data-ok="true" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
            <div>
              <b>DASN-SIMEI {ano} entregue</b>
              <span>Em {dataBr(decl.entregueEm)}{decl.recibo ? ` · recibo ${decl.recibo}` : ''}</span>
            </div>
            <button className="link" onClick={() => mudar(desfazerEntrega(banco, ano))}>Desfazer</button>
          </div>
        ) : (
          <button className="principal" onClick={() => setEntregando(true)}>Já entreguei a DASN de {ano}</button>
        )}
      </section>

      <section aria-labelledby="check-t" className="checagem-dasn">
        <h2 id="check-t">Antes de entregar</h2>
        <ol>
          <Passo ok={dentro} titulo={dentro ? `Dentro do limite de ${brl(limite)}` : 'Passou do limite'}>
            <span className="passo-sub">{dentro ? `Pronto · ${Math.round((total(t) / limite) * 100)}% usado${ultimo ? ` até ${MESES[ultimo - 1]}` : ''}` : aviso.mensagem}</span>
          </Passo>
          <Passo ok={nPendentes === 0} titulo={nPendentes === 0 ? 'Todas as entradas revisadas' : `${nPendentes} ${nPendentes === 1 ? 'entrada sem revisão' : 'entradas sem revisão'}`}>
            {nPendentes === 0 ? <span className="passo-sub">Pronto</span> : <button className="link passo-link" onClick={() => ir('revisar')}>Falta · Revisar agora</button>}
          </Passo>
          <Passo ok={dasAbertos.length === 0} titulo={dasAbertos.length === 0 ? 'DAS em dia' : `DAS de ${juntar(dasAbertos)} em aberto`}>
            <span className="passo-sub">{dasAbertos.length === 0 ? 'Pronto · conferido nos extratos' : 'Falta · pague no PGMEI ou marque no Início se pagou por outra conta'}</span>
          </Passo>
          <Passo ok={faltam.length === 0} titulo={faltam.length === 0 ? 'Extratos dos 12 meses' : `Extratos de ${faltamTexto}`}>
            <span className="passo-sub">{faltam.length === 0 ? 'Pronto' : 'Falta · chegam por e-mail no começo de cada mês'}</span>
          </Passo>
        </ol>
        <p className="nota-ir">A DASN-SIMEI não substitui o seu Imposto de Renda de pessoa física. O app só prepara os números; a entrega é sua.</p>
      </section>

      <section aria-labelledby="rel-t" className="relatorio-chamada">
        <h2 id="rel-t">Relatório mensal das receitas</h2>
        <p className="apoio">O MEI preenche todo mês e guarda por 5 anos com as notas fiscais. O app já tem os números.</p>
        <button className="principal com-seta" onClick={() => ir('relatorio')}>
          Abrir relatório
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
        </button>
      </section>

      <section aria-labelledby="irpf-t" className="irpf">
        <div>
          <h2 id="irpf-t">Imposto de Renda de pessoa física</h2>
          <p className="apoio">Quanto do lucro do MEI você declara como isento e quanto como tributável.</p>
        </div>
        <div className="irpf-cartao">
          <dl>
            <Pontilhado rotulo={`Serviços × ${PRESUNCAO.servicos * 100}%`} valor={brl(t.servicos * PRESUNCAO.servicos)} cor="var(--ink-muted)" />
            <Pontilhado rotulo={`Comércio × ${PRESUNCAO.comercio * 100}%`} valor={brl(t.comercio * PRESUNCAO.comercio)} cor="var(--ink-muted)" />
            <Pontilhado rotulo="Parte isenta" valor={brl(renda.isenta)} cor="var(--brand)" forte />
          </dl>
          <div className="tracejado" aria-hidden="true" />
          <dl>
            <Pontilhado rotulo="Receita bruta" valor={brl(renda.receita)} cor="var(--ink-muted)" />
            <Pontilhado rotulo={renda.das > 0 ? 'Despesas, com o DAS' : 'Despesas'} valor={'− ' + brl(renda.despesas)} cor="var(--ink-muted)" />
            <Pontilhado rotulo="Lucro da empresa" valor={brl(renda.lucro)} />
            <Pontilhado rotulo="Parte tributável" valor={brl(renda.tributavel)} cor={renda.tributavel > 0 ? '#92400e' : undefined} forte />
          </dl>
          {renda.semSeparar > 0 ? (
            <div className="irpf-aviso">
              <span>{renda.semSeparar} {renda.semSeparar === 1 ? 'saída ainda não foi separada' : 'saídas ainda não foram separadas'}. Até lá, só as já separadas contam como despesa.</span>
              <button className="principal com-seta" onClick={() => ir('saidas')}>
                Separar saídas
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
              </button>
            </div>
          ) : (
            renda.despesas + renda.retiradas > 0 && <button className="link" onClick={() => ir('saidas')}>Ver as saídas separadas</button>
          )}
        </div>
        {rendaMeses.length > 0 && (
          <details className="irpf-meses">
            <summary>Ver mês a mês</summary>
            <table>
              <caption className="so-leitor">Imposto de Renda mês a mês, só para acompanhar</caption>
              <thead>
                <tr><th scope="col">Mês</th><th scope="col">Isento</th><th scope="col">Tributável</th></tr>
              </thead>
              <tbody>
                {rendaMeses.map((r) => (
                  <tr key={r.mes}>
                    <th scope="row">{MESES[r.mes - 1][0].toUpperCase() + MESES[r.mes - 1].slice(1, 3)}</th>
                    <td className="mm-num">{brl(r.isenta)}</td>
                    <td className="mm-num" data-tributavel={r.tributavel > 0}>{brl(r.tributavel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Só para acompanhar. A declaração usa a conta do ano, e a soma dos meses pode ser diferente dela: um mês com mais despesa que receita não desconta dos outros.</p>
          </details>
        )}
        <p className="nota-ir">
          A parte isenta vai em Rendimentos Isentos, como lucro de titular de microempresa do Simples Nacional. A tributável vai em Rendimentos Tributáveis Recebidos de PJ, com o CNPJ do MEI. É uma estimativa: confira com um contador antes de declarar.
        </p>
      </section>
      {entregando && <FolhaEntrega ano={ano} fechar={() => setEntregando(false)} salvar={(data, recibo) => { mudar(entregar(banco, ano, data, recibo)); setEntregando(false) }} />}
    </main>
  )
}

function FolhaEntrega({ ano, fechar, salvar }: { ano: number; fechar: () => void; salvar: (data: string, recibo: string) => void }) {
  const [data, setData] = useState(hojeIso())
  const [recibo, setRecibo] = useState('')
  return (
    <Folha etiqueta={`DASN-SIMEI · ${ano}`} titulo="Marcar como entregue" fechar={fechar} enviar={() => data && salvar(data, recibo)}>
      {(fecharFolha) => (
        <>
          <p className="folha-texto">O app para de lembrar do prazo. O número do recibo fica guardado aqui e no backup.</p>
          <div className="folha-campos">
            <label className="campo">Data da entrega<input type="date" required value={data} max={hojeIso()} onChange={(e) => setData(e.target.value)} /></label>
            <label className="campo"><span>Número do recibo <span className="opcional">opcional</span></span><input inputMode="numeric" autoComplete="off" value={recibo} onChange={(e) => setRecibo(e.target.value)} /></label>
          </div>
          <div className="folha-acoes">
            <button type="submit" className="principal">Marcar como entregue</button>
            <button type="button" className="folha-cancelar" onClick={fecharFolha}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}
