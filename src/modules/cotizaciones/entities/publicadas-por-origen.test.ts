import { describe, expect, it } from 'vitest'
import {
  esquemaDeLosIds,
  publicadasPorOrigen,
  TOPE_DE_ORIGENES_DEL_INICIO,
} from './publicadas-por-origen'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

describe('publicadasPorOrigen', () => {
  it('cada id con su versión publicada y su tarjeta', () => {
    const mapa = publicadasPorOrigen([A, B], [{ origen_id: A, version: 3 }], [{ origen_id: A }])
    expect(mapa.get(A)).toEqual({ versionDeLaFormula: 3, tarjetaPublicada: true })
    expect(mapa.get(B)).toEqual({ versionDeLaFormula: null, tarjetaPublicada: false })
  })

  it('una tarjeta sin fórmula se cuenta igual', () => {
    expect(publicadasPorOrigen([B], [], [{ origen_id: B }]).get(B)).toEqual({
      versionDeLaFormula: null,
      tarjetaPublicada: true,
    })
  })

  it('una fila de un id que no se pidió se ignora', () => {
    const mapa = publicadasPorOrigen([A], [{ origen_id: C, version: 1 }], [{ origen_id: C }])
    expect([...mapa.keys()]).toEqual([A])
    expect(mapa.get(A)).toEqual({ versionDeLaFormula: null, tarjetaPublicada: false })
  })
})

describe('esquemaDeLosIds', () => {
  it('sólo uuid y a lo sumo el tope', () => {
    expect(esquemaDeLosIds.safeParse([A, B]).success).toBe(true)
    expect(esquemaDeLosIds.safeParse(['general']).success).toBe(false)
    expect(esquemaDeLosIds.safeParse(Array(TOPE_DE_ORIGENES_DEL_INICIO + 1).fill(A)).success).toBe(
      false,
    )
  })
})
