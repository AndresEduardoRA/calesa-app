import { describe, expect, it } from 'vitest'
import { rutaDeLasTablas } from './rutas'

describe('rutaDeLasTablas', () => {
  it('lleva a la pestaña del origen y, si se pide, a la tabla', () => {
    expect(rutaDeLasTablas('o1')).toBe('/configuracion/cotizacion/o1/tablas')
    expect(rutaDeLasTablas('o1', 't1')).toBe('/configuracion/cotizacion/o1/tablas?tabla=t1')
  })
})
