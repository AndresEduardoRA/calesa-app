import { describe, expect, it } from 'vitest'
import { PLANTILLAS_DE_V1 } from '../plantillas-de-v1'
import { datosDePlantillasDeV1 } from './plantillas-de-v1'

const vacio = {
  origen: 'Importadora USA',
  catalogo: [],
  tiposDeCambio: ['oficial', 'paralelo'],
  campos: [],
  borradores: { formula: null, tarjeta: null },
}

describe('datosDePlantillasDeV1', () => {
  it('las cuatro, en orden, con la lectura de su tarjeta y sus propios colores', () => {
    const d = datosDePlantillasDeV1(PLANTILLAS_DE_V1, vacio)
    expect(d.plantillas.map((p) => p.clave)).toEqual(['usa', 'china', 'oficina', 'dealer'])
    const usa = d.plantillas[0]
    expect(usa?.lectura.definicion.forma).toBe(2)
    expect(usa?.lectura.colores.map((c) => c.clave)).toContain('v1_teal')
    expect(usa?.lectura.variante?.opciones.map((o) => o.titulo)).toContain(
      'COTIZACIÓN MOTO EEUU - BOLIVIA',
    )
    expect(usa?.lectura.grupos.map((g) => g.plazo)).toEqual(['2 días', '7 días', '4 meses'])
    expect(usa?.colores).toEqual({ tipo: 'caben', crear: 7 })
    expect(usa?.avisos).toEqual([])
  })

  it('los avisos y los colores que no caben, por plantilla; los borradores, tal cual', () => {
    const lleno = Array.from({ length: 46 }, (_, i) => ({
      clave: `c${i}`,
      nombre: `C ${i}`,
      hex: '#000000',
    }))
    const borradores = {
      formula: { autor: 'Ana', tuyo: false, actualizadoEn: '2026-11-19T20:00:00Z' },
      tarjeta: null,
    }
    const d = datosDePlantillasDeV1(PLANTILLAS_DE_V1, {
      ...vacio,
      catalogo: lleno,
      tiposDeCambio: ['oficial'],
      borradores,
    })
    expect(d.plantillas[0]?.colores).toEqual({
      tipo: 'no_caben',
      motivo:
        'No hay lugar para 7 colores más en el catálogo (máximo 48): elimina alguno que no se use.',
    })
    expect(d.plantillas[0]?.avisos).toEqual([
      'Este paquete usa el tipo de cambio «Paralelo», que la empresa no tiene: créalo en Empresa › Monedas antes de publicar.',
    ])
    expect(d.borradores).toBe(borradores)
  })

  it('lo que viaja de las cuatro pesa menos de 80 KB sin comprimir', () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify(datosDePlantillasDeV1(PLANTILLAS_DE_V1, vacio)),
    ).length
    expect(bytes).toBeLessThan(80 * 1024)
  })
})
