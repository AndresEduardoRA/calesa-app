import { describe, expect, it } from 'vitest'
import { nuevoProyectoALaVista, nuevoProyectoEnLaUrl } from './paneles'

describe('nuevoProyectoEnLaUrl', () => {
  it('con `?panel=nuevo-proyecto` o con `?nuevo=proyecto` debajo de otro panel', () => {
    expect(nuevoProyectoEnLaUrl({ panel: 'nuevo-proyecto' })).toBe(true)
    expect(nuevoProyectoEnLaUrl({ nuevo: 'proyecto', panel: 'nuevo-lead' })).toBe(true)
    expect(nuevoProyectoEnLaUrl({ nuevo: 'proyecto' })).toBe(true)
  })

  it('sin ninguna de las dos, u otro valor, no', () => {
    expect(nuevoProyectoEnLaUrl({})).toBe(false)
    expect(nuevoProyectoEnLaUrl({ panel: 'nuevo-lead', nuevo: 'otro' })).toBe(false)
  })

  it('lee el primero de una clave repetida, como `searchParams`', () => {
    expect(nuevoProyectoEnLaUrl({ panel: ['nuevo-proyecto', 'x'] })).toBe(true)
  })
})

describe('nuevoProyectoALaVista', () => {
  it('abierto, o con `?nuevo=proyecto` y ningún `?panel=` encima', () => {
    expect(nuevoProyectoALaVista({ panel: 'nuevo-proyecto' })).toBe(true)
    expect(nuevoProyectoALaVista({ nuevo: 'proyecto', panel: null })).toBe(true)
  })

  it('con «Nuevo lead» encima, en la URL pero no a la vista', () => {
    expect(nuevoProyectoALaVista({ nuevo: 'proyecto', panel: 'nuevo-lead' })).toBe(false)
    expect(nuevoProyectoEnLaUrl({ nuevo: 'proyecto', panel: 'nuevo-lead' })).toBe(true)
  })

  it('sin el formulario en la URL, no', () => {
    expect(nuevoProyectoALaVista({ panel: 'filtros' })).toBe(false)
  })
})
