import type { TelaProps } from '../App'
import { brl } from '../core/relatorio'
import { dataCurta } from '../core/formato'
import { irpfPfDoAno, reciboCompleto } from '../core/irpfPf'
import { Cabecalho, Pontilhado, Recibo } from '../componentes/Pecas'

export default function Irpf({ banco, ano, ir }: TelaProps) {
  const r = irpfPfDoAno(banco, ano)
  const e = r.empresa
  const isento = Math.max(0, e.lucro - e.tributavel)
  const recibos = [...r.saude, ...r.educacao]
  const totalAbate = r.totalSaude + r.totalEducacao
  const pendente = r.pendentes.reduce((s, c) => s + c.valor, 0)

  return (
    <main className="conteudo topo irpf-pf">
      <Cabecalho titulo="Imposto de Renda" voltar={() => ir('inicio')} />

      <section>
        <h2>Imposto de Renda {ano + 1}</h2>
        <p className="apoio">Ano-base {ano}. O que você vai copiar para o programa da Receita, já separado por ficha.</p>
      </section>

      <Recibo rotulo="Rendimentos da empresa">
        <span className="etiqueta">RENDIMENTOS DA EMPRESA</span>
        <dl>
          <Pontilhado rotulo={<>Lucro isento do MEI<br /><small>Rendimentos Isentos · lucro do titular do Simples</small></>} valor={brl(isento)} forte />
          <Pontilhado rotulo={<>Parte tributável<br /><small>Retiradas acima do lucro isento</small></>} valor={brl(e.tributavel)} />
        </dl>
        {e.semSeparar > 0 && <p className="nota">{e.semSeparar} {e.semSeparar === 1 ? 'saída ainda sem separar' : 'saídas ainda sem separar'}. O lucro pode mudar.</p>}
        <button className="link" onClick={() => ir('saidas')}>Ver a conta do lucro isento</button>
      </Recibo>

      <section aria-labelledby="abate-t">
        <div className="titulo-linha">
          <h2 id="abate-t">Despesas que abatem</h2>
          <span>Ficha Pagamentos Efetuados</span>
        </div>
        {recibos.length === 0 ? (
          <p className="apoio">Nenhum recibo de {ano}. Consulta, dentista, exame, plano de saúde e escola abatem no IR.</p>
        ) : (
          <ul className="lista-cartao">
            {recibos.map((c) => (
              <li key={c.id}>
                <button onClick={() => ir('recibo', c.id)}>
                  <span className="sigla" data-tipo="saude" aria-hidden="true">{c.saude!.prestador.slice(0, 2).toUpperCase() || '?'}</span>
                  <span className="movs-nome">
                    <b>{c.saude!.prestador || 'Sem nome'}</b>
                    <span>{c.saude!.tipo} · {c.saude!.paciente} · {dataCurta(c.data)}</span>
                    {!reciboCompleto(c) && <span className="estado" data-ok="false">Falta dado</span>}
                  </span>
                  <b className="mm-num">{brl(c.valor)}</b>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="irpf-total"><span>Total que abate</span><b className="mm-num">{brl(totalAbate)}</b>{pendente > 0 && <small>+ {brl(pendente)} pendente</small>}</p>
        <button className="botao" onClick={() => ir('recibo', 'novo')}>Adicionar recibo</button>
      </section>

      <section className="medidor-educacao">
        <h3>Educação</h3>
        <p><b className="mm-num">{brl(r.totalEducacao)}</b> de {brl(r.limiteEducacao)}</p>
        <div className="barra-uso" aria-hidden="true"><span style={{ width: `${Math.min(100, (r.educacaoBruta / r.limiteEducacao) * 100)}%` }} /></div>
        <p className="apoio">Limite por pessoa. Saúde não tem limite.</p>
      </section>

      {r.pendentes.length > 0 && (
        <button className="lembrete" onClick={() => ir('recibo', r.pendentes[0].id)}>
          <b>{r.pendentes.length} {r.pendentes.length === 1 ? 'recibo sem' : 'recibos sem'} algum dado</b>
          <span>Sem CPF ou CNPJ de quem atendeu e o paciente, a Receita não aceita a despesa. Toque para completar.</span>
        </button>
      )}

      {r.farmacia > 0 && (
        <section className="lembrete">
          <b>Farmácia fica de fora</b>
          <span><span className="sensivel">{brl(r.farmacia)}</span> em remédios este ano. Remédio só abate quando vem na conta do hospital.</span>
        </section>
      )}

      <button className="principal" onClick={() => ir('relatorio')}>Gerar resumo para a declaração</button>
    </main>
  )
}
