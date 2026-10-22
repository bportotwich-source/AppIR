// Persistência no navegador (IndexedDB). O banco inteiro é um único registro:
// para um MEI são poucas centenas de movimentações por ano.

import { openDB } from 'idb'
import { bancoVazio, type Banco } from './banco'
import { aleatorio, b64, chaveDaSenha, cifrar, deB64, decifrar, type Cifrado } from './cofre'

const db = () =>
  openDB('meu-mei', 1, {
    upgrade(d) {
      d.createObjectStore('estado')
    },
  })

// Com a criptografia ligada, o banco fica cifrado no registro 'cofre' e a
// chave só existe na memória enquanto o app está destravado.
let chave: CryptoKey | null = null
export const usarChave = (c: CryptoKey | null) => { chave = c }
export const chaveAtual = () => chave

/** null = os dados estão cifrados e falta destravar com PIN ou digital. */
export async function carregar(): Promise<Banco | null> {
  const d = await db()
  const cofre = (await d.get('estado', 'cofre')) as Cifrado | undefined
  if (cofre) return chave ? decifrar<Banco>(chave, cofre) : null
  return ((await d.get('estado', 'banco')) as Banco | undefined) ?? bancoVazio()
}

export async function salvar(banco: Banco): Promise<void> {
  const c = chave
  const d = await db()
  if (c) {
    await d.put('estado', await cifrar(c, banco), 'cofre')
    await d.delete('estado', 'banco')
  } else {
    await d.put('estado', banco, 'banco')
    await d.delete('estado', 'cofre')
  }
}

export async function apagarTudo(): Promise<void> {
  chave = null
  await (await db()).clear('estado')
}

// Sem backup novo há mais que isso, e com mudanças desde o último, o Início lembra.
export const DIAS_LEMBRETE_BACKUP = 14
const DIA_MS = 86_400_000

/** Quantos dias desde o último backup, quando vale lembrar de fazer outro.
 * null = não precisa lembrar; Infinity = nunca fez backup.
 */
export function backupAtrasado(banco: Banco, agora = new Date()): number | null {
  if (banco.movimentacoes.length === 0) return null
  if (!banco.ultimoBackup) return Infinity
  if (!banco.alteradoEm || banco.alteradoEm <= banco.ultimoBackup) return null
  const dias = Math.floor((agora.getTime() - new Date(banco.ultimoBackup).getTime()) / DIA_MS)
  return dias >= DIAS_LEMBRETE_BACKUP ? dias : null
}

// O arquivo de backup sai cifrado com uma senha (AES-GCM, chave tirada com
// PBKDF2). Quem pegar o arquivo no Drive ou no WhatsApp não lê nada sem ela.
const ITERACOES_BACKUP = 600_000

interface BackupCifrado {
  app: 'meu-mei'
  versao: 1
  cifrado: { sal: string; iv: string; dados: string; iteracoes: number }
}

/** O arquivo tem senha e ela não foi dada: a tela pede e tenta de novo. */
export class BackupComSenha extends Error {
  constructor() {
    super('Esse backup tem senha.')
  }
}

export async function gerarBackup(banco: Banco, senha: string): Promise<string> {
  const sal = aleatorio(16)
  const { iv, dados } = await cifrar(await chaveDaSenha(senha, sal, ITERACOES_BACKUP), banco)
  const arquivo: BackupCifrado = { app: 'meu-mei', versao: 1, cifrado: { sal: b64(sal), iv: b64(iv), dados: b64(dados), iteracoes: ITERACOES_BACKUP } }
  return JSON.stringify(arquivo)
}

/** Abre o texto de um backup, com senha ou dos antigos, que saíam abertos. */
export async function abrirBackup(texto: string, senha?: string): Promise<Banco> {
  let dados
  try {
    dados = JSON.parse(texto)
  } catch {
    dados = null
  }
  if (dados?.app === 'meu-mei' && dados.cifrado) {
    if (!senha) throw new BackupComSenha()
    const c = dados.cifrado
    try {
      const chave = await chaveDaSenha(senha, deB64(c.sal), c.iteracoes)
      dados = await decifrar(chave, { iv: deB64(c.iv), dados: deB64(c.dados).buffer as ArrayBuffer })
    } catch {
      throw new Error('Senha incorreta.')
    }
  }
  if (dados?.versao !== 1 || !Array.isArray(dados.movimentacoes)) {
    throw new Error('Esse arquivo não é um backup do Meu MEI.')
  }
  return dados as Banco
}

/** Entrega o backup: pelo compartilhar do celular (Drive, WhatsApp, e-mail)
 * quando o aparelho deixa, senão como download. Devolve o banco com a data
 * do backup, ou null se a pessoa cancelou.
 */
export async function enviarBackup(banco: Banco, senha: string, agora = new Date()): Promise<Banco | null> {
  const novo = { ...banco, ultimoBackup: agora.toISOString() }
  const nome = `meu-mei-backup-${agora.toISOString().slice(0, 10)}.json`
  const arquivo = new File([await gerarBackup(novo, senha)], nome, { type: 'application/json' })
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: 'Backup do Meu MEI' })
      return novo
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return null
      // outro erro: cai no download
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(arquivo)
  a.download = nome
  a.click()
  URL.revokeObjectURL(a.href)
  return novo
}

export async function lerBackup(arquivo: File, senha?: string): Promise<Banco> {
  return abrirBackup(await arquivo.text(), senha)
}
