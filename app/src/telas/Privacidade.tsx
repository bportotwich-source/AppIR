import type { TelaProps } from '../App'
import { Cabecalho } from '../componentes/Pecas'

const OPCOES = [
  { id: 'abrirOculto', titulo: 'Abrir com os valores escondidos', desc: 'Toda vez que o app abre, os valores começam borrados. O olho do Início mostra.' },
  { id: 'esconderDocs', titulo: 'Esconder CPF e CNPJ', desc: 'Mostra só o fim dos números em notas, recibos e pagadores.' },
] as const

export default function Privacidade({ banco, mudar, ir, oculto, alternarOlho }: TelaProps) {
  const p = banco.privacidade ?? {}

  return (
    <main className="conteudo topo">
      <Cabecalho titulo="Privacidade" sub="Para abrir o app perto de outras pessoas sem mostrar o que é seu." voltar={() => ir('ajustes')} rotuloVoltar="Voltar para os ajustes" empilhado />

      <section className="exemplo-privacidade" aria-label="Como fica na tela">
        <span className="rotulo">Como fica na tela</span>
        <div><span>Gasto do mês</span><b className="mm-num">R$ 1.737,10</b></div>
        <div><span>Pix de</span><b className="sensivel">Maria Souza</b></div>
        <div><span>CNPJ</span><b>{p.esconderDocs ? '••.•••.•••/0001-99' : '12.345.678/0001-99'}</b></div>
        <button className="link" onClick={alternarOlho}>{oculto ? 'Mostrar valores agora' : 'Esconder valores agora'}</button>
      </section>

      {OPCOES.map((o) => (
        <button key={o.id} type="button" role="switch" aria-checked={!!p[o.id]} className="chave-lembrar" onClick={() => mudar({ ...banco, privacidade: { ...p, [o.id]: !p[o.id] } })}>
          <span>
            <b>{o.titulo}</b>
            <span>{o.desc}</span>
          </span>
          <span className="chave-trilho" aria-hidden="true"><span /></span>
        </button>
      ))}

      <p className="nota-ir">Seus dados já ficam só neste celular, e criptografados quando você liga a proteção com PIN. Esconder é para quem está olhando a tela. Toque no olho do Início para mostrar ou esconder na hora.</p>
    </main>
  )
}
