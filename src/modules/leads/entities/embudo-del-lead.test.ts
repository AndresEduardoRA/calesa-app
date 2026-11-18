import { describe, expect, it } from 'vitest'
import { leadDelEmbudoPedido, rutaDelEmbudoDelLead, vacioDelEmbudoDelLead } from './embudo-del-lead'

const EMBUDO = '11111111-1111-4111-8111-111111111111'
const LEAD = '22222222-2222-4222-8222-222222222222'

describe('leadDelEmbudoPedido', () => {
  it('un id vale; lo demás se ignora', () => {
    expect(leadDelEmbudoPedido(LEAD)).toBe(LEAD)
    expect(leadDelEmbudoPedido('ana')).toBeNull()
    expect(leadDelEmbudoPedido(undefined)).toBeNull()
  })
})

describe('rutaDelEmbudoDelLead', () => {
  it('la vista de embudo con el embudo y el lead', () => {
    expect(rutaDelEmbudoDelLead(EMBUDO, LEAD)).toBe(
      `/leads?vista=embudo&embudo=${EMBUDO}&lead=${LEAD}`,
    )
  })
  it('sin embudo, el que elija la vista', () => {
    expect(rutaDelEmbudoDelLead(null, LEAD)).toBe(`/leads?vista=embudo&lead=${LEAD}`)
  })
})

describe('vacioDelEmbudoDelLead', () => {
  it('nombra al lead y al embudo', () => {
    expect(vacioDelEmbudoDelLead('Ana Pérez', 'Ventas')).toBe(
      'Ana Pérez no tiene oportunidades en «Ventas».',
    )
  })
})
