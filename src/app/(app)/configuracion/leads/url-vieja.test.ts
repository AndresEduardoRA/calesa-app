import { describe, expect, it } from 'vitest'
import { comoBusqueda } from './url-vieja'

describe('comoBusqueda', () => {
  it('pasa cada valor, también los que se repiten, y salta los vacíos', () => {
    expect(comoBusqueda({ seccion: 'tipos', panel: ['a', 'b'], otro: undefined }).toString()).toBe(
      'seccion=tipos&panel=a&panel=b',
    )
  })
})
