import { describe, expect, it } from 'vitest'
import { codificarCursor, leerCursor } from '@/shared/lib/paginacion'
import {
  armarPaginaDelCierre,
  codificarCursorDelCierre,
  leerCursorDelCierre,
  tramoDelCierre,
} from './cursor-del-cierre'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const viva = (n: number, cierre: string) => ({
  id: id(n),
  creadoEn: `2026-01-0${n}T00:00:00.123456+00:00`,
  situacion: 'en_subasta' as const,
  cierreSubastaEn: cierre,
})
const sinFecha = (n: number) => ({
  id: id(n),
  creadoEn: `2026-01-0${n}T00:00:00+00:00`,
  situacion: 'en_subasta' as const,
  cierreSubastaEn: null,
})
const cerrada = (n: number) => ({
  id: id(n),
  creadoEn: `2026-01-0${n}T00:00:00+00:00`,
  situacion: 'sin_resolver' as const,
  cierreSubastaEn: null,
})

describe('tramoDelCierre', () => {
  it('viva con fecha, viva sin fecha, cualquier otra', () => {
    expect(
      tramoDelCierre({ situacion: 'en_subasta', cierreSubastaEn: '2026-11-20T10:00:00Z' }),
    ).toBe(0)
    expect(tramoDelCierre({ situacion: 'en_subasta', cierreSubastaEn: null })).toBe(1)
    expect(tramoDelCierre({ situacion: 'sin_resolver', cierreSubastaEn: null })).toBe(2)
    expect(tramoDelCierre({ situacion: 'fase', cierreSubastaEn: '2026-11-20T10:00:00Z' })).toBe(2)
    expect(tramoDelCierre({ situacion: 'no_ganada', cierreSubastaEn: null })).toBe(2)
  })
})

describe('el cursor del cierre', () => {
  const cursor = {
    tramo: 1 as const,
    instante: '2026-11-20T10:00:00.123456+00:00',
    id: id(7),
    sentido: 'anterior' as const,
  }

  it('ida y vuelta, con los microsegundos', () => {
    expect(leerCursorDelCierre(codificarCursorDelCierre(cursor))).toEqual(cursor)
  })

  it('no lee un cursor de «Más recientes», ni el de siempre lee uno del cierre', () => {
    const deSiempre = codificarCursor(cursor)
    expect(leerCursorDelCierre(deSiempre)).toBeNull()
    expect(leerCursor(codificarCursorDelCierre(cursor))).toBeNull()
  })

  it('rechaza un tramo que no existe o un cursor roto', () => {
    expect(leerCursorDelCierre(`3~${codificarCursor(cursor)}`)).toBeNull()
    expect(leerCursorDelCierre('0~roto')).toBeNull()
    expect(leerCursorDelCierre('')).toBeNull()
    expect(leerCursorDelCierre(null)).toBeNull()
  })
})

describe('armarPaginaDelCierre', () => {
  it('hacia adelante cruzando del tramo 0 al 1: el siguiente lleva el tramo y el instante de la última', () => {
    const leidas = [viva(1, '2026-11-20T10:00:00+00:00'), sinFecha(2), sinFecha(3)]
    const pagina = armarPaginaDelCierre(leidas, 2, null)
    expect(pagina.filas.map((f) => f.id)).toEqual([id(1), id(2)])
    expect(pagina.anterior).toBeNull()
    expect(leerCursorDelCierre(pagina.siguiente)).toEqual({
      tramo: 1,
      instante: sinFecha(2).creadoEn,
      id: id(2),
      sentido: 'siguiente',
    })
  })

  it('en el tramo 0 el cursor lleva el cierre, no el alta', () => {
    const leidas = [viva(1, '2026-11-20T10:00:00.5+00:00'), viva(2, '2026-11-21T10:00:00+00:00')]
    const pagina = armarPaginaDelCierre(leidas, 1, null)
    expect(leerCursorDelCierre(pagina.siguiente)).toMatchObject({
      tramo: 0,
      instante: '2026-11-20T10:00:00.5+00:00',
    })
  })

  it('hacia atrás desde el tramo 2: da vuelta las filas y cada borde con su tramo', () => {
    // La base las devuelve al revés: la más cercana al cursor primero.
    const leidas = [cerrada(5), sinFecha(4), viva(3, '2026-11-22T10:00:00+00:00')]
    const desde = {
      tramo: 2 as const,
      instante: cerrada(6).creadoEn,
      id: id(6),
      sentido: 'anterior' as const,
    }
    const pagina = armarPaginaDelCierre(leidas, 2, desde)
    expect(pagina.filas.map((f) => f.id)).toEqual([id(4), id(5)])
    expect(leerCursorDelCierre(pagina.anterior)).toMatchObject({
      tramo: 1,
      id: id(4),
      sentido: 'anterior',
    })
    expect(leerCursorDelCierre(pagina.siguiente)).toMatchObject({
      tramo: 2,
      id: id(5),
      sentido: 'siguiente',
    })
  })

  it('sin filas, sin cursores', () => {
    expect(armarPaginaDelCierre([], 10, null)).toEqual({
      filas: [],
      siguiente: null,
      anterior: null,
    })
  })
})
