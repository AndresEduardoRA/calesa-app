import { describe, expect, it } from 'vitest'
import { formatearPorcentaje } from '@/shared/lib/formato'
import type { Nodo } from '../nodos'
import { contextoDeDondeSale, deDondeSale } from './de-donde-sale'
import {
  NODOS_DE_BASE,
  formulaCruda,
  formulaDeNFilas,
  formulaDePrueba,
  nodoDe,
} from './fila-de-prueba.soporte'

const BASE = [
  ...NODOS_DE_BASE,
  { id: 'tasa', tipo: 'constante', etiqueta: 'Comisión', formato: 'pct' },
  { id: 'plano', tipo: 'constante', etiqueta: 'Despacho', formato: 'usd' },
  { id: 'factor', tipo: 'constante', etiqueta: 'Factor', formato: 'raw' },
  { id: 'local', tipo: 'constante', etiqueta: 'Local', formato: 'moneda' },
  { id: 'anio', tipo: 'campo_vehiculo', etiqueta: 'Año', campo: 'anio' },
  {
    id: 'variante',
    tipo: 'opcion',
    etiqueta: 'Variante',
    opciones: [
      { clave: 'chile', etiqueta: 'Chile', titulo: 'Por Chile' },
      { clave: 'peru', etiqueta: 'Perú', titulo: 'Por Perú' },
    ],
  },
  {
    id: 'fob',
    tipo: 'tabla',
    etiqueta: 'FOB',
    tabla: 'fob_anual',
    match: { anio: 'anio' },
    columna: 'fob',
  },
  {
    id: 'tramo_flete',
    tipo: 'tramo',
    etiqueta: 'Tramo',
    tabla: 'fletes',
    sobre: 'remate',
    columna: 'monto',
  },
]
const PARAMS = { tasa: 0.04, plano: 900, factor: 1.5, local: 100 }

const frase = (nodo: Record<string, unknown>) => {
  const formula = formulaCruda([...BASE, nodo], PARAMS)
  const n = nodoDe(formula, String(nodo['id']))
  if (n === undefined) throw new Error('falta el nodo')
  return deDondeSale(n, contextoDeDondeSale(formula, 'es-BO'))
}

const deLaBase = (id: string) => {
  const formula = formulaCruda(BASE, PARAMS)
  const n = nodoDe(formula, id)
  if (n === undefined) throw new Error('falta el nodo')
  return deDondeSale(n, contextoDeDondeSale(formula, 'es-BO'))
}

const calculo = (resto: Record<string, unknown>) => ({
  id: 'fila',
  tipo: 'calculo',
  etiqueta: 'Fila',
  ...resto,
})

describe('deDondeSale: un caso por cada tipo de nodo', () => {
  it.each([
    ['input', 'remate', 'lo escribe el asesor'],
    ['constante en porcentaje', 'tasa', 'porcentaje fijo'],
    ['constante en dólares', 'plano', 'monto fijo'],
    ['constante en moneda local', 'local', 'monto fijo'],
    ['constante sin formato de dinero', 'factor', 'número fijo'],
    ['tipo de cambio', 'tc', 'tipo de cambio Tipo de cambio de hoy'],
    ['campo del vehículo', 'anio', 'dato del vehículo: Año'],
    ['bandera', 'b', 'interruptor'],
    ['variante', 'variante', 'se elige al cotizar'],
    ['tabla', 'fob', 'de la tabla fob_anual'],
    ['tramo', 'tramo_flete', 'de la tabla fletes'],
  ])('%s', (_, id, esperada) => {
    expect(deLaBase(id)).toBe(esperada)
  })

  it('una constante sin formato es un monto (el formato por omisión es usd)', () => {
    expect(frase({ id: 'fila', tipo: 'constante', etiqueta: 'Fila' })).toBe('monto fijo')
  })
})

describe('deDondeSale: un caso por cada operación, con etiquetas y nunca ids', () => {
  it.each([
    ['suma', { op: 'suma', de: ['remate', 'fees', 'flete'] }, 'Remate + Fees + Flete'],
    [
      'porcentaje_de de uno',
      { op: 'porcentaje_de', de: ['remate'], pct: 'tasa' },
      'Comisión de Remate',
    ],
    [
      'porcentaje_de de varios',
      { op: 'porcentaje_de', de: ['remate', 'fees'], pct: 'tasa' },
      'Comisión de (Remate + Fees)',
    ],
    ['multiplicar', { op: 'multiplicar', de: ['remate', 'tc'] }, 'Remate × Tipo de cambio'],
    ['restar', { op: 'restar', de: ['remate', 'fees', 'flete'] }, 'Remate − Fees − Flete'],
    ['dividir', { op: 'dividir', de: ['remate', 'tc'] }, 'Remate ÷ Tipo de cambio'],
    ['si', { op: 'si', de: ['remate'], condicion: 'b' }, 'Remate si Bandera B está encendida'],
    [
      'depreciar',
      { op: 'depreciar', de: ['remate'], tabla: 'dep', sobre: 'anio', columna: 'tasa_dep' },
      'Remate × factor de dep',
    ],
    ['redondear a 2', { op: 'redondear', de: ['remate'], n: 2 }, 'Remate redondeado a 2 decimales'],
    ['redondear a 1', { op: 'redondear', de: ['remate'], n: 1 }, 'Remate redondeado a 1 decimal'],
    ['redondear a 0', { op: 'redondear', de: ['remate'], n: 0 }, 'Remate redondeado sin decimales'],
    ['comparar', { op: 'comparar', de: ['remate', 'fees'], cmp: '>=' }, 'Remate ≥ Fees'],
    ['comparar distinto', { op: 'comparar', de: ['remate', 'fees'], cmp: '<>' }, 'Remate ≠ Fees'],
    [
      'es_opcion',
      { op: 'es_opcion', de: ['variante'], cmp: '=', clave: 'peru' },
      'Variante es «Perú»',
    ],
    [
      'es_opcion distinto',
      { op: 'es_opcion', de: ['variante'], cmp: '<>', clave: 'chile' },
      'Variante no es «Chile»',
    ],
    ['y', { op: 'y', de: ['b', 'c'] }, 'Bandera B está encendida y Bandera C está encendida'],
    [
      'o de tres',
      { op: 'o', de: ['b', 'c', 'b'] },
      'Bandera B está encendida, Bandera C está encendida o Bandera B está encendida',
    ],
    [
      'elegir con las dos ramas',
      { op: 'elegir', de: ['remate', 'fees'], prueba: 'b' },
      'Remate si Bandera B está encendida, si no Fees',
    ],
    [
      'elegir sin la rama «si no»',
      { op: 'elegir', de: ['remate'], prueba: 'b' },
      'Remate si Bandera B está encendida, si no 0',
    ],
    ['max', { op: 'max', de: ['remate', 'fees', 'flete'] }, 'el mayor de Remate, Fees y Flete'],
    ['min', { op: 'min', de: ['remate', 'fees'] }, 'el menor de Remate y Fees'],
    ['min de uno', { op: 'min', de: ['remate'] }, 'el menor de Remate'],
  ])('%s', (_, resto, esperada) => {
    const dicha = frase(calculo(resto))
    expect(dicha).toBe(esperada)
    expect(dicha).not.toMatch(/\bremate\b|\bfees\b/)
  })
})

describe('deDondeSale: las auxiliares se dicen en línea', () => {
  const formula = formulaDePrueba([
    { id: 'base', texto: '=remate+fees', etiqueta: 'Base' },
    { id: 'comision', texto: '=(remate+fees)*4%', etiqueta: 'Comisión' },
    { id: 'redondo', texto: '=REDONDEAR(base*1.5; 2)', etiqueta: 'Redondo' },
    { id: 'final', texto: '=comision+base+150', etiqueta: 'Final' },
  ])
  const ctx = contextoDeDondeSale(formula, 'es-BO')
  const dicha = (id: string) => {
    const n = nodoDe(formula, id)
    if (n === undefined) throw new Error('falta el nodo')
    return deDondeSale(n, ctx)
  }

  it('un cálculo auxiliar va entre paréntesis y una constante auxiliar con su valor, en porcentaje con el locale', () => {
    // El espacio antes del «%» depende de la versión de ICU: se compara con el mismo formateador.
    expect(dicha('comision')).toBe(
      `(Remate + Fees) × ${formatearPorcentaje(0.04, { locale: 'es-BO' })}`,
    )
  })

  it('una fila nombrada por otra se dice por su etiqueta, no se expande', () => {
    expect(dicha('final')).toBe('Comisión + Base + 150')
  })

  it('las auxiliares anidadas se expanden todas, con los números en el locale', () => {
    expect(dicha('redondo')).toBe('(Base × 1,5) redondeado a 2 decimales')
  })
})

describe('deDondeSale: nunca lanza', () => {
  it('una referencia que no existe se dice «una fila que no está»', () => {
    expect(frase(calculo({ op: 'suma', de: ['remate', 'fantasma'] }))).toBe(
      'Remate + una fila que no está',
    )
  })

  it('una constante auxiliar sin valor en params se dice por su etiqueta', () => {
    const formula = formulaCruda(
      [
        ...BASE,
        { id: 'fila__1', tipo: 'constante', etiqueta: 'Cuatro', formato: 'pct' },
        { ...calculo({ op: 'multiplicar', de: ['remate', 'fila__1'] }), texto: '=remate*4%' },
      ],
      PARAMS,
    )
    const n = nodoDe(formula, 'fila') as Nodo
    expect(deDondeSale(n, contextoDeDondeSale(formula, 'es-BO'))).toBe('Remate × Cuatro')
  })
})

describe('deDondeSale: lineal con el medidor', () => {
  it('decir las 600 filas cuesta menos que k·n visitas', () => {
    const formula = formulaDeNFilas(600)
    const m = { visitas: 0 }
    const ctx = contextoDeDondeSale(formula, 'es-BO', m)
    for (const n of formula.definicion.nodos) deDondeSale(n, ctx, m)
    expect(m.visitas).toBeLessThan(20 * formula.definicion.nodos.length)
  })
})
