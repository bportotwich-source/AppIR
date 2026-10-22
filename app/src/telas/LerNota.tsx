import { useEffect, useRef, useState } from 'react'
import type { TelaProps } from '../App'
import { brl } from '../core/relatorio'
import { dataCurta, lerValor } from '../core/formato'
import { comprovanteDaChave, comprovantes, formatarCnpj, guardarComprovante, lerQrNfce, novoId, type QrNfce } from '../core/comprovantes'
import { Cabecalho } from '../componentes/Pecas'

interface Detector { detect: (fonte: CanvasImageSource) => Promise<{ rawValue: string }[]> }
declare global {
  interface Window { BarcodeDetector?: new (o: { formats: string[] }) => Detector }
}

/** Procura o QR code na imagem da câmera: leitor do sistema quando existe, jsQR quando não. */
async function criarLeitor(): Promise<(v: HTMLVideoElement) => Promise<string | null>> {
  if (window.BarcodeDetector) {
    const d = new window.BarcodeDetector({ formats: ['qr_code'] })
    return async (v) => (await d.detect(v))[0]?.rawValue ?? null
  }
  const jsQR = (await import('jsqr')).default
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  return async (v) => {
    if (!v.videoWidth) return null
    const escala = Math.min(1, 800 / v.videoWidth)
    canvas.width = v.videoWidth * escala
    canvas.height = v.videoHeight * escala
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    return jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data ?? null
  }
}

export default function LerNota({ banco, mudar, ir, perfil }: TelaProps) {
  const video = useRef<HTMLVideoElement>(null)
  const [semCamera, setSemCamera] = useState(false)
  const [aviso, setAviso] = useState('')
  const [lida, setLida] = useState<QrNfce | null>(null)
  const [loja, setLoja] = useState('')
  const [valor, setValor] = useState('')
  const [digitada, setDigitada] = useState('')

  function aoLer(texto: string) {
    const qr = lerQrNfce(texto)
    if (!qr) {
      setAviso('Esse código não é de um cupom fiscal. Aponte para o QR code no pé do cupom.')
      return false
    }
    const ja = comprovanteDaChave(banco, qr.chave)
    if (ja) {
      ir('comprovante', ja.id)
      return true
    }
    // A loja já lida antes empresta o nome; o QR só traz o CNPJ.
    setLoja(comprovantes(banco).find((c) => c.cnpj === qr.cnpj)?.loja ?? '')
    setValor(qr.valor ? qr.valor.toFixed(2).replace('.', ',') : '')
    setLida(qr)
    return true
  }

  useEffect(() => {
    let parar = false
    let stream: MediaStream | null = null
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (parar) return
        const v = video.current!
        v.srcObject = stream
        await v.play()
        const ler = await criarLeitor()
        while (!parar) {
          const texto = await ler(v).catch(() => null)
          if (texto && !parar && aoLer(texto)) break
          await new Promise((r) => setTimeout(r, 250))
        }
      } catch {
        setSemCamera(true)
      } finally {
        stream?.getTracks().forEach((t) => t.stop())
      }
    })()
    return () => { parar = true; stream?.getTracks().forEach((t) => t.stop()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function salvar() {
    if (!lida) return
    const c = {
      id: novoId(), tipo: 'nfce' as const, perfil: perfil === 'pj' ? 'pj' as const : 'pf' as const, loja: loja.trim() || `Loja ${formatarCnpj(lida.cnpj)}`,
      cnpj: lida.cnpj, data: lida.dia ?? '', mes: lida.mes, valor: lerValor(valor) || 0, chave: lida.chave, url: lida.url || undefined, criadoEm: new Date().toISOString(),
    }
    mudar(guardarComprovante(banco, c))
    ir('comprovante', c.id)
  }

  return (
    <main className="conteudo topo ler-nota">
      <Cabecalho titulo="Ler nota" voltar={() => ir('comprovantes')} rotuloVoltar="Voltar para os comprovantes" />

      {!lida && (
        <>
          {!semCamera ? (
            <div className="camera">
              <video ref={video} muted playsInline aria-label="Imagem da câmera" />
              <span className="camera-mira" aria-hidden="true" />
              <p>Aponte para o QR code no pé do cupom</p>
            </div>
          ) : (
            <p className="aviso">Sem acesso à câmera. Permita a câmera para este site ou digite a chave de acesso de 44 números que vem no cupom.</p>
          )}
          {aviso && <p className="aviso" role="status">{aviso}</p>}
          <form className="folha-campos" onSubmit={(e) => { e.preventDefault(); if (!aoLer(digitada)) setAviso('Chave inválida. Confira os 44 números.') }}>
            <label className="campo">Ou digite a chave de acesso<input inputMode="numeric" value={digitada} onChange={(e) => setDigitada(e.target.value)} placeholder="3526 1012 3456 …" /></label>
            <button className="botao" disabled={digitada.replace(/\D/g, '').length < 44}>Usar chave</button>
          </form>
        </>
      )}

      {lida && (
        <section className="nota-lida sobe" aria-live="polite">
          <span className="rotulo">Nota lida · {lida.uf}</span>
          <h2>{loja || `CNPJ ${formatarCnpj(lida.cnpj)}`}</h2>
          <p className="apoio">{lida.dia ? dataCurta(lida.dia) : `Emitida em ${lida.mes.slice(5)}/${lida.mes.slice(0, 4)}`}{lerValor(valor) > 0 && ` · ${brl(lerValor(valor))}`}</p>
          <div className="folha-campos">
            <label className="campo">Loja<input value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="Ex.: Supermercado Bom Preço" /></label>
            <label className="campo">Total do cupom<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></label>
          </div>
          {!lida.valor && <p className="apoio">Este cupom não traz o total no QR. Com o valor, o app acha a compra no extrato.</p>}
          <button className="principal" disabled={!(lerValor(valor) > 0)} onClick={salvar}>Salvar nota</button>
        </section>
      )}

      <div className="botoes">
        <button className="botao" onClick={() => ir('comprovante', 'novo')}>Foto sem QR</button>
        <button className="botao" onClick={() => ir('comprovante', 'novo')}>Escolher PDF</button>
      </div>
    </main>
  )
}
