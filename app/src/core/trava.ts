// Trava do app: PIN de 4 dígitos e, se o aparelho tiver, digital.
//
// Sozinha, a trava protege a tela. Com o cofre ligado, ela também guarda a
// chave que cifra os dados (veja cofre.ts). O PIN fica só como hash com sal,
// e a digital usa a biometria do próprio aparelho (WebAuthn) sem servidor.

import type { Banco } from './banco'
import { aleatorio, b64, chaveDoPin, chaveDoSegredo, deB64, desembrulhar, embrulhar, gerarChave } from './cofre'
import { chaveAtual, salvar, usarChave } from './store'

const CHAVE = 'meu-mei:trava'
export const MAX_TENTATIVAS = 5
export const ESPERA_MS = 5 * 60_000
// PIN novo tem 6 dígitos; quem criou com 4 continua com 4 até trocar.
export const DIGITOS_PIN = 6

export interface Trava {
  sal: string
  hash: string
  digital: string | null // id da credencial, em base64
  erros: number
  bloqueadaAte: number // timestamp em ms; 0 = livre
  digitos?: number // ausente = 4, dos PINs antigos
  cofre?: Cofre
}

/** Chave dos dados embrulhada pelo PIN e, se der, pela digital. */
export interface Cofre {
  sal: string
  pin: string
  prfSal: string
  digital?: string
}

export async function hashPin(pin: string, sal: string): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deB64(sal), iterations: 210_000 },
    chave,
    256,
  )
  return b64(bits)
}

export function ler(): Trava | null {
  try {
    const t = JSON.parse(localStorage.getItem(CHAVE) ?? 'null')
    return t && typeof t.hash === 'string' ? (t as Trava) : null
  } catch {
    return null
  }
}

export const digitosDoPin = (t: Trava | null = ler()) => t?.digitos ?? 4

function gravar(t: Trava | null) {
  if (t) localStorage.setItem(CHAVE, JSON.stringify(t))
  else localStorage.removeItem(CHAVE)
}

export async function criarPin(pin: string): Promise<void> {
  const antes = ler()
  const sal = b64(aleatorio(16))
  let cofre = antes?.cofre
  const chave = chaveAtual()
  // Trocar o PIN com o cofre ligado reembrulha a chave (o app está destravado).
  if (cofre && chave) {
    const salCofre = b64(aleatorio(16))
    cofre = { ...cofre, sal: salCofre, pin: await embrulhar(chave, await chaveDoPin(pin, salCofre)) }
  }
  gravar({ sal, hash: await hashPin(pin, sal), digital: antes?.digital ?? null, erros: 0, bloqueadaAte: 0, digitos: pin.length, cofre })
}

export function removerTrava() {
  gravar(null)
}

export type Resultado = { ok: true } | { ok: false; restantes: number; bloqueadaAte: number }

export async function conferirPin(pin: string, agora = Date.now()): Promise<Resultado> {
  const t = ler()
  if (!t) return { ok: true }
  if (t.bloqueadaAte > agora) return { ok: false, restantes: 0, bloqueadaAte: t.bloqueadaAte }
  if ((await hashPin(pin, t.sal)) === t.hash) {
    if (t.cofre) usarChave(await desembrulhar(t.cofre.pin, await chaveDoPin(pin, t.cofre.sal)))
    gravar({ ...t, erros: 0, bloqueadaAte: 0 })
    return { ok: true }
  }
  const erros = t.erros + 1
  const bloqueadaAte = erros >= MAX_TENTATIVAS ? agora + ESPERA_MS : 0
  gravar({ ...t, erros: bloqueadaAte ? 0 : erros, bloqueadaAte })
  return { ok: false, restantes: bloqueadaAte ? 0 : MAX_TENTATIVAS - erros, bloqueadaAte }
}

export async function digitalDisponivel(): Promise<boolean> {
  try {
    return (
      typeof PublicKeyCredential !== 'undefined' &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    )
  } catch {
    return false
  }
}

/** Com o cofre ligado, a digital só abre se o aparelho tiver PRF. */
export const digitalAbreCofre = (t: Trava | null) => !!t?.digital && (!t.cofre || !!t.cofre.digital)

// Pede a digital com a extensão PRF e devolve os 32 bytes secretos, se vierem.
async function segredoDaDigital(t: Trava, prfSal: string): Promise<ArrayBuffer | null> {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: aleatorio(32),
      allowCredentials: [{ type: 'public-key', id: deB64(t.digital!) }],
      userVerification: 'required',
      timeout: 60_000,
      extensions: { prf: { eval: { first: deB64(prfSal) } } },
    },
  })) as PublicKeyCredential | null
  const primeiro = cred?.getClientExtensionResults().prf?.results?.first
  if (!primeiro) return null
  return primeiro instanceof ArrayBuffer ? primeiro : (primeiro.buffer.slice(primeiro.byteOffset, primeiro.byteOffset + primeiro.byteLength) as ArrayBuffer)
}

/** Embrulha a chave dos dados também com a digital. Pede o dedo uma vez.
 * Resolve false se o aparelho não entrega o segredo (sem PRF). */
async function embrulharComDigital(): Promise<boolean> {
  const t = ler()
  const chave = chaveAtual()
  if (!t?.digital || !t.cofre || !chave) return false
  try {
    const segredo = await segredoDaDigital(t, t.cofre.prfSal)
    if (!segredo) return false
    gravar({ ...t, cofre: { ...t.cofre, digital: await embrulhar(chave, await chaveDoSegredo(segredo)) } })
    return true
  } catch {
    return false
  }
}

/** Liga a criptografia: confere o PIN, cria a chave e salva o banco cifrado.
 * Resolve se a digital continua servindo para abrir. */
export async function ligarCofre(pin: string, banco: Banco): Promise<{ digital: boolean }> {
  const t = ler()
  if (!t || (await hashPin(pin, t.sal)) !== t.hash) throw new Error('PIN incorreto.')
  const chave = await gerarChave()
  const cofre: Cofre = { sal: b64(aleatorio(16)), pin: '', prfSal: b64(aleatorio(32)) }
  cofre.pin = await embrulhar(chave, await chaveDoPin(pin, cofre.sal))
  usarChave(chave)
  await salvar(banco)
  gravar({ ...t, cofre })
  return { digital: t.digital ? await embrulharComDigital() : false }
}

/** Desliga a criptografia: o banco volta a ficar salvo aberto. */
export async function desligarCofre(banco: Banco): Promise<void> {
  usarChave(null)
  await salvar(banco)
  const t = ler()
  if (t) gravar({ ...t, cofre: undefined })
}

export async function cadastrarDigital(): Promise<void> {
  const t = ler()
  if (!t) throw new Error('Crie um PIN antes de usar a digital.')
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: aleatorio(32),
      rp: { name: 'Meu MEI' },
      user: { id: aleatorio(16), name: 'meu-mei', displayName: 'Meu MEI' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
      extensions: { prf: {} },
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('A digital não foi cadastrada.')
  const { cofre, ...resto } = t
  gravar({ ...resto, digital: b64(cred.rawId), cofre: cofre && { ...cofre, digital: undefined } })
}

/** Depois de cadastrar a digital com o cofre ligado: ela também abre os dados? */
export const prepararDigitalNoCofre = embrulharComDigital

export function removerDigital() {
  const t = ler()
  if (t) gravar({ ...t, digital: null, cofre: t.cofre && { ...t.cofre, digital: undefined } })
}

/** Pede a digital ao aparelho. Resolve true se a pessoa passou pelo sensor. */
export async function entrarComDigital(): Promise<boolean> {
  const t = ler()
  if (!t?.digital) return false
  try {
    if (t.cofre) {
      if (!t.cofre.digital) return false
      const segredo = await segredoDaDigital(t, t.cofre.prfSal)
      if (!segredo) return false
      usarChave(await desembrulhar(t.cofre.digital, await chaveDoSegredo(segredo)))
      gravar({ ...t, erros: 0, bloqueadaAte: 0 })
      return true
    }
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: aleatorio(32),
        allowCredentials: [{ type: 'public-key', id: deB64(t.digital) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    if (!cred) return false
    gravar({ ...t, erros: 0, bloqueadaAte: 0 })
    return true
  } catch {
    return false
  }
}
