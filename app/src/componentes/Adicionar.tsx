import type { Aba } from '../App'
import Folha from './Folha'
import Icone from './Icone'

const OPCOES: { aba: Aba; param?: string; titulo: string; desc: string; icone: Parameters<typeof Icone>[0]['nome']; tom: string }[] = [
  { aba: 'ler-nota', titulo: 'Ler QR code da nota', desc: 'Cupom de mercado, farmácia ou loja', icone: 'qr', tom: 'pj' },
  { aba: 'comprovante', param: 'novo', titulo: 'PDF ou foto de comprovante', desc: 'Nota de loja online, recibo, cupom sem QR', icone: 'documento', tom: 'azul' },
  { aba: 'importar', titulo: 'Importar extrato', desc: 'Conta da empresa, conta pessoal ou cartão', icone: 'importar', tom: 'pf' },
  { aba: 'recibo', param: 'novo', titulo: 'Recibo de saúde ou escola', desc: 'Consulta, dentista, exame: abate no IR', icone: 'coracao', tom: 'rosa' },
]

/** Folha do botão + da barra de abas. */
export default function Adicionar({ ir, fechar }: { ir: (aba: Aba, param?: string) => void; fechar: () => void }) {
  return (
    <Folha etiqueta="Novo" titulo="Adicionar" fechar={fechar}>
      {(fecharFolha) => (
        <>
          <ul className="adicionar">
            {OPCOES.map((o) => (
              <li key={o.titulo}>
                <button type="button" onClick={() => ir(o.aba, o.param)}>
                  <span className="adicionar-icone" data-tom={o.tom}><Icone nome={o.icone} tamanho={24} /></span>
                  <span><b>{o.titulo}</b><span>{o.desc}</span></span>
                  <Icone nome="seta" tamanho={18} />
                </button>
              </li>
            ))}
          </ul>
          <p className="folha-dica">Para ver os extratos já importados, abra Importar extrato e role até o fim.</p>
          <div className="folha-acoes"><button type="button" className="folha-cancelar" onClick={fecharFolha}>Fechar</button></div>
        </>
      )}
    </Folha>
  )
}
