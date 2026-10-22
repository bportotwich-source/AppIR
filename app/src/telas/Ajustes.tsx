import { useEffect, useState } from 'react'
import type { TelaProps } from '../App'
import { enviarBackup, lerBackup } from '../core/store'
import { CampoAbertura } from '../componentes/CampoAbertura'
import { brl, LIMITE_ANUAL, limiteAnual } from '../core/relatorio'
import { instalado } from '../core/armazenamento'
import { dataCurta, lerValor } from '../core/formato'
import { cadastrarDigital, desligarCofre, digitalDisponivel, ler as lerTrava, ligarCofre, prepararDigitalNoCofre, removerDigital, removerTrava } from '../core/trava'
import FolhaCofre from '../componentes/FolhaCofre'

export default function Ajustes({ banco, mudar, ir, criarPin, dadosProtegidos }: TelaProps) {
  const [trava, setTrava] = useState(lerTrava)
  const [podeDigital, setPodeDigital] = useState(false)
  const [avisoTrava, setAvisoTrava] = useState('')
  const [folhaCofre, setFolhaCofre] = useState<'ligar' | 'desligar' | null>(null)
  useEffect(() => {
    digitalDisponivel().then(setPodeDigital)
  }, [])

  async function ligarDigital() {
    try {
      await cadastrarDigital()
      // Com os dados cifrados, a digital precisa embrulhar a chave: pede o dedo de novo.
      const abre = !lerTrava()?.cofre || (await prepararDigitalNoCofre())
      setTrava(lerTrava())
      setAvisoTrava(abre
        ? 'Digital cadastrada. Na próxima vez, é só encostar o dedo.'
        : 'Digital cadastrada, mas este aparelho não consegue abrir dados criptografados com ela. Use o PIN.')
    } catch {
      setAvisoTrava('Não deu para cadastrar a digital. Tente de novo.')
    }
  }

  async function cofre(pin: string) {
    if (folhaCofre === 'ligar') {
      const { digital } = await ligarCofre(pin, banco)
      setAvisoTrava(trava?.digital && !digital
        ? 'Dados criptografados. Este aparelho não consegue abrir dados criptografados com a digital, então o app vai pedir o PIN.'
        : 'Dados criptografados neste celular.')
    } else {
      await desligarCofre(banco)
      setAvisoTrava('')
    }
    setTrava(lerTrava())
    setFolhaCofre(null)
  }

  async function desligarPin() {
    if (trava?.cofre) await desligarCofre(banco)
    removerTrava()
    setTrava(null)
    setAvisoTrava('')
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
        <CampoAbertura valor={banco.abertura} anual={limiteAnual(banco)} mudar={(abertura) => mudar({ ...banco, abertura })} />
        <label className="campo campo-limite">
          <span>Limite anual do MEI</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            defaultValue={brl(limiteAnual(banco)).replace('R$ ', '')}
            onBlur={(e) => {
              const v = lerValor(e.target.value)
              // Valor vazio ou absurdo volta para o da lei.
              const novo = v >= 10_000 && v <= 10_000_000 && v !== LIMITE_ANUAL ? v : undefined
              e.target.value = brl(novo ?? LIMITE_ANUAL).replace('R$ ', '')
              if (novo !== banco.limiteAnual) mudar({ ...banco, limiteAnual: novo })
            }}
          />
        </label>
        <p className="apoio">
          {banco.limiteAnual
            ? `Usando ${brl(banco.limiteAnual)} no lugar dos ${brl(LIMITE_ANUAL)} da lei. Apague o campo para voltar.`
            : `Hoje a lei diz ${brl(LIMITE_ANUAL)} por ano. Se o teto mudar, troque aqui.`}
        </p>
      </section>

      <section>
        <h2>Marcações</h2>
        <p className="apoio">
          {Object.keys(banco.regras).length + Object.keys(banco.regrasSaida ?? {}).length} pagadores e destinos lembrados. Veja, corrija ou esqueça.
        </p>
        <div className="botoes">
          <button onClick={() => ir('pagadores')}>Pagadores lembrados</button>
          <button onClick={() => ir('movimentacoes')}>Todas as movimentações</button>
        </div>
      </section>

      <section>
        <h2>Segurança</h2>
        <p className="apoio">
          {trava
            ? `O app pede PIN${trava.digital && (!trava.cofre || trava.cofre.digital) ? ' ou digital' : ''} ao abrir e depois de 1 minuto fora dele.`
            : 'Peça um PIN para abrir o app. Com ele, dá para criptografar os dados guardados no celular.'}
        </p>
        {trava && (
          <button type="button" role="switch" aria-checked={!!trava.cofre} className="chave-lembrar ajustes-chave" onClick={() => setFolhaCofre(trava.cofre ? 'desligar' : 'ligar')}>
            <span>
              <b>Criptografar os dados</b>
              <span>{trava.cofre ? 'Só abrem com o PIN ou a digital' : 'Sem o PIN, ninguém lê os extratos'}</span>
            </span>
            <span className="chave-trilho" aria-hidden="true"><span /></span>
          </button>
        )}
        <div className="botoes">
          {trava ? (
            <>
              <button onClick={criarPin}>Trocar PIN</button>
              <button onClick={desligarPin}>Desligar PIN</button>
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
          {trava?.cofre && ' O arquivo de backup sai sem criptografia: guarde num lugar só seu.'}
        </p>
        <div className="botoes">
          <button onClick={baixarBackup}>Fazer backup</button>
          <label className="botao">
            <input type="file" accept="application/json" onChange={(e) => restaurar(e.target.files?.[0])} />
            Restaurar backup
          </label>
        </div>
      </section>

      {folhaCofre && <FolhaCofre ligar={folhaCofre === 'ligar'} fechar={() => setFolhaCofre(null)} confirmar={cofre} />}
    </main>
  )
}
