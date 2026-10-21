import type { TelaProps } from '../App'
import { LIMITE_ANUAL, pendentes, projecaoAno, total, totaisAno, totaisPorMes } from '../core/relatorio'
import { MESES } from '../core/formato'

// Projeção é estimativa: arredonda para centenas e mostra sem centavos.
const reais = (v: number) => 'R$ ' + (Math.round(v / 100) * 100).toLocaleString('pt-BR')

const CURTO = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

interface Props extends TelaProps {
  anos: number[]
  mudarAno: (ano: number) => void
}

export default function Inicio({ banco, ano, ir, anos, mudarAno }: Props) {
  const { LimitGauge, SplitBar, MonthBars } = window.MeuMEI
  const t = totaisAno(banco, ano)
  const meses = totaisPorMes(banco, ano)
  const comExtrato = banco.movimentacoes.some((r) => r.data.startsWith(`${ano}-`))
  const ultimoMes = Math.max(0, ...banco.movimentacoes.filter((r) => r.data.startsWith(`${ano}-`)).map((r) => Number(r.data.slice(5, 7))))
  const projecao = projecaoAno(banco, ano)
  const nPendentes = pendentes(banco, ano)

  return (
    <main>
      <section className="faixa" aria-label="Resumo do ano">
        <div className="faixa-topo">
          <span className="marca">Meu MEI</span>
          <label className="so-leitor" htmlFor="ano">Ano</label>
          <select id="ano" value={ano} onChange={(e) => mudarAno(Number(e.target.value))}>
            {anos.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <p className="faixa-nota">
          {comExtrato ? `Atualizado com o extrato de ${MESES[ultimoMes - 1]}` : 'Nenhum extrato importado ainda'}
        </p>
        <h1>Seu ano até aqui</h1>
        <div className="medidor">
          <LimitGauge value={total(t)} limit={LIMITE_ANUAL} tone="dark" size={280} />
        </div>
        {projecao !== null && (
          <p className="projecao">
            No ritmo atual, {ano} fecha perto de <b>{reais(projecao)}</b>.{' '}
            {projecao <= LIMITE_ANUAL
              ? `Fica dentro do limite, com folga de ${reais(LIMITE_ANUAL - projecao)}.`
              : 'Passa do limite: vale falar com um contador.'}
          </p>
        )}
      </section>

      <div className="conteudo">
        {!comExtrato && (
          <section>
            <h2>Comece pelo extrato</h2>
            <p>Importe o PDF que o Nubank PJ manda por e-mail. Ele é lido aqui e não sai do celular.</p>
            <button className="principal" onClick={() => ir('importar')}>Importar extrato</button>
          </section>
        )}

        {nPendentes > 0 && (
          <button className="ticket-pendente" onClick={() => ir('revisar')}>
            <b>{nPendentes} {nPendentes === 1 ? 'entrada para revisar' : 'entradas para revisar'}</b>
            <span>Fora do total até você decidir · Revisar agora</span>
          </button>
        )}

        {comExtrato && (
          <section>
            <h2>Por categoria</h2>
            <SplitBar items={[
              { label: 'Serviços', value: t.servicos, color: 'var(--servicos)' },
              { label: 'Comércio', value: t.comercio, color: 'var(--comercio)' },
            ]} />
          </section>
        )}

        {comExtrato && (
          <section>
            <h2>Mês a mês</h2>
            <MonthBars data={meses.map((m, i) => ({ m: CURTO[i], s: m.servicos, c: m.comercio }))} />
          </section>
        )}
      </div>
    </main>
  )
}
