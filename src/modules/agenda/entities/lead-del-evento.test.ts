import { describe, expect, it } from 'vitest'
import { cambioDelLead } from './lead-del-evento'

const A = { id: '0b8f3a2e-1c4d-4e5f-8a9b-1c2d3e4f5a6b', nombre: 'Ana' }
const B = { id: '1c9e4b3f-2d5e-4f60-9bac-2d3e4f5a6b7c', nombre: null }

describe('cambioDelLead', () => {
  it('sin valor en el formulario no se toca', () => {
    expect(cambioDelLead(A, undefined)).toEqual({})
  })

  it('otro lead manda su id; quitarlo manda null; ponerlo donde no había, su id', () => {
    expect(cambioDelLead(A, B)).toEqual({ lead_id: B.id })
    expect(cambioDelLead(A, null)).toEqual({ lead_id: null })
    expect(cambioDelLead(null, A)).toEqual({ lead_id: A.id })
  })

  it('el mismo id no es un cambio, aunque cambie el nombre', () => {
    expect(cambioDelLead(A, { id: A.id, nombre: null })).toEqual({})
    expect(cambioDelLead(null, null)).toEqual({})
  })
})
