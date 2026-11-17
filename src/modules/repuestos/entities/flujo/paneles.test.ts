import { describe, expect, it } from 'vitest'
import { destinoDelPanelDe, itemAbiertoDe } from './paneles'

const ID = '11111111-1111-4111-8111-111111111111'

describe('el ítem abierto en la URL', () => {
  it('?item=<guid> lo abre', () => {
    expect(itemAbiertoDe({ item: ID })).toBe(ID)
  })

  it('con ?panel= (stock, imágenes o cualquiera) manda el panel de siempre', () => {
    expect(itemAbiertoDe({ item: ID, panel: 'stock' })).toBeNull()
    expect(itemAbiertoDe({ item: ID, panel: 'imagenes' })).toBeNull()
    expect(itemAbiertoDe({ item: ID, panel: '' })).toBeNull()
  })

  it('un valor que no es guid, vacío, repetido o ausente no abre nada', () => {
    expect(itemAbiertoDe({ item: 'hola' })).toBeNull()
    expect(itemAbiertoDe({ item: '' })).toBeNull()
    expect(itemAbiertoDe({ item: [ID, ID] })).toBeNull()
    expect(itemAbiertoDe({})).toBeNull()
  })
})

describe('el destino ya elegido del panel del ítem', () => {
  const FASE = '22222222-2222-4222-8222-222222222222'

  it('?destino=<guid> junto a un ítem abierto lo elige', () => {
    expect(destinoDelPanelDe({ item: ID, destino: FASE })).toBe(FASE)
  })

  it('sin ítem abierto (o con ?panel=) no elige nada', () => {
    expect(destinoDelPanelDe({ destino: FASE })).toBeNull()
    expect(destinoDelPanelDe({ item: ID, panel: 'stock', destino: FASE })).toBeNull()
  })

  it('un valor que no es guid, repetido o ausente no elige nada', () => {
    expect(destinoDelPanelDe({ item: ID, destino: 'x' })).toBeNull()
    expect(destinoDelPanelDe({ item: ID, destino: [FASE, FASE] })).toBeNull()
    expect(destinoDelPanelDe({ item: ID })).toBeNull()
  })
})
