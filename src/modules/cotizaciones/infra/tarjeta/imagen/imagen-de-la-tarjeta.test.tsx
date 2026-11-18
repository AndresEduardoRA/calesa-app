// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { geometriaDeLaTarjeta } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import { tarjetaDesde } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  calculoDePrueba,
  CONTEXTO_DE_PRUEBA,
  crudaDeLaTarjeta,
} from '../../../entities/tarjeta/tarjeta.soporte'

vi.mock('server-only', () => ({}))

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// El ancho y el alto del PNG, del IHDR (bytes 16 a 23, big-endian).
const medidas = (png: Uint8Array) => {
  const vista = new DataView(png.buffer, png.byteOffset, png.byteLength)
  return { ancho: vista.getUint32(16), alto: vista.getUint32(20) }
}

describe('pngDeLaTarjeta', () => {
  it('da un PNG del ancho y el alto de la geometría, con las cuatro Geist', async () => {
    const lectura = tarjetaDesde(crudaDeLaTarjeta())
    if (lectura === null) throw new Error('no se lee')
    const geometria = geometriaDeLaTarjeta({
      lectura,
      calculo: calculoDePrueba({ verTotalBs: true }),
      contexto: CONTEXTO_DE_PRUEBA,
      monedaBs: 'BOB',
      locale: 'es-BO',
    })
    const { pngDeLaTarjeta } = await import('./imagen-de-la-tarjeta')
    const png = await pngDeLaTarjeta({ geometria, logo: null })
    expect([...png.subarray(0, 8)]).toEqual(FIRMA_PNG)
    expect(medidas(png)).toEqual({
      ancho: Math.ceil(geometria.ancho),
      alto: Math.ceil(geometria.alto),
    })
  }, 30_000)
})
