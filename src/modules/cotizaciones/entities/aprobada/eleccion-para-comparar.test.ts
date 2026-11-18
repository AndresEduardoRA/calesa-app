import { describe, expect, it } from 'vitest'
import {
  ELIGE_PARA_COMPARAR,
  HASTA_TRES,
  alternar,
  ayudaDeComparar,
  casillaApagada,
  elegidasEnLaLista,
  puedeComparar,
} from './eleccion-para-comparar'

describe('las casillas de comparar', () => {
  it('alternar marca y desmarca, y no deja pasar a una cuarta', () => {
    expect(alternar([], 'a')).toEqual(['a'])
    expect(alternar(['a', 'b'], 'a')).toEqual(['b'])
    expect(alternar(['a', 'b', 'c'], 'd')).toEqual(['a', 'b', 'c'])
    expect(alternar(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('las elegidas van en el orden de la lista y se sueltan las que ya no están', () => {
    const filas = [{ id: 'aprobada' }, { id: 'nueva' }, { id: 'vieja' }]
    expect(elegidasEnLaLista(['vieja', 'aprobada'], filas)).toEqual(['aprobada', 'vieja'])
    expect(elegidasEnLaLista(['vieja', 'ida'], filas)).toEqual(['vieja'])
  })

  it('se compara con 2 o 3; con 3 se apagan las demás', () => {
    expect([0, 1, 2, 3, 4].map(puedeComparar)).toEqual([false, false, true, true, false])
    expect(casillaApagada(['a', 'b', 'c'], 'd')).toBe(true)
    expect(casillaApagada(['a', 'b', 'c'], 'a')).toBe(false)
    expect(casillaApagada(['a', 'b'], 'd')).toBe(false)
  })

  it('la ayuda junto a «Comparar»', () => {
    expect(ayudaDeComparar(0)).toBe(ELIGE_PARA_COMPARAR)
    expect(ayudaDeComparar(1)).toBe(ELIGE_PARA_COMPARAR)
    expect(ayudaDeComparar(2)).toBeNull()
    expect(ayudaDeComparar(3)).toBe(HASTA_TRES)
  })
})
