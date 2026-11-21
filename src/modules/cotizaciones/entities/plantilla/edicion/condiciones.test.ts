import { describe, expect, it } from 'vitest'
import type { ContenidoDeLaCelda } from '../../cuadricula-de-la-tarjeta'
import {
  borradorDeLaCondicion,
  CONDICION_VACIA,
  condicionCompleta,
  conSobre,
  datoQueYaNoEsta,
  MOTIVOS_DE_LAS_CONDICIONES,
  numeroDe,
  operadoresPara,
  primerDato,
  type CondicionEnBorrador,
} from './condiciones'
import { CONTEXTO_DE_CONDICIONES } from './condiciones.soporte'

const C = CONTEXTO_DE_CONDICIONES
const L = 'es-BO'
const REMATE = { tipo: 'dato', nodo: 'remate', mostrar: 'monto' } as const
const MOTOR = { tipo: 'dato', nodo: 'motor', mostrar: 'monto' } as const
const SEGURO = { tipo: 'dato', nodo: 'seguro', mostrar: 'monto' } as const
const TITULO = { tipo: 'dato', variable: 'titulo' } as const

const completa = (c: CondicionEnBorrador) => {
  const motivos = new Map<string, string>()
  return {
    condicion: condicionCompleta(c, L, 'si.0', motivos),
    motivos: Object.fromEntries(motivos),
  }
}

describe('operadoresPara', () => {
  it('una variable, si está vacía; la variante, su opción; un interruptor, encendido o apagado; otro nodo, vacío, 0 y contra un número', () => {
    expect(operadoresPara(null, C)).toEqual([])
    expect(operadoresPara(TITULO, C)).toEqual(['vacio', 'no_vacio'])
    expect(operadoresPara(MOTOR, C)).toEqual(['opcion'])
    expect(operadoresPara(SEGURO, C)).toEqual(['encendido', 'apagado'])
    expect(operadoresPara(REMATE, C)).toEqual([
      'vacio',
      'no_vacio',
      'cero',
      'no_cero',
      'mayor',
      'menor',
      'igual',
    ])
  })
})

describe('conSobre', () => {
  it('la pregunta sigue si el nuevo la admite; si no, la primera; la opción, la primera de la variante', () => {
    const vacio = conSobre(CONDICION_VACIA, TITULO, C)
    expect(vacio.es).toBe('vacio')
    expect(conSobre({ ...vacio, es: 'no_vacio' }, REMATE, C).es).toBe('no_vacio')
    expect(conSobre({ ...vacio, es: 'mayor' }, MOTOR, C)).toEqual({
      sobre: MOTOR,
      es: 'opcion',
      numero: '',
      opcion: 'gasolina',
    })
    expect(conSobre({ ...vacio, es: 'opcion', opcion: 'diesel' }, MOTOR, C).opcion).toBe('diesel')
    expect(conSobre({ ...vacio, es: 'opcion', opcion: 'diesel' }, SEGURO, C).opcion).toBeNull()
  })
})

describe('numeroDe', () => {
  it('con el locale de la empresa; vacío o mal escrito, el motivo', () => {
    expect(numeroDe('1.000,5', L)).toBe(1000.5)
    expect(numeroDe('-3', L)).toBe(-3)
    expect(numeroDe('  ', L)).toBe(MOTIVOS_DE_LAS_CONDICIONES.numero)
    expect(numeroDe('1.5', L)).toBe('Usa coma para los decimales: 1,5.')
    expect(numeroDe('abc', L)).toMatch(/^Escribe un número/)
  })
})

describe('condicionCompleta', () => {
  it('cada pregunta arma su condición', () => {
    expect(completa({ ...CONDICION_VACIA, sobre: TITULO, es: 'vacio' }).condicion).toEqual({
      es: 'vacio',
      dato: TITULO,
    })
    expect(completa({ ...CONDICION_VACIA, sobre: REMATE, es: 'no_vacio' }).condicion).toEqual({
      es: 'no_vacio',
      dato: REMATE,
    })
    expect(completa({ ...CONDICION_VACIA, sobre: REMATE, es: 'cero' }).condicion).toEqual({
      es: 'cero',
      nodo: 'remate',
    })
    expect(
      completa({ ...CONDICION_VACIA, sobre: REMATE, es: 'menor', numero: '0' }).condicion,
    ).toEqual({ es: 'menor', nodo: 'remate', a: 0 })
    expect(
      completa({ ...CONDICION_VACIA, sobre: MOTOR, es: 'opcion', opcion: 'diesel' }).condicion,
    ).toEqual({ es: 'opcion', nodo: 'motor', opcion: 'diesel' })
    expect(completa({ ...CONDICION_VACIA, sobre: SEGURO, es: 'apagado' }).condicion).toEqual({
      es: 'apagado',
      nodo: 'seguro',
    })
  })
  it('lo que falta, con su motivo en su lugar', () => {
    expect(completa(CONDICION_VACIA)).toEqual({
      condicion: null,
      motivos: { 'si.0.sobre': MOTIVOS_DE_LAS_CONDICIONES.dato },
    })
    expect(completa({ ...CONDICION_VACIA, sobre: TITULO, es: 'cero' }).motivos).toEqual({
      'si.0.sobre': MOTIVOS_DE_LAS_CONDICIONES.dato,
    })
    expect(completa({ ...CONDICION_VACIA, sobre: REMATE, es: 'mayor' }).motivos).toEqual({
      'si.0.numero': MOTIVOS_DE_LAS_CONDICIONES.numero,
    })
    expect(completa({ ...CONDICION_VACIA, sobre: MOTOR, es: 'opcion' }).motivos).toEqual({
      'si.0.opcion': MOTIVOS_DE_LAS_CONDICIONES.opcion,
    })
  })
})

describe('borradorDeLaCondicion', () => {
  it('ida y vuelta: un nodo se mira por su monto y el número se escribe en el locale', () => {
    const casos = [
      { es: 'vacio', dato: { tipo: 'dato', nodo: 'remate', mostrar: 'etiqueta' } },
      { es: 'mayor', nodo: 'remate', a: 1234.5 },
      { es: 'opcion', nodo: 'motor', opcion: 'gasolina' },
      { es: 'encendido', nodo: 'seguro' },
    ] as const
    for (const c of casos) expect(completa(borradorDeLaCondicion(c, L)).condicion).toEqual(c)
    expect(borradorDeLaCondicion(casos[1], L).numero).toBe('1234,5')
  })
})

describe('datoQueYaNoEsta y primerDato', () => {
  it('un nodo que la fórmula no tiene o una variable que no existe', () => {
    expect(datoQueYaNoEsta(REMATE, C)).toBe(false)
    expect(datoQueYaNoEsta({ tipo: 'dato', nodo: 'borrado', mostrar: 'monto' }, C)).toBe(true)
    expect(datoQueYaNoEsta(TITULO, C)).toBe(false)
    expect(datoQueYaNoEsta({ tipo: 'dato', variable: '__proto__' }, C)).toBe(true)
  })
  it('el dato, el primero de la lista o el primero que muestran las ramas', () => {
    const condiciones: ContenidoDeLaCelda = {
      tipo: 'condiciones',
      ramas: [{ si: [{ es: 'cero', nodo: 'remate' }], contenido: { tipo: 'texto', texto: 'x' } }],
      si_no: REMATE,
    }
    expect(primerDato(null)).toBeNull()
    expect(primerDato({ tipo: 'texto', texto: 'x' })).toBeNull()
    expect(primerDato(TITULO)).toBe(TITULO)
    expect(primerDato({ tipo: 'respaldo', datos: [REMATE, TITULO] })).toBe(REMATE)
    expect(primerDato(condiciones)).toBe(REMATE)
  })
})
