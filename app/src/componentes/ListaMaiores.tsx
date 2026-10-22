import { brl } from '../core/relatorio'
import { iniciais } from '../core/agenda'

/** Lista dos maiores (quem mais pagou na PJ, onde mais gastou na PF). */
export default function ListaMaiores({ itens }: { itens: { nome: string; detalhe: string; valor: number }[] }) {
  return (
    <ol className="maiores">
      {itens.map((g) => (
        <li key={g.nome}>
          <span className="sigla" aria-hidden="true">{iniciais(g.nome)}</span>
          <span className="movs-nome"><b>{g.nome}</b><span>{g.detalhe}</span></span>
          <b className="mm-num">{brl(g.valor)}</b>
        </li>
      ))}
    </ol>
  )
}
