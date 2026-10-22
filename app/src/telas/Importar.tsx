import { useEffect, useState } from 'react'
import type { TelaProps } from '../App'
import { importar } from '../core/banco'
import { lerArquivo } from '../core/arquivos'
import { enviarBackup, lerBackup } from '../core/store'
import { CampoAbertura } from '../componentes/CampoAbertura'
import { instalado } from '../core/armazenamento'
import { dataCurta } from '../core/formato'
import { cadastrarDigital, digitalDisponivel, ler as lerTrava, removerDigital, removerTrava } from '../core/trava'

type Resultado =
  | { tipo: 'ok'; arquivo: string; lidas: number; novas: number; repetidas: number; aRevisar: number }
  | { tipo: 'erro'; mensagem: string }

export default function Importar({ banco, mudar, ir, criarPin, dadosProtegidos }: TelaProps) {
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

  const [lendo, setLendo] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function aoEscolher(arquivo: File | undefined) {
    if (!arquivo) return
    setLendo(true)
    setResultado(null)
    try {
      const movs = await lerArquivo(arquivo)
      if (movs.length === 0) throw new Error('Nenhuma movimentação encontrada. Esse arquivo é o extrato do Nubank PJ?')
      const r = importar(banco, movs, arquivo.name)
      mudar(r.banco)
      const ids = new Set(banco.movimentacoes.map((m) => m.id))
      const aRevisar = r.banco.movimentacoes.filter((m) => !ids.has(m.id) && m.faturamento === null).length
      setResultado({ tipo: 'ok', arquivo: arquivo.name, lidas: movs.length, novas: r.novas, repetidas: r.repetidas, aRevisar })
    } catch (e) {
      setResultado({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Não deu para ler esse arquivo.' })
    } finally {
      setLendo(false)
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
      <h1>Importar extrato</h1>
      <p className="apoio">Use o extrato do Nubank PJ em OFX (o mais confiável), CSV ou PDF. Ele é lido aqui e não sai do celular.</p>

      <label className="envio">
        <input type="file" accept=".ofx,.csv,.pdf,application/pdf,text/csv,application/x-ofx" disabled={lendo} onChange={(e) => aoEscolher(e.target.files?.[0])} />
        <b>{lendo ? 'Lendo o extrato…' : 'Escolher arquivo do extrato'}</b>
        <span>Toque para abrir os arquivos</span>
      </label>

      {resultado?.tipo === 'erro' && <p className="aviso perigo" role="alert">{resultado.mensagem}</p>}
      {resultado?.tipo === 'ok' && (
        <section className="recibo" aria-live="polite">
          <span className="rotulo">Leitura do extrato</span>
          <p className="arquivo">{resultado.arquivo}</p>
          <dl>
            <div><dt>Movimentações lidas</dt><dd>{resultado.lidas}</dd></div>
            <div><dt>Novas</dt><dd>{resultado.novas}</dd></div>
            <div><dt>Já importadas, ignoradas</dt><dd>{resultado.repetidas}</dd></div>
            <div><dt>Entradas para revisar</dt><dd>{resultado.aRevisar}</dd></div>
          </dl>
          {resultado.aRevisar > 0 && (
            <button className="principal" onClick={() => ir('revisar')}>Revisar {resultado.aRevisar} entradas</button>
          )}
        </section>
      )}

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
