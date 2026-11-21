import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { FORMULA_A1 } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { cambiarNombre, duplicarFila, insertarFila } from './insertar-fila'
import { aA1 } from './referencias-a1'

const ids = (f: Formula) => f.definicion.nodos.map((n) => n.id)
const nodo = (f: Formula, id: string) => f.definicion.nodos.find((n) => n.id === id)

describe('insertarFila', () => {
  it('arriba de la 5: un valor fijo en 0 y lo de abajo se ve corrido (=C5+C7 pasa a =C6+C8)', () => {
    expect(aA1('=agencia+cif', hojaDeLaPlanilla(FORMULA_A1)).texto).toBe('=C5+C7')
    const r = insertarFila(FORMULA_A1, { junto: 5, lado: 'arriba' })
    expect(r.id).toBe('fila_nueva')
    expect(nodo(r.formula, 'fila_nueva')).toEqual({
      id: 'fila_nueva',
      tipo: 'constante',
      etiqueta: 'Fila nueva',
      formato: 'usd',
    })
    expect(r.formula.params.constantes['fila_nueva']).toBe(0)
    const hoja = hojaDeLaPlanilla(r.formula)
    expect(hoja.numeroDe.get('fila_nueva')).toBe(5)
    expect(aA1('=agencia+cif', hoja).texto).toBe('=C6+C8')
    expect(aA1('=agencia_pct', hoja).texto).toBe('=B6')
  })

  it('abajo va después de la fila y de sus auxiliares; el id no choca', () => {
    const r = insertarFila(FORMULA_A1, { junto: 6, lado: 'abajo' })
    expect(ids(r.formula).slice(6, 10)).toEqual(['seguro__1', 'seguro', 'fila_nueva', 'cif'])
    const otra = insertarFila(r.formula, { junto: 1, lado: 'arriba' })
    expect(otra.id).toBe('fila_nueva_2')
    expect(ids(otra.formula)[0]).toBe('fila_nueva_2')
  })

  it('toma la banda de la fila de referencia', () => {
    const nodos = FORMULA_A1.definicion.nodos.map((n) =>
      n.id === 'fees' ? { ...n, grupo: 'primer_pago' } : n,
    )
    const f = { ...FORMULA_A1, definicion: { ...FORMULA_A1.definicion, nodos } }
    expect(nodo(insertarFila(f, { junto: 3, lado: 'abajo' }).formula, 'fila_nueva')?.grupo).toBe(
      'primer_pago',
    )
  })

  it('en una fórmula vacía es la primera fila', () => {
    const vacia: Formula = { definicion: { nodos: [] }, params: { constantes: {}, tablas: {} } }
    expect(ids(insertarFila(vacia, { junto: null, lado: 'abajo' }).formula)).toEqual(['fila_nueva'])
  })
})

describe('duplicarFila', () => {
  const duplicar = (f: Formula, numero: number) => {
    const r = duplicarFila(f, numero)
    if (!r.ok) throw new Error(r.mensaje)
    return r
  }

  it('un valor fijo: con su valor, debajo y con un id nuevo', () => {
    const r = duplicar(FORMULA_A1, 3)
    expect(r.id).toBe('fees_2')
    expect(ids(r.formula).slice(2, 4)).toEqual(['fees', 'fees_2'])
    expect(nodo(r.formula, 'fees_2')?.etiqueta).toBe('Fees (copia)')
    expect(r.formula.params.constantes['fees_2']).toBe(100)
  })

  it('una fila con la pct absorbida la clona y la copia la absorbe', () => {
    const r = duplicar(FORMULA_A1, 5)
    expect(r.id).toBe('agencia_2')
    expect(ids(r.formula).slice(4, 8)).toEqual([
      'agencia_pct',
      'agencia',
      'agencia_2_pct',
      'agencia_2',
    ])
    expect(r.formula.params.constantes['agencia_2_pct']).toBe(0.04)
    const hoja = hojaDeLaPlanilla(r.formula)
    expect(aA1('=agencia_2_pct', hoja).texto).toBe('=B6')
  })

  it('una fila con texto se recompila en su lugar nuevo, con sus auxiliares', () => {
    const r = duplicar(FORMULA_A1, 6)
    expect(ids(r.formula).slice(6, 10)).toEqual(['seguro__1', 'seguro', 'seguro_2__1', 'seguro_2'])
    expect(r.formula.params.constantes['seguro_2__1']).toBe(0.02)
    const copia = nodo(r.formula, 'seguro_2')
    expect(copia).toMatchObject({ op: 'porcentaje_de', de: ['fees'], pct: 'seguro_2__1' })
  })

  it('la copia de la fila del total no es el total', () => {
    const r = duplicar(FORMULA_A1, 8)
    expect(nodo(r.formula, 'total_2')).not.toHaveProperty('salida')
  })

  it('la variante no se duplica', () => {
    const variante = {
      id: 'via',
      tipo: 'opcion',
      etiqueta: 'Vía',
      por_defecto: 'a',
      opciones: [],
    } as unknown as Nodo
    const f = {
      ...FORMULA_A1,
      definicion: { ...FORMULA_A1.definicion, nodos: [variante, ...FORMULA_A1.definicion.nodos] },
    }
    expect(duplicarFila(f, 1)).toEqual({
      ok: false,
      mensaje: 'Esta fórmula ya tiene una variante (C1).',
    })
  })
})

describe('cambiarNombre', () => {
  it('cambia sólo los nombres enteros', () => {
    expect(cambiarNombre('=PORCENTAJE_DE(a; a_pct)+a_pct2+"a_pct"', 'a_pct', 'b_pct')).toBe(
      '=PORCENTAJE_DE(a; b_pct)+a_pct2+"a_pct"',
    )
  })
})
