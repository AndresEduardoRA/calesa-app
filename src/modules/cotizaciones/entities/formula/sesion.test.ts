import { describe, expect, it } from 'vitest'
import { mismaVersion, otraSesion } from './sesion'

const P1 = { tipo: 'publicada', id: 'p1' } as const
const P2 = { tipo: 'publicada', id: 'p2' } as const
const B1 = { tipo: 'borrador', id: 'b1' } as const

describe('otraSesion', () => {
  it('la misma versión (también el borrador guardado otra vez) no vuelve a montar', () => {
    expect(otraSesion(B1, { ...B1 })).toBe(false)
    expect(otraSesion(P1, { ...P1 })).toBe(false)
    expect(mismaVersion(null, null)).toBe(true)
  })

  it('guardar sobre la publicada (crea el borrador) no vuelve a montar', () => {
    expect(otraSesion(P1, B1)).toBe(false)
  })

  it('publicar o descartar el borrador, o revertir la publicada sin borrador, sí', () => {
    expect(otraSesion(B1, P2)).toBe(true)
    expect(otraSesion(B1, P1)).toBe(true)
    expect(otraSesion(P1, P2)).toBe(true)
    expect(otraSesion(B1, { tipo: 'borrador', id: 'b2' })).toBe(true)
  })

  it('aparecer o quedarse sin versión, también', () => {
    expect(otraSesion(null, P1)).toBe(true)
    expect(otraSesion(B1, null)).toBe(true)
  })
})
