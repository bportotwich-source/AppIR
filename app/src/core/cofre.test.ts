import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { bancoVazio } from './banco'
import { chaveDoPin, cifrar, decifrar, desembrulhar, embrulhar, gerarChave } from './cofre'
import { apagarTudo, carregar, salvar, usarChave } from './store'
import { conferirPin, criarPin, desligarCofre, ler, ligarCofre } from './trava'

const memoria = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, v),
  removeItem: (k: string) => void memoria.delete(k),
} as Storage

const comDados = () => ({ ...bancoVazio(), empresa: { nome: 'Fulana de Tal' } })

describe('cofre', () => {
  beforeEach(async () => {
    memoria.clear()
    await apagarTudo()
  })

  it('cifra e decifra, e o PIN errado não desembrulha a chave', async () => {
    const chave = await gerarChave()
    const c = await cifrar(chave, { a: 1 })
    expect(await decifrar(chave, c)).toEqual({ a: 1 })
    const embrulhada = await embrulhar(chave, await chaveDoPin('1234', 'AAAAAAAAAAAAAAAAAAAAAA=='))
    await expect(desembrulhar(embrulhada, await chaveDoPin('4321', 'AAAAAAAAAAAAAAAAAAAAAA=='))).rejects.toThrow()
  })

  it('ligado, só abre os dados com o PIN', async () => {
    await criarPin('1234')
    await expect(ligarCofre('0000', comDados())).rejects.toThrow()
    expect(await ligarCofre('1234', comDados())).toEqual({ digital: false })
    expect(JSON.stringify(ler())).not.toContain('Fulana')

    usarChave(null) // o app travou
    expect(await carregar()).toBeNull()
    expect((await conferirPin('0000')).ok).toBe(false)
    expect(await carregar()).toBeNull()
    expect((await conferirPin('1234')).ok).toBe(true)
    expect((await carregar())?.empresa?.nome).toBe('Fulana de Tal')
  })

  it('trocar o PIN reembrulha a chave', async () => {
    await criarPin('1234')
    await ligarCofre('1234', comDados())
    await criarPin('5678')
    usarChave(null)
    expect((await conferirPin('5678')).ok).toBe(true)
    expect((await carregar())?.empresa?.nome).toBe('Fulana de Tal')
  })

  it('desligado, os dados voltam a abrir sem PIN', async () => {
    await criarPin('1234')
    await ligarCofre('1234', comDados())
    await salvar({ ...comDados(), empresa: { nome: 'Outra' } })
    await desligarCofre((await carregar())!)
    expect(ler()?.cofre).toBeUndefined()
    expect((await carregar())?.empresa?.nome).toBe('Outra')
  })
})
