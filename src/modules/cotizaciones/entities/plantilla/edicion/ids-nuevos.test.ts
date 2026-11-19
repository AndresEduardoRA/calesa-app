import { describe, expect, it } from 'vitest'
import { ES_ID } from '../../json-de-la-base'
import { idNuevo, idsNuevos } from './ids-nuevos'

describe('idNuevo', () => {
  it('el menor número libre, en base 36', () => {
    expect(idNuevo('c', new Set())).toBe('c1')
    expect(idNuevo('c', new Set(['c1', 'c3']))).toBe('c2')
    const hasta9 = new Set(Array.from({ length: 9 }, (_, i) => `f${String(i + 1)}`))
    expect(idNuevo('f', hasta9)).toBe('fa')
  })
  it('varios seguidos, sin repetirse, y todos válidos para la base', () => {
    const ids = idsNuevos('k', new Set(['k2']), 4)
    expect(ids).toEqual(['k1', 'k3', 'k4', 'k5'])
    for (const id of ids) expect(ES_ID.test(id)).toBe(true)
    expect(idsNuevos('c', new Set(), 0)).toEqual([])
  })
})
