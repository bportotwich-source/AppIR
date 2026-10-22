import type { TelaProps } from '../App'
import { brl } from '../core/relatorio'
import { categorizarPf, gruposSemCategoria, nomeCategoria } from '../core/pf'
import { Cabecalho } from '../componentes/Pecas'
import { Categorias } from '../componentes/Perfil'

export default function RevisarPf({ banco, ano, mudar, ir }: TelaProps) {
  const grupos = gruposSemCategoria(banco, ano)

  return (
    <main className="conteudo topo">
      <Cabecalho titulo="Revisar gastos" voltar={() => ir('inicio')} />

      <section>
        <h2>Para onde foi?</h2>
        <p className="apoio">Escolha a categoria uma vez. O app lembra o destino e separa os próximos sozinho.</p>
      </section>

      {grupos.length === 0 ? (
        <p className="saidas-resumo" data-ok="true">Tudo separado em {ano}. Os próximos gastos para os mesmos destinos já entram com categoria.</p>
      ) : (
        <ul className="saidas-lista">
          {grupos.map((g) => (
            <li key={g.chave}>
              <div className="saida-topo">
                <div>
                  <b>{g.nome}</b>
                  <span>{g.operacao} · {g.quantas} {g.quantas === 1 ? 'vez' : 'vezes'}</span>
                </div>
                <b className="mm-num">{brl(g.valor)}</b>
              </div>
              {g.sugestao && <span className="dica-categoria">Parece {nomeCategoria(g.sugestao)}</span>}
              <Categorias rotulo={`${g.nome}: categoria`} valor={null} mudar={(c) => mudar(categorizarPf(banco, g.chave, c))} />
            </li>
          ))}
        </ul>
      )}
      <p className="nota-ir">Compras com nota lida já chegam com a categoria da loja. Saúde e Educação vão também para o Imposto de Renda.</p>
    </main>
  )
}
