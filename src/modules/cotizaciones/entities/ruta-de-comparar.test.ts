import { describe, expect, it } from 'vitest'
import { idsParaComparar, rutaDeComparar } from './ruta-de-comparar'

const A = '0b6c3f1e-1a2b-4c3d-8e4f-5a6b7c8d9e01'
const B = '0b6c3f1e-1a2b-4c3d-8e4f-5a6b7c8d9e02'
const C = '0b6c3f1e-1a2b-4c3d-8e4f-5a6b7c8d9e03'
const D = '0b6c3f1e-1a2b-4c3d-8e4f-5a6b7c8d9e04'

describe('rutaDeComparar', () => {
  it('escribe los ids en orden y el returnTo escapado', () => {
    expect(rutaDeComparar([A, B], `/cotizaciones/${A}`)).toBe(
      `/cotizaciones/comparar?ids=${A},${B}&returnTo=%2Fcotizaciones%2F${A}`,
    )
  })

  it('sin a dónde volver, sólo los ids', () => {
    expect(rutaDeComparar([A, B, C])).toBe(`/cotizaciones/comparar?ids=${A},${B},${C}`)
  })

  it('lo que escribe se vuelve a leer igual', () => {
    const url = new URL(rutaDeComparar([C, A], '/cotizaciones?cotizacion=x'), 'http://x')
    expect(idsParaComparar(url.searchParams.get('ids') ?? undefined)).toEqual([C, A])
    expect(url.searchParams.get('returnTo')).toBe('/cotizaciones?cotizacion=x')
  })
})

describe('idsParaComparar', () => {
  it('2 o 3 guids distintos, en el orden de la URL', () => {
    expect(idsParaComparar(`${B},${A}`)).toEqual([B, A])
    expect(idsParaComparar(`${A},${B},${C}`)).toEqual([A, B, C])
  })

  it('con espacios y mayúsculas, en minúsculas', () => {
    expect(idsParaComparar(` ${A.toUpperCase()} , ${B}`)).toEqual([A, B])
  })

  it('1 o 4 no se comparan', () => {
    expect(idsParaComparar(A)).toBeNull()
    expect(idsParaComparar(`${A},${B},${C},${D}`)).toBeNull()
  })

  it('repetidos no, tampoco en otra caja de letras', () => {
    expect(idsParaComparar(`${A},${A}`)).toBeNull()
    expect(idsParaComparar(`${A},${A.toUpperCase()},${B}`)).toBeNull()
  })

  it('mal formados, vacío o sin parámetro: nulo', () => {
    expect(idsParaComparar(`${A},no-es-un-id`)).toBeNull()
    expect(idsParaComparar(`${A},`)).toBeNull()
    expect(idsParaComparar('')).toBeNull()
    expect(idsParaComparar(undefined)).toBeNull()
  })
})
