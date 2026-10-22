import { useEffect, useRef, useState } from 'react'
import { conferirPin, criarPin, entrarComDigital, ler } from '../core/trava'

// Tela de PIN do design (Meu MEI · Telas › Desbloquear). Serve para abrir o
// app e para criar um PIN novo (digitar e confirmar).

type Modo = 'entrar' | 'criar'

interface Props {
  modo: Modo
  aoTerminar: () => void
  aoCancelar?: () => void
  aoApagarTudo?: () => void
}

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function Desbloquear({ modo, aoTerminar, aoCancelar, aoApagarTudo }: Props) {
  const [pin, setPin] = useState('')
  const [primeiro, setPrimeiro] = useState<string | null>(null) // modo criar
  const [erro, setErro] = useState('')
  const [treme, setTreme] = useState(0)
  const [ok, setOk] = useState(false)
  const [ajuda, setAjuda] = useState(false)
  const [conferindo, setConferindo] = useState(false)
  const [agora, setAgora] = useState(Date.now())
  const temDigital = modo === 'entrar' && !!ler()?.digital
  const bloqueadaAte = modo === 'entrar' ? (ler()?.bloqueadaAte ?? 0) : 0
  const bloqueada = bloqueadaAte > agora
  const tentouDigital = useRef(false)

  // Relógio só enquanto estiver bloqueada, para liberar sozinha.
  useEffect(() => {
    if (!bloqueada) return
    const id = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [bloqueada])

  function liberar() {
    setOk(true)
    setErro('')
    window.setTimeout(aoTerminar, 500)
  }

  async function digital() {
    if (await entrarComDigital()) liberar()
    else setErro('Digital não reconhecida. Tente de novo ou use o PIN.')
  }

  // Abre o leitor de digital assim que a tela aparece, quando o navegador deixa.
  useEffect(() => {
    if (temDigital && !tentouDigital.current) {
      tentouDigital.current = true
      entrarComDigital().then((passou) => passou && liberar())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temDigital])

  async function completo(valor: string) {
    setConferindo(true)
    try {
      if (modo === 'criar') {
        if (primeiro === null) {
          setPrimeiro(valor)
          setPin('')
          return
        }
        if (valor !== primeiro) {
          setPrimeiro(null)
          setPin('')
          setErro('Os PINs não bateram. Comece de novo.')
          setTreme((n) => n + 1)
          return
        }
        await criarPin(valor)
        liberar()
        return
      }
      const r = await conferirPin(valor)
      if (r.ok) return liberar()
      setPin('')
      setTreme((n) => n + 1)
      setAgora(Date.now())
      setErro(
        r.bloqueadaAte
          ? 'Muitas tentativas. Espere 5 minutos para tentar de novo.'
          : `PIN incorreto. Você ainda tem ${r.restantes} ${r.restantes === 1 ? 'tentativa' : 'tentativas'}.`,
      )
    } finally {
      setConferindo(false)
    }
  }

  function digitar(d: string) {
    if (ok || conferindo || bloqueada || pin.length >= 4) return
    const valor = pin + d
    setPin(valor)
    setErro('')
    if (valor.length === 4) window.setTimeout(() => completo(valor), 150)
  }

  const subtitulo = ok
    ? modo === 'criar' ? 'PIN criado' : 'Bem-vindo de volta'
    : modo === 'criar'
      ? primeiro === null ? 'Escolha um PIN de 4 dígitos' : 'Digite o PIN de novo para confirmar'
      : 'Digite seu PIN para abrir'
  const mensagem = bloqueada
    ? `Muitas tentativas. Tente de novo em ${Math.ceil((bloqueadaAte - agora) / 60_000)} min.`
    : erro

  return (
    <div className="trava">
      <svg className="trava-aneis" aria-hidden="true" viewBox="0 0 390 844" preserveAspectRatio="xMidYMin slice">
        <circle cx="195" cy="170" r="92" fill="none" stroke="#2dd4bf" strokeOpacity="0.16" strokeDasharray="2 9" strokeWidth="2" strokeLinecap="round" />
        <circle cx="195" cy="170" r="140" fill="none" stroke="#2dd4bf" strokeOpacity="0.07" />
        <circle cx="195" cy="170" r="200" fill="none" stroke="#2dd4bf" strokeOpacity="0.05" />
        <circle cx="195" cy="170" r="270" fill="none" stroke="#2dd4bf" strokeOpacity="0.035" />
      </svg>

      <div className="trava-conteudo">
        <div className="trava-marca">
          <svg aria-hidden="true" width="64" height="64" viewBox="0 0 32 32"><rect width="32" height="32" rx="10" fill="#2dd4bf" /><rect x="8" y="17" width="4" height="8" rx="2" fill="#0c2a27" /><rect x="14" y="12" width="4" height="13" rx="2" fill="#0c2a27" /><rect x="20" y="7" width="4" height="18" rx="2" fill="#0c2a27" /></svg>
          <h1>Meu MEI</h1>
          <p>{subtitulo}</p>
        </div>

        <div className="trava-pontos">
          {ok ? (
            <svg className="mm-rise" aria-hidden="true" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#2dd4bf" /><path className="mm-draw" d="M12 20.5 L18 26 L28.5 14.5" fill="none" stroke="#0c2a27" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ ['--mm-len' as string]: 30 }} /></svg>
          ) : (
            <div key={treme} role="img" aria-label={`${pin.length} de 4 dígitos`} className={treme ? 'treme' : undefined}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} data-cheio={i < pin.length} data-erro={!!erro && !!treme} />
              ))}
            </div>
          )}
        </div>

        <p className="trava-mensagem" aria-live="polite">{ok ? (modo === 'criar' ? 'PIN criado' : 'Desbloqueado') : mensagem}</p>

        {!ok && (
          <>
            <div className="teclado">
              {TECLAS.map((n) => (
                <button key={n} type="button" className="tecla" onClick={() => digitar(n)} disabled={bloqueada}>{n}</button>
              ))}
              {temDigital ? (
                <button type="button" className="tecla tecla-icone" onClick={digital} aria-label="Entrar com a digital">
                  <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" /><path d="M14 13.12c0 2.38 0 6.38-1 8.88" /><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" /><path d="M2 12a10 10 0 0 1 18-6" /><path d="M2 16h.01" /><path d="M21.8 16c.2-2 .131-5.354 0-6" /><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" /><path d="M8.65 22c.21-.66.45-1.32.57-2" /><path d="M9 6.8a6 6 0 0 1 9 5.2v2" /></svg>
                </button>
              ) : modo === 'criar' && aoCancelar ? (
                <button type="button" className="tecla tecla-texto" onClick={aoCancelar}>Cancelar</button>
              ) : (
                <span />
              )}
              <button type="button" className="tecla" onClick={() => digitar('0')} disabled={bloqueada}>0</button>
              <button type="button" className="tecla tecla-icone" aria-label="Apagar" onClick={() => setPin(pin.slice(0, -1))}>
                <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z" /><path d="m12.5 9.5 5 5" /><path d="m17.5 9.5-5 5" /></svg>
              </button>
            </div>

            {modo === 'entrar' && (
              <>
                <button type="button" className="trava-link" aria-expanded={ajuda} onClick={() => setAjuda(!ajuda)}>Esqueci o PIN</button>
                {ajuda && (
                  <div className="trava-ajuda">
                    <p>O PIN não pode ser recuperado. Dá para apagar os dados deste celular e restaurar um backup depois.</p>
                    {aoApagarTudo && (
                      <button type="button" className="trava-link perigo" onClick={aoApagarTudo}>Apagar os dados deste celular</button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        <p className="trava-rodape">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          Seus dados ficam só neste aparelho
        </p>
      </div>
    </div>
  )
}
