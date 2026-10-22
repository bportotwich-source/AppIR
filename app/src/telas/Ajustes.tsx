import { useEffect, useState } from 'react'
import type { TelaProps } from '../App'
import { enviarBackup, lerBackup } from '../core/store'
import { CampoAbertura } from '../componentes/CampoAbertura'
import { instalado } from '../core/armazenamento'
import { dataCurta } from '../core/formato'
import { cadastrarDigital, digitalDisponivel, ler as lerTrava, removerDigital, removerTrava } from '../core/trava'

export default function Ajustes({ banco, mudar, ir, criarPin, dadosProtegidos }: TelaProps) {
  const [trava, setTrava] = useState(lerTrava)
  const [podeDigital, setPodeDigital] = useState(false)
  const [avisoTrava, setAvisoTrava] = useState('')
  useEffect(() => {
    digitalDisponivel().then(setPodeDigital)
  }, [])

  async function ligarDigital() {
    try {
      await cadastrarDigital()
      setTrava(lerTrava())
      setAvisoTrava('Digital cadastrada. Na próxima vez, é só encostar o dedo.')
    } catch {
      setAvisoTrava('Não deu para cadastrar a digital. Tente de novo.')
    }
  }

  async function baixarBackup() {
    const novo = await enviarBackup(banco)
    if (novo) mudar(novo)
  }

  async function restaurar(arquivo: File | undefined) {
    if (!arquivo) return
    try {
      const novo = await lerBackup(arquivo)
      if (confirm(`Substituir os dados deste celular por ${novo.movimentacoes.length} movimentações do backup?`)) mudar(novo)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Backup inválido.')
    }
  }

  return (
    <main className="conteudo topo">
      <button className="voltar" onClick={() => ir('inicio')}>
        <span aria-hidden="true">←</span> Início
      </button>
      <h1>Ajustes</h1>

      <section>
        <h2>Sua empresa</h2>
        <CampoAbertura valor={banco.abertura} mudar={(abertura) => mudar({ ...banco, abertura })} />
      </section>

      <section>
        <h2>Segurança</h2>
        <p className="apoio">
          {trava
            ? `O app pede PIN${trava.digital ? ' ou digital' : ''} ao abrir e depois de 1 minuto fora dele.`
            : 'Peça um PIN para abrir o app. Ele tranca a tela; os dados no celular não ficam criptografados.'}
        </p>
        <div className="botoes">
          {trava ? (
            <>
              <button onClick={criarPin}>Trocar PIN</button>
              <button onClick={() => { removerTrava(); setTrava(null); setAvisoTrava('') }}>Desligar PIN</button>
            </>
          ) : (
            <button onClick={criarPin}>Proteger com PIN</button>
          )}
          {trava && podeDigital && !trava.digital && <button onClick={ligarDigital}>Entrar com digital</button>}
          {trava?.digital && <button onClick={() => { removerDigital(); setTrava(lerTrava()) }}>Desligar digital</button>}
        </div>
        {trava && !podeDigital && <p className="apoio">Este aparelho ou navegador não oferece leitor de digital para sites.</p>}
        {avisoTrava && <p className="apoio" aria-live="polite">{avisoTrava}</p>}
      </section>

      <section>
        <h2>Backup</h2>
        <p className="apoio">
          Os dados ficam só neste celular.{' '}
          {instalado() || dadosProtegidos
            ? 'O navegador foi avisado para não apagá-los.'
            : 'Instale o app na tela de início para o navegador não apagá-los.'}{' '}
          {banco.ultimoBackup ? `Último backup em ${dataCurta(banco.ultimoBackup.slice(0, 10))}.` : 'Você ainda não fez backup.'}
        </p>
        <div className="botoes">
          <button onClick={baixarBackup}>Fazer backup</button>
          <label className="botao">
            <input type="file" accept="application/json" onChange={(e) => restaurar(e.target.files?.[0])} />
            Restaurar backup
          </label>
        </div>
      </section>
    </main>
  )
}
