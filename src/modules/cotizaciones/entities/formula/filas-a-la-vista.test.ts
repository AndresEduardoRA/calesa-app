import { describe, expect, it } from 'vitest'
import { filasALaVista, tramosALaVista } from './filas-a-la-vista'
import { FORMULA_A1 } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'

// 1 TC oficial · 2 Remate · 3 Fees · 4 Flete · 5 Agencia · 6 Seguro · 7 CIF · 8 Total.
const hoja = hojaDeLaPlanilla(FORMULA_A1)

describe('filasALaVista', () => {
  it('busca en el concepto sin tildes ni mayúsculas, conserva los números y dibuja siempre la activa', () => {
    const r = filasALaVista(hoja, 'REMATE', 'cif')
    expect(r.filas.map((f) => f.numero)).toEqual([2, 7])
    expect(r.sinCoincidencias).toBe(false)
    expect(filasALaVista(hoja, 'nada así', null).sinCoincidencias).toBe(true)
  })

  it('corta en el tope y lo dice', () => {
    const r = filasALaVista(hoja, '', null, 3)
    expect(r.filas).toHaveLength(3)
    expect(r.hayMas).toBe(true)
  })
})

describe('tramosALaVista', () => {
  it('junta las filas seguidas con la misma banda: sin buscar, los tramos de la hoja; los grupos sin filas, al final', () => {
    const tramos = tramosALaVista(hoja.filas, ['vacio'])
    expect(tramos.filter((t) => t.grupo !== null && t.filas.length > 0)).toHaveLength(
      hoja.tramos.filter((t) => t.grupo !== null).length,
    )
    expect(tramos.flatMap((t) => t.filas)).toEqual(hoja.filas)
    expect(tramos[tramos.length - 1]).toEqual({ grupo: 'vacio', filas: [] })
  })
})
