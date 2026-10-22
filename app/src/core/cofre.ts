// Criptografia dos dados guardados no celular.
//
// Uma chave aleatória (AES-GCM 256) cifra o banco. Ela nunca fica salva
// aberta: fica embrulhada (AES-KW) por uma chave tirada do PIN com PBKDF2 e,
// quando o aparelho deixa, por outra que a digital entrega (extensão PRF do
// WebAuthn). Sem o PIN ou a digital, o que está no IndexedDB é ilegível.

export interface Cifrado {
  iv: Uint8Array
  dados: ArrayBuffer
}

// Em pedaços: o backup com fotos tem megabytes, demais para um só fromCharCode.
export function b64(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let texto = ''
  for (let i = 0; i < b.length; i += 0x8000) texto += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(texto)
}
export const deB64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0))
export const aleatorio = (n: number) => crypto.getRandomValues(new Uint8Array(n))

export const gerarChave = () =>
  crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])

/** Chave que embrulha a dos dados, tirada do PIN. */
export async function chaveDoPin(pin: string, sal: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deB64(sal), iterations: 210_000 },
    base,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

/** Chave que cifra o arquivo de backup, tirada de uma senha escolhida na hora. */
export async function chaveDaSenha(senha: string, sal: Uint8Array, iteracoes: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Chave que embrulha a dos dados, a partir dos 32 bytes que a digital devolve. */
export const chaveDoSegredo = (segredo: BufferSource) =>
  crypto.subtle.importKey('raw', segredo, 'AES-KW', false, ['wrapKey', 'unwrapKey'])

export async function embrulhar(chave: CryptoKey, embrulho: CryptoKey): Promise<string> {
  return b64(await crypto.subtle.wrapKey('raw', chave, embrulho, 'AES-KW'))
}

/** Lança erro se o embrulho não for o certo (PIN errado). */
export function desembrulhar(embrulhada: string, embrulho: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey('raw', deB64(embrulhada), embrulho, 'AES-KW', 'AES-GCM', true, ['encrypt', 'decrypt'])
}

export async function cifrar(chave: CryptoKey, valor: unknown): Promise<Cifrado> {
  const iv = aleatorio(12)
  const dados = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, new TextEncoder().encode(JSON.stringify(valor)))
  return { iv, dados }
}

export async function decifrar<T>(chave: CryptoKey, c: Cifrado): Promise<T> {
  const texto = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: c.iv }, chave, c.dados)
  return JSON.parse(new TextDecoder().decode(texto)) as T
}
