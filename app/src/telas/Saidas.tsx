import type { TelaProps } from '../App'
import { brl } from '../core/relatorio'
import { gruposSaida, marcarSaida } from '../core/saidas'
import { Cabecalho } from '../componentes/Pecas'

export default function Saidas({ banco, ano, mudar, ir }: TelaProps) {
  const grupos = gruposSaida(banco, ano)
  const faltam = grupos.filter((g) => g.despesa === null).length

  return (
    <main className="conteudo topo saidas">
      <Cabecalho
        titulo={`Saídas de ${ano}`}
        sub="Separe o que a empresa gastou do que você tirou para você. Isso define o lucro no Imposto de Renda."
        voltar={() => ir('declaracao')}
        rotuloVoltar="Voltar para a declaração"
        empilhado
      />

      {grupos.length === 0 ? (
        <p className="apoio">Nenhuma saída nos extratos de {ano}.</p>
      ) : (
        <>
          <p className="saidas-resumo" aria-live="polite" data-ok={faltam === 0}>
            {faltam === 0 ? 'Tudo separado. A próxima saída para os mesmos destinos já entra separada.' : `${faltam} ${faltam === 1 ? 'destino para separar' : 'destinos para separar'}`}
          </p>
          <ul className="saidas-lista">
            {grupos.map((g) => (
              <li key={g.chave}>
                <div className="saida-topo">
                  <div>
                    <b>{g.nome}</b>
                    <span>{g.operacao === 'Entrada' ? 'Saída' : g.operacao} · {g.quantas} {g.quantas === 1 ? 'vez' : 'vezes'}</span>
                  </div>
                  <b className="mm-num">{brl(g.valor)}</b>
                </div>
                {g.das ? (
                  <span className="saida-das">Imposto do MEI · conta como despesa</span>
                ) : (
                  <div className="saida-escolha" role="group" aria-label={`${g.nome}: tipo de saída`}>
                    <button type="button" aria-pressed={g.despesa === true} onClick={() => mudar(marcarSaida(banco, g.chave, true))}>Despesa</button>
                    <button type="button" aria-pressed={g.despesa === false} onClick={() => mudar(marcarSaida(banco, g.chave, false))}>Retirada</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="nota-ir">Despesa é o que a empresa precisou para funcionar: material, ferramentas, internet, impostos. Pix para você mesmo e gastos da casa são retirada.</p>
        </>
      )}
    </main>
  )
}
