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

export function exportarBackup(banco: Banco): Blob {
  return new Blob([JSON.stringify(banco)], { type: 'application/json' })
}

export async function lerBackup(arquivo: File): Promise<Banco> {
  const dados = JSON.parse(await arquivo.text())
  if (dados?.versao !== 1 || !Array.isArray(dados.movimentacoes)) {
    throw new Error('Esse arquivo não é um backup do Meu MEI.')
  }
  return dados as Banco
}
