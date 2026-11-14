import { describe, expect, it } from 'vitest'
import { CLAVE_DEL_HUECO_ABIERTO, esHuecoConocido, rutaDeLaUnidad } from './enlaces'
import { ORDEN_DE_HUECOS } from './hueco'

describe('rutaDeLaUnidad', () => {
  it('lleva a la página de la unidad', () => {
    expect(rutaDeLaUnidad('a1')).toBe('/logistica/vehiculo/a1')
  })

  it('con un hueco conocido, lo pide por la URL', () => {
    expect(rutaDeLaUnidad('a1', 'documentos')).toBe('/logistica/vehiculo/a1?hueco=documentos')
    expect(CLAVE_DEL_HUECO_ABIERTO).toBe('hueco')
  })

  it('un hueco desconocido o vacío se descarta', () => {
    expect(rutaDeLaUnidad('a1', 'otro')).toBe('/logistica/vehiculo/a1')
    expect(rutaDeLaUnidad('a1', '')).toBe('/logistica/vehiculo/a1')
    expect(rutaDeLaUnidad('a1', null)).toBe('/logistica/vehiculo/a1')
  })

  it('escapa un id raro', () => {
    expect(rutaDeLaUnidad('a/b')).toBe('/logistica/vehiculo/a%2Fb')
  })
})

describe('esHuecoConocido', () => {
  it('acepta cada hueco del panel y nada más', () => {
    for (const clave of ORDEN_DE_HUECOS) expect(esHuecoConocido(clave)).toBe(true)
    expect(esHuecoConocido('inventado')).toBe(false)
    expect(esHuecoConocido(undefined)).toBe(false)
  })
})
