import { describe, expect, it } from 'vitest'
import { COLUMNAS_DEL_LEAD_PARA_ENLAZAR, leadParaEnlazarDesde } from './lead-para-enlazar'

const ID = '00000000-0000-4000-8000-000000000001'

describe('leadParaEnlazarDesde', () => {
  it('arma el lead con sus números y si está en la cartera', () => {
    expect(
      leadParaEnlazarDesde({
        id: ID,
        nombre: 'Ana Pérez',
        numero: 120,
        numero_propio: 4,
        numero_propio_creador: 'Berta',
        en_cartera: false,
      }),
    ).toEqual({
      id: ID,
      nombre: 'Ana Pérez',
      numeros: { numero: 120, numeroPropio: 4, creadorDelPropio: 'Berta' },
      enCartera: false,
    })
  })

  it('un número que no se ve llega nulo y no se inventa', () => {
    expect(
      leadParaEnlazarDesde({ id: ID, nombre: 'Ana', numero: null, en_cartera: true })?.numeros,
    ).toEqual({ numero: null, numeroPropio: null, creadorDelPropio: null })
  })

  it('una forma rota es nula', () => {
    expect(leadParaEnlazarDesde({ id: 'x', nombre: 'Ana', en_cartera: true })).toBeNull()
    expect(leadParaEnlazarDesde({ id: ID, nombre: 'Ana' })).toBeNull()
    expect(leadParaEnlazarDesde(null)).toBeNull()
  })

  it('nunca pide una columna de teléfono', () => {
    expect(COLUMNAS_DEL_LEAD_PARA_ENLAZAR).not.toMatch(/telefono/)
  })
})
