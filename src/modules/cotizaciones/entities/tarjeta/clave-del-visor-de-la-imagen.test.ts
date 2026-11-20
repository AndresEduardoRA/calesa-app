import { describe, expect, it } from 'vitest'
import { claveDelVisorDeLaImagen, esClaveDelVisorDeLaImagen } from './clave-del-visor-de-la-imagen'

const ID = '00000000-0000-4000-8000-000000000001'
const OTRA = '00000000-0000-4000-8000-000000000002'

describe('claveDelVisorDeLaImagen', () => {
  it('una por lugar', () => {
    expect(claveDelVisorDeLaImagen(ID, 'resumen')).toBe(`imagen-${ID}`)
    expect(claveDelVisorDeLaImagen(ID, 'lista')).toBe(`imagen-de-la-lista-${ID}`)
  })
})

describe('esClaveDelVisorDeLaImagen', () => {
  it('acepta la de hoy y la de antes del mismo lugar', () => {
    expect(esClaveDelVisorDeLaImagen(`imagen-${ID}`, ID, 'resumen')).toBe(true)
    expect(esClaveDelVisorDeLaImagen(`portada-${ID}`, ID, 'resumen')).toBe(true)
    expect(esClaveDelVisorDeLaImagen(`imagen-de-la-lista-${ID}`, ID, 'lista')).toBe(true)
    expect(esClaveDelVisorDeLaImagen(`portada-de-la-lista-${ID}`, ID, 'lista')).toBe(true)
  })

  it('no la de otro lugar, ni la de otra cotización, ni ninguna', () => {
    expect(esClaveDelVisorDeLaImagen(`imagen-de-la-lista-${ID}`, ID, 'resumen')).toBe(false)
    expect(esClaveDelVisorDeLaImagen(`portada-de-la-lista-${ID}`, ID, 'resumen')).toBe(false)
    expect(esClaveDelVisorDeLaImagen(`imagen-${ID}`, ID, 'lista')).toBe(false)
    expect(esClaveDelVisorDeLaImagen(`imagen-${OTRA}`, ID, 'resumen')).toBe(false)
    expect(esClaveDelVisorDeLaImagen(null, ID, 'resumen')).toBe(false)
  })
})
