import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { admiteEnPar, estaEnPar, ponerEnPar } from './en-par-del-editor'

const opcion = (claves: string[], extra: Record<string, unknown> = {}): Nodo =>
  ({
    id: 'contenedor',
    tipo: 'opcion',
    etiqueta: 'Contenedor',
    opciones: claves.map((c) => ({ clave: c, etiqueta: c, titulo: c })),
    ...extra,
  }) as Nodo
const precio: Nodo = { id: 'precio', tipo: 'input', etiqueta: 'Precio' } as Nodo
const formula = (nodos: Nodo[]): Formula =>
  ({ definicion: { nodos, buckets: {} }, params: {} }) as unknown as Formula

describe('ponerEnPar', () => {
  it('marca la variante de dos opciones y, al desmarcarla, quita la clave (la fórmula vuelve a ser la de antes)', () => {
    const antes = formula([opcion(['c20', 'c40']), precio])
    const enPar = ponerEnPar(antes, 'contenedor', true)
    expect(enPar.definicion.nodos[0]).toMatchObject({ en_par: true })
    expect(estaEnPar(enPar.definicion.nodos[0] as Nodo)).toBe(true)
    const despues = ponerEnPar(enPar, 'contenedor', false)
    expect(despues).toEqual(antes)
    expect(despues.definicion.nodos[0]).not.toHaveProperty('en_par')
  })

  it('no marca una variante de tres opciones ni otro nodo, y no copia lo que no cambia', () => {
    const tres = formula([opcion(['a', 'b', 'c']), precio])
    expect(ponerEnPar(tres, 'contenedor', true)).toBe(tres)
    expect(ponerEnPar(tres, 'precio', true)).toBe(tres)
    expect(ponerEnPar(tres, 'no_hay', true)).toBe(tres)
    const ya = formula([opcion(['a', 'b'], { en_par: true })])
    expect(ponerEnPar(ya, 'contenedor', true)).toBe(ya)
  })

  it('deja desmarcar una de tres que vino en par (la quita aunque no lo admita)', () => {
    const mala = formula([opcion(['a', 'b', 'c'], { en_par: true })])
    expect(ponerEnPar(mala, 'contenedor', false).definicion.nodos[0]).not.toHaveProperty('en_par')
  })
})

describe('admiteEnPar', () => {
  it('sólo la variante de exactamente dos opciones', () => {
    expect(admiteEnPar(opcion(['a', 'b']))).toBe(true)
    expect(admiteEnPar(opcion(['a', 'b', 'c']))).toBe(false)
    expect(admiteEnPar(precio)).toBe(false)
  })
})
