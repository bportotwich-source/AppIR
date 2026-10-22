import { useState } from 'react'
import Folha from './Folha'
import { digitosDoPin } from '../core/trava'

export type AcaoCofre = 'ligar' | 'desligar' | 'tirarPin'

const TEXTOS: Record<AcaoCofre, { titulo: string; botao: string }> = {
  ligar: { titulo: 'Criptografar os dados', botao: 'Criptografar' },
  desligar: { titulo: 'Desligar a criptografia?', botao: 'Desligar' },
  tirarPin: { titulo: 'Desligar o PIN?', botao: 'Desligar' },
}

/** Folha que pede o PIN atual para ligar ou desligar a criptografia, ou para
 * tirar o PIN. Quem pegar o celular destravado não desliga a proteção. */
export default function FolhaCofre({ acao, comCofre, fechar, confirmar }: {
  acao: AcaoCofre
  comCofre: boolean
  fechar: () => void
  /** Rejeita com a mensagem para mostrar (PIN incorreto). */
  confirmar: (pin: string) => Promise<void>
}) {
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const digitos = digitosDoPin()
  const ligar = acao === 'ligar'

  async function enviar() {
    if (pin.length !== digitos) return setErro(`Digite os ${digitos} dígitos do PIN.`)
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
    <Folha etiqueta="Segurança" titulo={TEXTOS[acao].titulo} fechar={fechar} enviar={enviar}>
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
            </>
          ) : acao === 'desligar' ? (
            <p className="folha-texto">Os dados voltam a ficar guardados abertos no celular. O PIN continua trancando a tela.</p>
          ) : (
            <p className="folha-texto">
              O app volta a abrir sem PIN{comCofre ? ' e os dados deixam de ficar criptografados' : ''}.
            </p>
          )}
          <label className="campo">
            <span>PIN atual</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={digitos}
              pattern="[0-9]*"
              value={pin}
              aria-invalid={!!erro}
              aria-describedby={erro ? 'cofre-erro' : undefined}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErro('') }}
            />
          </label>
          {erro && <p className="folha-erro" id="cofre-erro" role="alert">{erro}</p>}
          <div className="folha-acoes">
            <button type="submit" className={ligar ? 'principal' : 'principal perigo'} disabled={ocupado}>
              {ocupado ? 'Um instante…' : TEXTOS[acao].botao}
            </button>
            <button type="button" className="folha-cancelar" onClick={fecharFolha}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}
