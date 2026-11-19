import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { filasDe } from './filas'
import { bandasDeLaPlanilla, celdaB, editableEnC, type BandaDeLaPlanilla } from './planilla'

const VARIANTE = {
  id: 'via',
  tipo: 'opcion',
  etiqueta: 'Vía',
  por_defecto: 'peru',
  opciones: [
    { clave: 'chile', etiqueta: 'Chile', titulo: 'Por Chile' },
    { clave: 'peru', etiqueta: 'Perú', titulo: 'Por Perú' },
  ],
}

const NODOS = [
  { id: 'tc_oficial', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC oficial' },
  { id: 'remate', tipo: 'input', etiqueta: 'Remate', grupo: 'afuera' },
  { id: 'fees', tipo: 'constante', etiqueta: 'Fees', grupo: 'afuera' },
  VARIANTE,
  { id: 'impuesto', tipo: 'constante', etiqueta: 'Impuesto', grupo: 'aduana' },
  { id: 'anio', tipo: 'campo_vehiculo', etiqueta: 'Año', campo: 'anio' },
  { id: 'tasa', tipo: 'constante', etiqueta: 'Tasa', formato: 'pct' },
  {
    id: 'comision',
    tipo: 'calculo',
    op: 'porcentaje_de',
    etiqueta: 'Comisión',
    de: ['remate'],
    pct: 'tasa',
    grupo: 'afuera',
  },
  { id: 'hibrido', tipo: 'bandera', etiqueta: 'Híbrido' },
  { id: 'tc_paralelo', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'TC paralelo' },
  {
    id: 'cif',
    tipo: 'calculo',
    op: 'suma',
    etiqueta: 'CIF',
    de: ['remate', 'fees'],
    salida: 'base_imponible',
  },
] as Nodo[]

const formula: Formula = {
  definicion: {
    nodos: NODOS,
    grupos: [
      { id: 'aduana', etiqueta: 'Aduana', tono: 'verde', bucket: 'b' },
      { id: 'afuera', etiqueta: 'Lado de afuera', tono: 'azul', bucket: 'b' },
      { id: 'vacio', etiqueta: 'Vacío', tono: 'azul', bucket: 'b' },
    ],
  },
  params: { constantes: { fees: 100, impuesto: 5, tasa: 0.04 }, tablas: {} },
}

const filas = filasDe(formula.definicion).map((f) => ({ id: f.nodo.id, nodo: f.nodo }))

// Lo que dice cada banda: su tipo (con el grupo) y sus filas como «número id».
const resumen = (bandas: BandaDeLaPlanilla<{ id: string }>[]) =>
  bandas.map((b) => {
    if (b.tipo === 'variante')
      return ['variante', b.opciones.map((o) => `${String(o.numero)} ${o.clave}`)]
    const titulo = b.tipo === 'grupo' ? `grupo ${b.grupo.id}` : b.tipo
    return [titulo, b.filas.map((f) => `${String(f.numero)} ${f.fila.id}`)]
  })

describe('bandasDeLaPlanilla', () => {
  it('el orden de V1, cada fila una vez, la unidad aunque tenga grupo y «Sin grupo» al final, numeradas en el orden en que se dibujan', () => {
    expect(resumen(bandasDeLaPlanilla(formula, filas))).toEqual([
      ['tipo_cambio', ['1 tc_oficial', '2 tc_paralelo']],
      ['unidad', ['3 remate', '4 via', '5 anio', '6 hibrido']],
      ['variante', ['7 chile', '8 peru']],
      ['grupo aduana', ['9 impuesto']],
      ['grupo afuera', ['10 fees', '11 comision']],
      ['grupo vacio', []],
      ['sin_grupo', ['12 tasa', '13 cif']],
    ])
  })

  it('la variante lista sus opciones con su título y cuál va por defecto', () => {
    const variante = bandasDeLaPlanilla(formula, filas).find((b) => b.tipo === 'variante')
    expect(variante).toMatchObject({
      nodo: { id: 'via' },
      opciones: [
        { clave: 'chile', etiqueta: 'Chile', titulo: 'Por Chile', porDefecto: false },
        { clave: 'peru', etiqueta: 'Perú', titulo: 'Por Perú', porDefecto: true },
      ],
    })
  })

  it('sólo las visibles, con el número que tienen entre todas; sin grupos vacíos al buscar', () => {
    const visibles = new Set(['comision', 'tasa', 'tc_paralelo'])
    expect(
      resumen(bandasDeLaPlanilla(formula, filas, { visibles, conGruposVacios: false })),
    ).toEqual([
      ['tipo_cambio', ['2 tc_paralelo']],
      ['grupo afuera', ['11 comision']],
      ['sin_grupo', ['12 tasa']],
    ])
  })

  it('sin grupos todo lo que no es de la unidad ni un tipo de cambio va a «Sin grupo»', () => {
    const sinGrupos: Formula = { ...formula, definicion: { nodos: NODOS } }
    const bandas = bandasDeLaPlanilla(sinGrupos, filas)
    expect(bandas.map((b) => b.tipo)).toEqual(['tipo_cambio', 'unidad', 'variante', 'sin_grupo'])
    expect(resumen(bandas).at(-1)).toEqual([
      'sin_grupo',
      ['9 fees', '10 impuesto', '11 tasa', '12 comision', '13 cif'],
    ])
  })

  it('una fila con un grupo que ya no existe va a «Sin grupo»', () => {
    const huerfana: Formula = {
      ...formula,
      definicion: {
        ...formula.definicion,
        grupos: [{ id: 'aduana', etiqueta: 'Aduana', tono: 'verde', bucket: 'b' }],
      },
    }
    const sin = bandasDeLaPlanilla(huerfana, filas).find((b) => b.tipo === 'sin_grupo')
    expect(sin?.tipo === 'sin_grupo' ? sin.filas.map((f) => f.fila.id) : null).toEqual([
      'fees',
      'tasa',
      'comision',
      'cif',
    ])
  })
})

describe('celdaB y editableEnC', () => {
  const nodos = new Map(NODOS.map((n) => [n.id, n]))
  const fila = (id: string) => ({ id, nodo: nodos.get(id) as Nodo })

  it('B es el pct de un porcentaje_de, editable si es una constante', () => {
    expect(celdaB(fila('comision'), nodos)).toEqual({ pct: 'tasa', editable: true })
    const conInput = new Map(nodos).set('tasa', {
      id: 'tasa',
      tipo: 'input',
      etiqueta: 'Tasa',
      formato: 'pct',
    })
    expect(celdaB(fila('comision'), conInput)).toEqual({ pct: 'tasa', editable: false })
  })

  it('B va vacía en cualquier otra fila', () => {
    expect(celdaB(fila('cif'), nodos)).toBeNull()
    expect(celdaB(fila('fees'), nodos)).toBeNull()
  })

  it('C se edita sólo en una constante', () => {
    expect(editableEnC(fila('fees'))).toBe(true)
    expect(editableEnC(fila('comision'))).toBe(false)
    expect(editableEnC(fila('remate'))).toBe(false)
  })
})
