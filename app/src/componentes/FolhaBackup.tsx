import { useState } from 'react'
import Folha from './Folha'

export const MIN_SENHA = 8

/** Folha da senha do backup: escolher uma (fazer backup) ou digitar a do
 * arquivo (restaurar). */
export default function FolhaBackup({ abrir, fechar, confirmar }: {
  abrir: boolean
  fechar: () => void
  /** Rejeita com a mensagem para mostrar (senha incorreta). */
  confirmar: (senha: string) => Promise<void>
}) {
  const [senha, setSenha] = useState('')
  const [repetida, setRepetida] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar() {
    if (!abrir && senha.length < MIN_SENHA) return setErro(`Use pelo menos ${MIN_SENHA} caracteres.`)
    if (!abrir && senha !== repetida) return setErro('As senhas não bateram.')
    if (!senha) return setErro('Digite a senha do backup.')
    setOcupado(true)
    try {
      await confirmar(senha)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu certo. Tente de novo.')
      setOcupado(false)
    }
  }

  const campo = (rotulo: string, valor: string, mudar: (v: string) => void) => (
    <label className="campo">
      <span>{rotulo}</span>
      <input
        type="password"
        autoComplete={abrir ? 'current-password' : 'new-password'}
        value={valor}
        aria-invalid={!!erro}
        aria-describedby={erro ? 'backup-erro' : undefined}
        onChange={(e) => { mudar(e.target.value); setErro('') }}
      />
    </label>
  )

  return (
    <Folha etiqueta="Backup" titulo={abrir ? 'Senha do backup' : 'Proteger o backup'} fechar={fechar} enviar={enviar}>
      {(fecharFolha) => (
        <>
          {abrir ? (
            <p className="folha-texto">Esse arquivo foi salvo com senha. Digite a mesma senha que você escolheu ao fazer o backup.</p>
          ) : (
            <>
              <p className="folha-texto">
                O arquivo sai cifrado. Se ele for parar no Drive, no WhatsApp ou no e-mail, ninguém lê sem a senha.
              </p>
              <p className="folha-aviso">Anote a senha num lugar seguro. Sem ela, nem você abre o backup.</p>
            </>
          )}
          <div className="folha-campos">
            {campo(abrir ? 'Senha' : 'Senha do backup', senha, setSenha)}
            {!abrir && campo('Repita a senha', repetida, setRepetida)}
          </div>
          {erro && <p className="folha-erro" id="backup-erro" role="alert">{erro}</p>}
          <div className="folha-acoes">
            <button type="submit" className="principal" disabled={ocupado}>
              {ocupado ? 'Um instante…' : abrir ? 'Abrir backup' : 'Fazer backup'}
            </button>
            <button type="button" className="folha-cancelar" onClick={fecharFolha}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}
