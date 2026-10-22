import { useEffect, useRef, useState } from 'react'
import { anosDisponiveis, bancoVazio, type Banco } from './core/banco'
import { pendentes } from './core/relatorio'
import { apagarTudo, carregar, salvar, usarChave } from './core/store'
import { ler as lerTrava, removerTrava } from './core/trava'
import { protegerDados } from './core/armazenamento'
import Desbloquear from './telas/Desbloquear'
import Inicio from './telas/Inicio'
import Importar from './telas/Importar'
import Revisar from './telas/Revisar'
import Declaracao from './telas/Declaracao'
import Ajustes from './telas/Ajustes'
import Saidas from './telas/Saidas'
import Movimentacoes from './telas/Movimentacoes'
import Relatorio from './telas/Relatorio'
import Icone from './componentes/Icone'
import InicioPf from './telas/InicioPf'
import InicioTudo from './telas/InicioTudo'
import RevisarPf from './telas/RevisarPf'
import Comprovantes from './telas/Comprovantes'
import ComprovanteTela from './telas/Comprovante'
import LerNota from './telas/LerNota'
import ReciboSaude from './telas/ReciboSaude'
import Irpf from './telas/Irpf'
import Privacidade from './telas/Privacidade'
import Adicionar from './componentes/Adicionar'
import { gruposSemCategoria, type Perfil } from './core/pf'

export type Aba = 'inicio' | 'revisar' | 'importar' | 'declaracao' | 'extratos' | 'ajustes' | 'saidas' | 'movimentacoes' | 'pagadores' | 'relatorio'
  | 'revisar-pf' | 'comprovantes' | 'comprovante' | 'ler-nota' | 'recibo' | 'irpf' | 'privacidade'

export interface TelaProps {
  banco: Banco
  ano: number
  mudar: (banco: Banco) => void
  ir: (aba: Aba, param?: string) => void
  param?: string // id do comprovante aberto, ou o que a tela precisar
  perfil: Perfil
  mudarPerfil: (p: Perfil) => void
  oculto: boolean
  alternarOlho: () => void
  criarPin: () => void
  dadosProtegidos: boolean
  instalar: (() => void) | null // Android/Chrome: abre o pedido de instalação
}

interface PedidoInstalacao extends Event {
  prompt: () => Promise<void>
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
  const [dadosProtegidos, setDadosProtegidos] = useState(false)
  const [pedido, setPedido] = useState<PedidoInstalacao | null>(null)
  const [param, setParam] = useState<string | undefined>()
  const [perfil, setPerfil] = useState<Perfil>(() => {
    try {
      const p = localStorage.getItem('meu-mei:perfil')
      return p === 'pf' || p === 'tudo' ? p : 'pj'
    } catch {
      return 'pj'
    }
  })
  const [oculto, setOculto] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const abriuOculto = useRef(false)

  // Com "abrir com valores escondidos", cada abertura começa escondida.
  useEffect(() => {
    if (banco && !abriuOculto.current) {
      abriuOculto.current = true
      if (banco.privacidade?.abrirOculto) setOculto(true)
    }
    if (!banco) abriuOculto.current = false
  }, [banco])

  useEffect(() => {
    // Com os dados cifrados, carregar só depois do PIN. Cifrados sem trava
    // (dados do site apagados pela metade) não há como abrir: começa vazio.
    carregar().then((b) => { if (b || !lerTrava()) setBanco(b ?? bancoVazio()) }, () => setBanco(bancoVazio()))
    protegerDados().then(setDadosProtegidos)
    const guardar = (e: Event) => {
      e.preventDefault()
      setPedido(e as PedidoInstalacao)
    }
    const instalou = () => {
      setPedido(null)
      protegerDados().then(setDadosProtegidos)
    }
    window.addEventListener('beforeinstallprompt', guardar)
    window.addEventListener('appinstalled', instalou)
    return () => {
      window.removeEventListener('beforeinstallprompt', guardar)
      window.removeEventListener('appinstalled', instalou)
    }
  }, [])

  useEffect(() => {
    const mudou = () => {
      if (document.hidden) saiuEm.current = Date.now()
      else if (lerTrava() && Date.now() - saiuEm.current > TRAVA_APOS_MS) {
        setTravado(true)
        // Travado, a chave dos dados sai da memória.
        if (lerTrava()?.cofre) {
          usarChave(null)
          setBanco(null)
        }
      }
    }
    document.addEventListener('visibilitychange', mudou)
    return () => document.removeEventListener('visibilitychange', mudou)
  }, [])

  if (travado) {
    return (
      <Desbloquear
        modo="entrar"
        aoTerminar={() => {
          setTravado(false)
          carregar().then((b) => setBanco((atual) => atual ?? b ?? bancoVazio()), () => setBanco(bancoVazio()))
        }}
        aoApagarTudo={async () => {
          if (!confirm('Apagar todos os extratos e marcações deste celular? Isso não pode ser desfeito.')) return
          removerTrava()
          await apagarTudo()
          setBanco(bancoVazio())
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
    // A data de alteração diz se o último backup ficou velho.
    const campos = new Set([...Object.keys(novo), ...Object.keys(banco)] as (keyof Banco)[])
    const alterou = [...campos].some((k) => k !== 'ultimoBackup' && k !== 'alteradoEm' && novo[k] !== banco[k])
    if (alterou) novo = { ...novo, alteradoEm: new Date().toISOString() }
    setBanco(novo)
    void salvar(novo)
  }
  const anos = [...new Set([new Date().getFullYear(), ...anosDisponiveis(banco)])].sort((a, b) => b - a)
  const ir = (nova: Aba, p?: string) => { setAba(nova); setParam(p); setAdicionando(false); window.scrollTo(0, 0) }
  const mudarPerfil = (p: Perfil) => {
    setPerfil(p)
    try { localStorage.setItem('meu-mei:perfil', p) } catch { /* só nesta sessão */ }
  }
  const props: TelaProps = {
    banco, ano, mudar, ir, param, criarPin: () => setCriandoPin(true), dadosProtegidos,
    instalar: pedido ? () => void pedido.prompt().then(() => setPedido(null)) : null,
    perfil, mudarPerfil, oculto, alternarOlho: () => setOculto(!oculto),
  }
  const nPendentes = pendentes(banco, ano) + gruposSemCategoria(banco, ano).length
  const abaRevisar: Aba = perfil === 'pf' ? 'revisar-pf' : 'revisar'
  const abaDeclaracao: Aba = perfil === 'pf' ? 'irpf' : 'declaracao'

  return (
    <div className={'app' + (oculto ? ' oculto' : '')}>
      {aba === 'inicio' && perfil === 'pj' && <Inicio {...props} anos={anos} mudarAno={setAno} />}
      {aba === 'inicio' && perfil === 'pf' && <InicioPf {...props} />}
      {aba === 'inicio' && perfil === 'tudo' && <InicioTudo {...props} />}
      {aba === 'revisar-pf' && <RevisarPf {...props} />}
      {aba === 'comprovantes' && <Comprovantes {...props} />}
      {aba === 'comprovante' && <ComprovanteTela key={param} {...props} />}
      {aba === 'ler-nota' && <LerNota {...props} />}
      {aba === 'recibo' && <ReciboSaude key={param} {...props} />}
      {aba === 'irpf' && <Irpf {...props} />}
      {aba === 'privacidade' && <Privacidade {...props} />}
      {adicionando && <Adicionar ir={ir} fechar={() => setAdicionando(false)} />}
      {aba === 'revisar' && <Revisar {...props} />}
      {aba === 'importar' && <Importar {...props} />}
      {aba === 'declaracao' && <Declaracao {...props} />}
      {aba === 'extratos' && <Importar {...props} historico />}
      {aba === 'ajustes' && <Ajustes {...props} />}
      {aba === 'saidas' && <Saidas {...props} />}
      {aba === 'movimentacoes' && <Movimentacoes {...props} />}
      {aba === 'pagadores' && <Movimentacoes {...props} pagadores />}
      {aba === 'relatorio' && <Relatorio {...props} />}

      {/* Telas de dentro de outras, com botão de voltar: sem a barra de abas. */}
      {!['ajustes', 'saidas', 'movimentacoes', 'pagadores', 'relatorio', 'comprovante', 'ler-nota', 'recibo', 'privacidade'].includes(aba) && (
        <nav className="abas" aria-label="Seções">
          <button aria-current={aba === 'inicio'} onClick={() => ir('inicio')}><Icone nome="inicio" />Início</button>
          <button aria-current={aba === 'revisar' || aba === 'revisar-pf'} onClick={() => ir(abaRevisar)}>
            <Icone nome="revisar" />Revisar
            {nPendentes > 0 && <span className="contador" aria-label={`${nPendentes} pendentes`}>{nPendentes}</span>}
          </button>
          <button className="importar" aria-current={adicionando || aba === 'importar' || aba === 'extratos'} aria-haspopup="dialog" onClick={() => setAdicionando(true)}>
            <Icone nome="mais" tamanho={26} />
            <span className="so-leitor">Adicionar</span>
          </button>
          <button aria-current={aba === 'comprovantes'} onClick={() => ir('comprovantes')}><Icone nome="notas" />Notas</button>
          <button aria-current={aba === 'declaracao' || aba === 'irpf'} onClick={() => ir(abaDeclaracao)}><Icone nome="declaracao" />Declaração</button>
        </nav>
      )}
    </div>
  )
}
