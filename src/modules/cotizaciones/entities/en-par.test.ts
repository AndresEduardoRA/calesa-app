import { describe, expect, it } from 'vitest'
import juego from './casos-de-en-par.json'
import type { Definicion } from './formula'
import { nodosEnPar, varianteEnPar } from './en-par'

type Caso = { nombre: string; definicion: unknown; en_par: string[] }
const casos = juego.casos as Caso[]
const def = (c: Caso) => c.definicion as Pick<Definicion, 'nodos'>

describe('nodosEnPar (casos-de-en-par.json, el mismo juego que _nodos_en_par de la base)', () => {
  it.each(casos.map((c) => [c.nombre, c] as const))('%s', (_, c) => {
    expect([...nodosEnPar(def(c))]).toEqual(c.en_par)
  })

  it('el juego cubre lo directo, el match, lo indirecto y los que nunca', () => {
    expect(casos.length).toBeGreaterThanOrEqual(8)
  })
})

describe('varianteEnPar', () => {
  it('la variante con en_par, o nada', () => {
    expect(varianteEnPar(def(casos[1] as Caso))?.id).toBe('contenedor')
    expect(varianteEnPar(def(casos[0] as Caso))).toBeUndefined()
  })
})
