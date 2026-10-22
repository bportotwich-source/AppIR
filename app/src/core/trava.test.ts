import { beforeEach, describe, expect, it } from 'vitest'
import { conferirPin, criarPin, digitosDoPin, ESPERA_MS, ler, MAX_TENTATIVAS, removerTrava } from './trava'

const memoria = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, v),
  removeItem: (k: string) => void memoria.delete(k),
} as Storage

describe('trava', () => {
  beforeEach(() => memoria.clear())

  it('guarda só o hash e confere o PIN', async () => {
    await criarPin('1234')
    expect(JSON.stringify(ler())).not.toContain('1234')
    expect(await conferirPin('1234')).toEqual({ ok: true })
    expect(await conferirPin('0000')).toMatchObject({ ok: false, restantes: MAX_TENTATIVAS - 1 })
  })

  it('espera depois de tentativas demais e libera depois', async () => {
    await criarPin('1234')
    const agora = 1_000_000
    for (let i = 0; i < MAX_TENTATIVAS - 1; i++) await conferirPin('0000', agora)
    const r = await conferirPin('0000', agora)
    expect(r).toMatchObject({ ok: false, bloqueadaAte: agora + ESPERA_MS })
    expect(await conferirPin('1234', agora + 1000)).toMatchObject({ ok: false })
    expect(await conferirPin('1234', agora + ESPERA_MS + 1)).toEqual({ ok: true })
  })

  it('sem PIN, fica aberto', async () => {
    removerTrava()
    expect(await conferirPin('9999')).toEqual({ ok: true })
  })

  it('lembra quantos dígitos o PIN tem (os antigos são de 4)', async () => {
    await criarPin('123456')
    expect(digitosDoPin()).toBe(6)
    expect(await conferirPin('123456')).toEqual({ ok: true })
    expect(digitosDoPin({ ...ler()!, digitos: undefined })).toBe(4)
  })
})
