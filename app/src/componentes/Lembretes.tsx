// Avisos do aparelho que valem para os dois perfis: backup e instalação.

import { useState } from 'react'
import type { TelaProps } from '../App'
import { dadosEmRisco, ehIphone } from '../core/armazenamento'
import { backupAtrasado, enviarBackup } from '../core/store'
import FolhaBackup from './FolhaBackup'

export function LembretesAparelho({ banco, mudar, dadosProtegidos, instalar, comDados }: Pick<TelaProps, 'banco' | 'mudar' | 'dadosProtegidos' | 'instalar'> & { comDados: boolean }) {
  const [backupFalhou, setBackupFalhou] = useState(false)
  const [pedindoSenha, setPedindoSenha] = useState(false)
  const diasBackup = backupAtrasado(banco)

  async function fazerBackup(senha: string) {
    try {
      const novo = await enviarBackup(banco, senha)
      if (novo) mudar(novo)
    } catch {
      setBackupFalhou(true)
    }
    setPedindoSenha(false)
  }

  return (
    <>
      {diasBackup !== null && (
        <section className="lembrete" aria-labelledby="backup-titulo">
          <b id="backup-titulo">{diasBackup === Infinity ? 'Você ainda não fez backup' : `Último backup há ${diasBackup} dias`}</b>
          <span>Se o celular quebrar ou o navegador limpar os dados, os extratos e as marcações somem. Guarde uma cópia no Drive, no WhatsApp ou no e-mail.</span>
          <button className="principal" onClick={() => setPedindoSenha(true)}>Fazer backup agora</button>
          {backupFalhou && <span role="alert">Não deu para gerar o backup. Tente pela tela Ajustes.</span>}
        </section>
      )}
      {pedindoSenha && <FolhaBackup abrir={false} fechar={() => setPedindoSenha(false)} confirmar={fazerBackup} />}

      {comDados && dadosEmRisco(dadosProtegidos) && (
        <section className="lembrete" aria-labelledby="instalar-titulo">
          <b id="instalar-titulo">Instale o app na tela de início</b>
          {ehIphone() ? (
            <span>No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Aberto pelo navegador, o iPhone pode apagar os dados depois de alguns dias sem uso.</span>
          ) : (
            <span>
              Assim o navegador não apaga seus dados quando faltar espaço no celular.
              {!instalar && ' No Chrome, abra o menu ⋮ e toque em Instalar app.'}
            </span>
          )}
          {instalar && <button className="principal" onClick={instalar}>Instalar app</button>}
        </section>
      )}
    </>
  )
}
