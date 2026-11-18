import { describe, expect, it } from 'vitest'
import type { CatalogosDeLaHoja } from './hoja'
import { queEsElItem } from './que-es'

const CATALOGOS: CatalogosDeLaHoja = {
  tipo_pieza: {
    valores: [
      { id: 't1', nombre: 'Bomba de agua', activo: true },
      { id: 't2', nombre: 'Faro', activo: false },
    ],
  },
  condicion: { valores: [{ id: 'c1', nombre: 'Usado', activo: true }] },
  pais_origen: { valores: [] },
  modo_transporte: { valores: [] },
}

describe('queEsElItem', () => {
  it('tipo y condición juntos', () => {
    expect(queEsElItem({ tipoPiezaId: 't1', condicionId: 'c1' }, CATALOGOS)).toBe(
      'Bomba de agua · Usado',
    )
  })
  it('con uno solo, ese', () => {
    expect(queEsElItem({ tipoPiezaId: 't1', condicionId: null }, CATALOGOS)).toBe('Bomba de agua')
    expect(queEsElItem({ tipoPiezaId: null, condicionId: 'c1' }, CATALOGOS)).toBe('Usado')
  })
  it('sin ninguno, nulo', () => {
    expect(queEsElItem({ tipoPiezaId: null, condicionId: null }, CATALOGOS)).toBeNull()
  })
  it('un valor desactivado sigue nombrado', () => {
    expect(queEsElItem({ tipoPiezaId: 't2', condicionId: null }, CATALOGOS)).toBe('Faro')
  })
  it('un id que ya no está se omite', () => {
    expect(queEsElItem({ tipoPiezaId: 'otro', condicionId: 'c1' }, CATALOGOS)).toBe('Usado')
  })
})
