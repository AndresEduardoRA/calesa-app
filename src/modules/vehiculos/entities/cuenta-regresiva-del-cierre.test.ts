import { describe, expect, it } from 'vitest'
import { cuentaDelCierre, periodoDeLaCuenta } from './cuenta-regresiva-del-cierre'

const CIERRE = '2026-11-20T18:00:00.000Z'
const cierre = Date.parse(CIERRE)
const antes = (milisegundos: number): number => cierre - milisegundos
const SEG = 1000
const MIN = 60 * SEG
const HORA = 60 * MIN
const DIA = 24 * HORA

describe('cuentaDelCierre', () => {
  it('con días: «Cierra en 2 d 04:12:33», normal', () => {
    expect(cuentaDelCierre(CIERRE, antes(2 * DIA + 4 * HORA + 12 * MIN + 33 * SEG))).toEqual({
      texto: 'Cierra en 2 d 04:12:33',
      tono: 'normal',
    })
  })

  it('con menos de 24 h: sin días y en ámbar; con menos de 1 h, en rojo', () => {
    expect(cuentaDelCierre(CIERRE, antes(23 * HORA + 59 * MIN + 59 * SEG))).toEqual({
      texto: 'Cierra en 23:59:59',
      tono: 'aviso',
    })
    expect(cuentaDelCierre(CIERRE, antes(HORA))).toMatchObject({ tono: 'aviso' })
    expect(cuentaDelCierre(CIERRE, antes(59 * MIN + 59 * SEG))).toEqual({
      texto: 'Cierra en 00:59:59',
      tono: 'urgente',
    })
  })

  it('exactamente 24 h es normal y se dice «1 d 00:00:00»', () => {
    expect(cuentaDelCierre(CIERRE, antes(DIA))).toEqual({
      texto: 'Cierra en 1 d 00:00:00',
      tono: 'normal',
    })
  })

  it('el último segundo es «00:00:01» (un instante a medias cuenta hacia arriba)', () => {
    expect(cuentaDelCierre(CIERRE, antes(SEG))).toMatchObject({ texto: 'Cierra en 00:00:01' })
    expect(cuentaDelCierre(CIERRE, antes(400))).toMatchObject({ texto: 'Cierra en 00:00:01' })
  })

  it('en 0: «Cerrando…» y, pasado el margen de un minuto, «Cerró hace 3 min»', () => {
    expect(cuentaDelCierre(CIERRE, cierre)).toEqual({ texto: 'Cerrando…', tono: 'cerrando' })
    expect(cuentaDelCierre(CIERRE, cierre + 59 * SEG)).toMatchObject({ tono: 'cerrando' })
    expect(cuentaDelCierre(CIERRE, cierre + 3 * MIN + 10 * SEG)).toEqual({
      texto: 'Cerró hace 3 min',
      tono: 'cerro',
    })
    expect(cuentaDelCierre(CIERRE, cierre + 5 * HORA)).toEqual({
      texto: 'Cerró hace 5 h',
      tono: 'cerro',
    })
  })

  it('sin fecha, o con una que no se entiende: «Sin fecha de cierre»', () => {
    const esperado = { texto: 'Sin fecha de cierre', tono: 'sin_fecha' }
    expect(cuentaDelCierre(null, cierre)).toEqual(esperado)
    expect(cuentaDelCierre('no es una fecha', cierre)).toEqual(esperado)
  })

  it('con menos movimiento, sin segundos y hacia arriba', () => {
    expect(cuentaDelCierre(CIERRE, antes(2 * DIA + 4 * HORA + 12 * MIN + 33 * SEG), false)).toEqual(
      {
        texto: 'Cierra en 2 d 4 h 13 min',
        tono: 'normal',
      },
    )
    expect(cuentaDelCierre(CIERRE, antes(2 * DIA + 4 * HORA), false).texto).toBe(
      'Cierra en 2 d 4 h',
    )
    expect(cuentaDelCierre(CIERRE, antes(2 * DIA), false).texto).toBe('Cierra en 2 d')
    expect(cuentaDelCierre(CIERRE, antes(5 * HORA + 30 * SEG), false).texto).toBe(
      'Cierra en 5 h 1 min',
    )
    expect(cuentaDelCierre(CIERRE, antes(42 * MIN), false)).toEqual({
      texto: 'Cierra en 42 min',
      tono: 'urgente',
    })
  })

  it('con menos movimiento, el tono mide lo que dice el texto', () => {
    expect(cuentaDelCierre(CIERRE, antes(59 * MIN + 30 * SEG), false)).toEqual({
      texto: 'Cierra en 1 h',
      tono: 'aviso',
    })
  })
})

describe('periodoDeLaCuenta', () => {
  it('cada segundo, o cada minuto con menos movimiento', () => {
    expect(periodoDeLaCuenta(false)).toBe(1000)
    expect(periodoDeLaCuenta(true)).toBe(60_000)
  })
})
