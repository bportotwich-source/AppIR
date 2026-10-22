import { useState } from 'react'
import Folha from './Folha'

/** Folha para ligar (pede o PIN) ou desligar a criptografia dos dados. */
export default function FolhaCofre({ ligar, fechar, confirmar }: {
  ligar: boolean
  fechar: () => void
  /** Rejeita com a mensagem para mostrar (PIN incorreto). */
  confirmar: (pin: string) => Promise<void>
}) {
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar() {
    if (ligar && pin.length !== 4) return setErro('Digite os 4 dígitos do PIN.')
    setOcupado(true)
    try {
      await confirmar(pin)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu certo. Tente de novo.')
      setPin('')
      setOcupado(false)
    }
  }

  return (
    <Folha
      etiqueta="Segurança"
      titulo={ligar ? 'Criptografar os dados' : 'Desligar a criptografia?'}
      fechar={fechar}
      enviar={enviar}
    >
      {(fecharFolha) => (
        <>
          {ligar ? (
            <>
              <p className="folha-texto">
                Extratos e marcações ficam cifrados neste celular e só abrem com o seu PIN ou a digital.
              </p>
              <p className="folha-aviso">
                Se esquecer o PIN, não tem como recuperar. Só um backup salva os dados.
              </p>
              <label className="campo">
                <span>PIN atual</span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={4}
                  pattern="[0-9]*"
                  value={pin}
                  aria-invalid={!!erro}
                  aria-describedby={erro ? 'cofre-erro' : undefined}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErro('') }}
                />
              </label>
              {erro && <p className="folha-erro" id="cofre-erro" role="alert">{erro}</p>}
            </>
          ) : (
            <p className="folha-texto">Os dados voltam a ficar guardados abertos no celular. O PIN continua trancando a tela.</p>
          )}
          <div className="folha-acoes">
            <button type="submit" className={ligar ? 'principal' : 'principal perigo'} disabled={ocupado}>
              {ocupado ? 'Um instante…' : ligar ? 'Criptografar' : 'Desligar'}
            </button>
            <button type="button" className="folha-cancelar" onClick={fecharFolha}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}
