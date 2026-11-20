import { describe, expect, it } from 'vitest'
import { origenIdDelDestino, rutaDeLasTablas } from './rutas'

describe('rutaDeLasTablas', () => {
  it('lleva a la pestaña del origen y, si se pide, a la tabla', () => {
    expect(rutaDeLasTablas('o1')).toBe('/configuracion/origenes/o1/tablas')
    expect(rutaDeLasTablas('o1', 't1')).toBe('/configuracion/origenes/o1/tablas?tabla=t1')
  })

  it('sin origen lleva a Catálogos › Tablas compartidas', () => {
    expect(rutaDeLasTablas(null)).toBe('/configuracion/catalogos/tablas')
    expect(rutaDeLasTablas(null, 't1')).toBe('/configuracion/catalogos/tablas?tabla=t1')
  })
})

describe('origenIdDelDestino', () => {
  it('es el id del origen o nulo en las compartidas', () => {
    expect(origenIdDelDestino({ origen: { id: 'o1', nombre: 'A', activo: true } })).toBe('o1')
    expect(origenIdDelDestino('compartidas')).toBeNull()
  })
})
