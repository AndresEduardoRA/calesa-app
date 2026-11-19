import { describe, expect, it } from 'vitest'
import { PLANTILLAS_DE_V1 } from '../plantillas-de-v1'
import { esquemaDeDatosDePlantillasDeV1 } from './datos-de-plantillas-de-v1'
import { datosDePlantillasDeV1 } from './plantillas-de-v1'

describe('esquemaDeDatosDePlantillasDeV1', () => {
  const datos = datosDePlantillasDeV1(PLANTILLAS_DE_V1, {
    origen: 'X',
    catalogo: [],
    tiposDeCambio: [],
    campos: [],
    borradores: {
      formula: { autor: 'Ana', tuyo: true, actualizadoEn: '2026-11-19T20:00:00.123456+00:00' },
      tarjeta: { actualizadoEn: '2026-11-19T20:00:00.1+00:00' },
    },
  })
  const comoJson = JSON.parse(JSON.stringify(datos)) as unknown

  it('lee lo que arma el servidor, tras pasar por JSON', () => {
    expect(esquemaDeDatosDePlantillasDeV1.parse(comoJson)).toEqual(comoJson)
  })

  it('rechaza una hora sin zona, una clave que no es de V1 y una lectura que no es un objeto', () => {
    const roto = (cambio: (d: typeof datos) => unknown) =>
      esquemaDeDatosDePlantillasDeV1.safeParse(cambio(structuredClone(datos))).success
    expect(
      roto((d) => ({
        ...d,
        borradores: { formula: null, tarjeta: { actualizadoEn: '2026-11-19 20:00' } },
      })),
    ).toBe(false)
    expect(roto((d) => ({ ...d, plantillas: [{ ...d.plantillas[0], clave: 'otra' }] }))).toBe(false)
    expect(roto((d) => ({ ...d, plantillas: [{ ...d.plantillas[0], lectura: 'x' }] }))).toBe(false)
  })
})
