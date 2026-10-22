// Trava do app: PIN de 4 dígitos e, se o aparelho tiver, digital.
//
// A trava protege a tela, não os dados: o extrato continua guardado no
// navegador sem criptografia. O PIN fica só como hash com sal, e a digital
// usa a biometria do próprio aparelho (WebAuthn) sem servidor: ela confirma
// que quem está segurando o celular passou pelo sensor.

const CHAVE = 'meu-mei:trava'
export const MAX_TENTATIVAS = 5
export const ESPERA_MS = 5 * 60_000

export interface Trava {
  sal: string
  hash: string
  digital: string | null // id da credencial, em base64
  erros: number
  bloqueadaAte: number // timestamp em ms; 0 = livre
}

const b64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))))
const deB64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0))
const aleatorio = (n: number) => crypto.getRandomValues(new Uint8Array(n))

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

function gravar(t: Trava | null) {
  if (t) localStorage.setItem(CHAVE, JSON.stringify(t))
  else localStorage.removeItem(CHAVE)
}

export async function criarPin(pin: string): Promise<void> {
  const sal = b64(aleatorio(16))
  gravar({ sal, hash: await hashPin(pin, sal), digital: ler()?.digital ?? null, erros: 0, bloqueadaAte: 0 })
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
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('A digital não foi cadastrada.')
  gravar({ ...t, digital: b64(cred.rawId) })
}

export function removerDigital() {
  const t = ler()
  if (t) gravar({ ...t, digital: null })
}

/** Pede a digital ao aparelho. Resolve true se a pessoa passou pelo sensor. */
export async function entrarComDigital(): Promise<boolean> {
  const t = ler()
  if (!t?.digital) return false
  try {
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
