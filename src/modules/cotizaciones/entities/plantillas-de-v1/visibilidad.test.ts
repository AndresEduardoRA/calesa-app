import { describe, expect, it } from 'vitest'
import { visibilidadDeLaPlantilla } from './visibilidad'
import { plantillaDeV1 } from '.'

describe('visibilidadDeLaPlantilla', () => {
  const usa = visibilidadDeLaPlantilla(plantillaDeV1('usa'))

  it('lo que dibuja la hoja, del nivel «todos»: celdas, subtotales, la variante, los interruptores y el pct de un par', () => {
    for (const id of [
      'remate',
      'tc_paralelo',
      'cif',
      'variante',
      'cuenta_especial_usa',
      'fees_pct',
    ]) {
      expect(usa[id]).toEqual({ ver: 'todos', editar: 'todos' })
    }
  })

  it('el total y lo aparte siempre; lo que no se dibuja, no', () => {
    expect(usa['total']).toBeDefined()
    expect(usa['garantia']).toBeDefined()
    expect(usa['fob']).toBeUndefined()
    expect(usa['factor']).toBeUndefined()
  })
})
