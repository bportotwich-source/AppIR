import type { Aba } from '../App'
import type { Perfil } from '../core/pf'
import Folha from './Folha'
import Icone from './Icone'

const OPCOES: { aba: Aba; param?: string; titulo: string; desc: string; icone: Parameters<typeof Icone>[0]['nome']; tom: string; perfis: Perfil[] }[] = [
  { aba: 'ler-nota', titulo: 'Ler QR code da nota', desc: 'Cupom de mercado, farmácia ou loja', icone: 'qr', tom: 'pj', perfis: ['pj', 'pf'] },
  { aba: 'comprovante', param: 'novo', titulo: 'PDF ou foto de comprovante', desc: 'Nota de loja online, recibo, cupom sem QR', icone: 'documento', tom: 'azul', perfis: ['pj', 'pf'] },
  { aba: 'importar', titulo: 'Importar extrato', desc: 'Extrato do Nubank PJ', icone: 'importar', tom: 'pf', perfis: ['pj'] },
  { aba: 'importar', titulo: 'Importar extrato', desc: 'Conta pessoal ou fatura do cartão', icone: 'importar', tom: 'pf', perfis: ['pf'] },
  { aba: 'recibo', param: 'novo', titulo: 'Recibo de saúde ou escola', desc: 'Consulta, dentista, exame: abate no IR', icone: 'coracao', tom: 'rosa', perfis: ['pf'] },
]

/** Folha do botão + da barra de abas. */
export default function Adicionar({ ir, fechar, perfil }: { ir: (aba: Aba, param?: string) => void; fechar: () => void; perfil: Perfil }) {
  return (
    <Folha etiqueta={perfil === 'pf' ? 'Pessoal' : 'Empresa'} titulo="Adicionar" fechar={fechar}>
      {(fecharFolha) => (
        <>
          <ul className="adicionar">
            {OPCOES.filter((o) => o.perfis.includes(perfil)).map((o) => (
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
