import { describe, expect, it } from 'vitest'
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import { tarjetaDesde, type TarjetaLista } from './lectura-de-la-tarjeta'
import { calculoDePrueba, CONTEXTO_DE_PRUEBA, crudaDeLaTarjeta } from './tarjeta.soporte'
import {
  datoDibujado,
  fueraDeLaVersion,
  tieneValor,
  type EntradaDelContenido,
} from './valor-del-dato'

const TARJETA = ((): TarjetaLista => {
  const l = tarjetaDesde(crudaDeLaTarjeta())
  if (l?.estado !== 'lista') throw new Error('la tarjeta de prueba no se lee')
  return l
})()

const entrada = (
  calculo: CalculoDeLaTarjeta = calculoDePrueba(),
  titulo: string | null = null,
): EntradaDelContenido => ({
  tarjeta: TARJETA,
  calculo,
  contexto: { ...CONTEXTO_DE_PRUEBA, titulo },
  monedaBs: 'BOB',
  locale: 'es-BO',
})

const monto = (nodo: string) => ({ tipo: 'dato', nodo, mostrar: 'monto' }) as const

describe('tieneValor', () => {
  it('un texto tiene valor si no queda vacío sin los espacios de los bordes', () => {
    const titulo = { tipo: 'dato', variable: 'titulo' } as const
    expect(tieneValor(entrada(calculoDePrueba(), 'Para Juan'), titulo)).toBe(true)
    expect(tieneValor(entrada(calculoDePrueba(), ' \n '), titulo)).toBe(false)
    expect(tieneValor(entrada(), titulo)).toBe(false)
  })

  it('un número tiene valor, también el 0; un monto nulo no, y un nodo que no aplica tampoco', () => {
    const c = calculoDePrueba({
      valores: new Map([
        ['remate', 0],
        ['flete', null],
        ['fees', 10],
      ]),
    })
    expect(tieneValor(entrada(c), monto('remate'))).toBe(true)
    expect(tieneValor(entrada(c), monto('flete'))).toBe(false)
    expect(tieneValor(entrada(c), monto('fees'))).toBe(false)
    // La etiqueta de un nodo que aplica tiene valor; su descripción nula, no.
    expect(tieneValor(entrada(c), { tipo: 'dato', nodo: 'remate', mostrar: 'etiqueta' })).toBe(true)
    expect(tieneValor(entrada(c), { tipo: 'dato', nodo: 'garantia', mostrar: 'descripcion' })).toBe(
      false,
    )
  })
})

describe('datoDibujado y fueraDeLaVersion', () => {
  it('un monto nulo se dibuja «—»; uno que no aplica, vacío', () => {
    const c = calculoDePrueba({ valores: new Map([['flete', null]]) })
    expect(datoDibujado(entrada(c), monto('flete'))).toEqual({ tipo: 'texto', lineas: ['—'] })
    expect(datoDibujado(entrada(c), monto('fees'))).toEqual({ tipo: 'texto', lineas: [] })
  })

  it('un nodo sin estado no está en la versión, salvo el total; sin estados, todos están', () => {
    expect(fueraDeLaVersion(entrada(), 'ya_no_esta')).toBe(true)
    expect(fueraDeLaVersion(entrada(), 'remate')).toBe(false)
    expect(fueraDeLaVersion(entrada(calculoDePrueba({ estados: new Map() })), 'total')).toBe(false)
    expect(fueraDeLaVersion(entrada(calculoDePrueba({ estados: null })), 'ya_no_esta')).toBe(false)
  })
})
