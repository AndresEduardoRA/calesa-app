import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import { referenciasDe } from '../nodos-referencias'
import { FORMULA_A1 } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { moverFila, puedeMover } from './mover-fila'
import { aA1 } from './referencias-a1'
import { indiceDeUsos } from './usos-de-la-fila'

const ids = (f: Formula) => f.definicion.nodos.map((n) => n.id)

// Ningún nodo nombra uno de más abajo en la lista (`referencia_hacia_adelante`).
function haciaAdelante(f: Formula): string[] {
  const lugar = new Map(f.definicion.nodos.map((n, i) => [n.id, i]))
  return f.definicion.nodos.flatMap((n, i) =>
    referenciasDe(n)
      .filter((r) => (lugar.get(r.id) ?? -1) > i)
      .map((r) => `${n.id} → ${r.id}`),
  )
}

const mover = (numero: number, destino: Parameters<typeof moverFila>[2]) =>
  moverFila(FORMULA_A1, numero, destino)

describe('moverFila', () => {
  it('bajar una fila que nadie nombra en el tramo: las referencias se ven corridas', () => {
    const r = mover(2, { despuesDe: 4 })
    if (!r.ok) throw new Error(r.mensaje)
    expect(ids(r.formula).slice(0, 4)).toEqual(['tc', 'fees', 'flete', 'remate'])
    expect(aA1('=remate+fees', hojaDeLaPlanilla(r.formula)).texto).toBe('=C4+C2')
    expect(haciaAdelante(r.formula)).toEqual([])
  })

  it('bajarla debajo de una fila que la usa se rechaza con su motivo', () => {
    expect(mover(2, { despuesDe: 5 })).toEqual({
      ok: false,
      mensaje: 'C5 usa esta fila: no puede quedar arriba de ella.',
      fila: 5,
    })
    expect(mover(2, { antesDe: 8 })).toMatchObject({ ok: false, fila: 5 })
  })

  it('subirla arriba de una fila que usa se rechaza con la más cercana', () => {
    expect(mover(7, { antesDe: 3 })).toEqual({
      ok: false,
      mensaje: 'Esta fila usa C4: no puede quedar arriba de ella.',
      fila: 4,
    })
    expect(mover(6, { despuesDe: 0 })).toMatchObject({ ok: false, fila: 3 })
  })

  it('la pct absorbida viaja con su fila y queda justo antes de ella', () => {
    const r = mover(5, { antesDe: 3 })
    if (!r.ok) throw new Error(r.mensaje)
    expect(ids(r.formula).slice(0, 5)).toEqual(['tc', 'remate', 'agencia_pct', 'agencia', 'fees'])
    expect(aA1('=agencia_pct', hojaDeLaPlanilla(r.formula)).texto).toBe('=B3')
    expect(haciaAdelante(r.formula)).toEqual([])
  })

  it('las auxiliares viajan con su fila', () => {
    const r = mover(6, { despuesDe: 7 })
    if (!r.ok) throw new Error(r.mensaje)
    expect(ids(r.formula).slice(6)).toEqual(['cif', 'seguro__1', 'seguro', 'total'])
  })

  it('arriba de todo y al final', () => {
    const arriba = mover(3, { despuesDe: 0 })
    expect(arriba.ok && ids(arriba.formula)[0]).toBe('fees')
    const abajo = mover(1, { despuesDe: 8 })
    expect(abajo.ok && ids(abajo.formula).at(-1)).toBe('tc')
  })

  it('a su mismo lugar no cambia nada', () => {
    expect(mover(3, { antesDe: 4 })).toEqual({ ok: true, formula: FORMULA_A1 })
    expect(mover(3, { despuesDe: 2 })).toEqual({ ok: true, formula: FORMULA_A1 })
  })

  it('una fila que no existe', () => {
    expect(mover(3, { despuesDe: 40 })).toMatchObject({ ok: false, mensaje: 'Esa fila no existe.' })
  })

  it('puedeMover dice lo mismo sin mover', () => {
    const indice = indiceDeUsos(FORMULA_A1, hojaDeLaPlanilla(FORMULA_A1))
    expect(puedeMover(FORMULA_A1, 2, { despuesDe: 4 }, indice)).toBe(true)
    expect(puedeMover(FORMULA_A1, 2, { despuesDe: 5 }, indice)).toBe(false)
  })
})
