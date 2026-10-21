import { useEffect, useState } from 'react'
import { anosDisponiveis, bancoVazio, type Banco } from './core/banco'
import { pendentes } from './core/relatorio'
import { carregar, salvar } from './core/store'
import Inicio from './telas/Inicio'
import Importar from './telas/Importar'
import Revisar from './telas/Revisar'
import Declaracao from './telas/Declaracao'

export type Aba = 'inicio' | 'revisar' | 'importar' | 'declaracao'

export interface TelaProps {
  banco: Banco
  ano: number
  mudar: (banco: Banco) => void
  ir: (aba: Aba) => void
}

export default function App() {
  const [banco, setBanco] = useState<Banco | null>(null)
  const [aba, setAba] = useState<Aba>('inicio')
  const [ano, setAno] = useState(new Date().getFullYear())

  useEffect(() => {
    carregar().then(setBanco, () => setBanco(bancoVazio()))
  }, [])

  if (!banco) return null

  const mudar = (novo: Banco) => {
    setBanco(novo)
    void salvar(novo)
  }
  const anos = [...new Set([new Date().getFullYear(), ...anosDisponiveis(banco)])].sort((a, b) => b - a)
  const props: TelaProps = { banco, ano, mudar, ir: setAba }
  const nPendentes = pendentes(banco, ano)

  return (
    <div className="app">
      {aba === 'inicio' && <Inicio {...props} anos={anos} mudarAno={setAno} />}
      {aba === 'revisar' && <Revisar {...props} />}
      {aba === 'importar' && <Importar {...props} />}
      {aba === 'declaracao' && <Declaracao {...props} />}

      <nav className="abas" aria-label="Seções">
        <button aria-current={aba === 'inicio'} onClick={() => setAba('inicio')}>Início</button>
        <button aria-current={aba === 'revisar'} onClick={() => setAba('revisar')}>
          Revisar{nPendentes > 0 && <span className="contador">{nPendentes}</span>}
        </button>
        <button className="importar" aria-current={aba === 'importar'} onClick={() => setAba('importar')}>
          <span aria-hidden="true">+</span>
          <span className="so-leitor">Importar extrato</span>
        </button>
        <button aria-current={aba === 'declaracao'} onClick={() => setAba('declaracao')}>Declaração</button>
      </nav>
    </div>
  )
}
