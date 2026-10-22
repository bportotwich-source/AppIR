import { useEffect, useRef, useState } from 'react'
import { anosDisponiveis, bancoVazio, type Banco } from './core/banco'
import { pendentes } from './core/relatorio'
import { carregar, salvar } from './core/store'
import { ler as lerTrava, removerTrava } from './core/trava'
import Desbloquear from './telas/Desbloquear'
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
  criarPin: () => void
}

// Fora do app por mais que isso, ele pede o PIN de novo.
const TRAVA_APOS_MS = 60_000

export default function App() {
  const [banco, setBanco] = useState<Banco | null>(null)
  const [aba, setAba] = useState<Aba>('inicio')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [travado, setTravado] = useState(() => lerTrava() !== null)
  const [criandoPin, setCriandoPin] = useState(false)
  const saiuEm = useRef(0)

  useEffect(() => {
    carregar().then(setBanco, () => setBanco(bancoVazio()))
  }, [])

  useEffect(() => {
    const mudou = () => {
      if (document.hidden) saiuEm.current = Date.now()
      else if (lerTrava() && Date.now() - saiuEm.current > TRAVA_APOS_MS) setTravado(true)
    }
    document.addEventListener('visibilitychange', mudou)
    return () => document.removeEventListener('visibilitychange', mudou)
  }, [])

  if (travado) {
    return (
      <Desbloquear
        modo="entrar"
        aoTerminar={() => setTravado(false)}
        aoApagarTudo={() => {
          if (!confirm('Apagar todos os extratos e marcações deste celular? Isso não pode ser desfeito.')) return
          removerTrava()
          const vazio = bancoVazio()
          setBanco(vazio)
          void salvar(vazio)
          setTravado(false)
        }}
      />
    )
  }
  if (criandoPin) {
    return <Desbloquear modo="criar" aoTerminar={() => setCriandoPin(false)} aoCancelar={() => setCriandoPin(false)} />
  }
  if (!banco) return null

  const mudar = (novo: Banco) => {
    setBanco(novo)
    void salvar(novo)
  }
  const anos = [...new Set([new Date().getFullYear(), ...anosDisponiveis(banco)])].sort((a, b) => b - a)
  const props: TelaProps = { banco, ano, mudar, ir: setAba, criarPin: () => setCriandoPin(true) }
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
