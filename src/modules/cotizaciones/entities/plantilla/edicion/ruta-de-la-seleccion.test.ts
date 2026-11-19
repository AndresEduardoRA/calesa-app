import { describe, expect, it } from 'vitest'
import type { PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import { celda, grilla } from './edicion.soporte'
import { mapaDeLaGrilla } from './mapa-de-la-grilla'
import { anuncioDeLaSeleccion, nombreDelContenido, rutaDeLaSeleccion } from './ruta-de-la-seleccion'

const conNombres: PlantillaEnCuadricula = {
  ...grilla(4, 3, [celda('a', 0, 0)]),
  columnas: [
    { id: 'grupo', ancho: 100 },
    { id: 'concepto', ancho: 190 },
    { id: 'k3', ancho: 100 },
  ],
}
const mapa = mapaDeLaGrilla(conNombres)

describe('rutaDeLaSeleccion', () => {
  it('una celda: fila y columna con su letra y su nombre conocido', () => {
    expect(
      rutaDeLaSeleccion(
        { tipo: 'celdas', ancla: { f: 3, k: 1 }, foco: { f: 3, k: 1 } },
        mapa,
        conNombres,
      ),
    ).toBe('Fila 4 › Columna «B · Concepto»')
  })
  it('un rango, filas o columnas', () => {
    expect(
      rutaDeLaSeleccion(
        { tipo: 'celdas', ancla: { f: 1, k: 0 }, foco: { f: 3, k: 2 } },
        mapa,
        conNombres,
      ),
    ).toBe('Filas 2 a 4 › Columnas «A · Grupo» a «C»')
    expect(rutaDeLaSeleccion({ tipo: 'filas', desde: 2, hasta: 2 }, mapa, conNombres)).toBe(
      'Fila 3',
    )
    expect(rutaDeLaSeleccion({ tipo: 'columnas', desde: 0, hasta: 1 }, mapa, conNombres)).toBe(
      'Columnas «A · Grupo» a «B · Concepto»',
    )
  })
})

describe('anuncioDeLaSeleccion', () => {
  it('sin selección, una celda o un rango con sus casillas', () => {
    expect(anuncioDeLaSeleccion(null, mapa, conNombres)).toBe('Sin selección.')
    expect(
      anuncioDeLaSeleccion(
        { tipo: 'celdas', ancla: { f: 0, k: 0 }, foco: { f: 0, k: 0 } },
        mapa,
        conNombres,
      ),
    ).toBe('Fila 1 › Columna «A · Grupo».')
    expect(
      anuncioDeLaSeleccion(
        { tipo: 'celdas', ancla: { f: 0, k: 0 }, foco: { f: 0, k: 2 } },
        mapa,
        conNombres,
      ),
    ).toBe('Fila 1 › Columnas «A · Grupo» a «C»: 3 casillas.')
  })
})

describe('nombreDelContenido', () => {
  const nombres = {
    nodo: (id: string) => (id === 'remate' ? 'Remate' : id),
    variable: () => 'Fecha',
    mostrar: () => 'Monto',
  }
  it('el texto, el dato (sin cifras), el logo o «Vacía»', () => {
    expect(nombreDelContenido({ tipo: 'texto', texto: 'Hola' }, nombres)).toBe('Hola')
    expect(nombreDelContenido({ tipo: 'texto', texto: '  ' }, nombres)).toBe('Vacía')
    expect(nombreDelContenido({ tipo: 'dato', nodo: 'remate', mostrar: 'monto' }, nombres)).toBe(
      'Dato: «Remate» · Monto',
    )
    expect(nombreDelContenido({ tipo: 'dato', variable: 'fecha_larga' }, nombres)).toBe(
      'Dato: Fecha',
    )
    expect(nombreDelContenido({ tipo: 'logo' }, nombres)).toBe('Logo')
    expect(nombreDelContenido({ tipo: 'vacio' }, nombres)).toBe('Vacía')
    expect(nombreDelContenido(null, nombres)).toBe('Vacía')
  })
})
