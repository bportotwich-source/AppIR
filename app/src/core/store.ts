// Persistência no navegador (IndexedDB). O banco inteiro é um único registro:
// para um MEI são poucas centenas de movimentações por ano.

import { openDB } from 'idb'
import { bancoVazio, type Banco } from './banco'

const db = () =>
  openDB('meu-mei', 1, {
    upgrade(d) {
      d.createObjectStore('estado')
    },
  })

export async function carregar(): Promise<Banco> {
  return ((await (await db()).get('estado', 'banco')) as Banco | undefined) ?? bancoVazio()
}

export async function salvar(banco: Banco): Promise<void> {
  await (await db()).put('estado', banco, 'banco')
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

/** Entrega o backup: pelo compartilhar do celular (Drive, WhatsApp, e-mail)
 * quando o aparelho deixa, senão como download. Devolve o banco com a data
 * do backup, ou null se a pessoa cancelou.
 */
export async function enviarBackup(banco: Banco, agora = new Date()): Promise<Banco | null> {
  const novo = { ...banco, ultimoBackup: agora.toISOString() }
  const nome = `meu-mei-backup-${agora.toISOString().slice(0, 10)}.json`
  const arquivo = new File([JSON.stringify(novo)], nome, { type: 'application/json' })
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

export async function lerBackup(arquivo: File): Promise<Banco> {
  const dados = JSON.parse(await arquivo.text())
  if (dados?.versao !== 1 || !Array.isArray(dados.movimentacoes)) {
    throw new Error('Esse arquivo não é um backup do Meu MEI.')
  }
  return dados as Banco
}
