import { describe, expect, it } from 'vitest'
import { MARCADOR_DE_LEAD, rutaDelLead } from './ruta-por-lead'

const ID = '7d1f3c2a-9b4e-4c1d-8a2f-0e6b5c4d3a21'

describe('rutaDelLead', () => {
  it('pone el id del lead donde estaba el marcador, también armado con URLSearchParams', () => {
    const plantilla = `/cotizaciones/nuevo?${new URLSearchParams({ origen: 'o1', lead: MARCADOR_DE_LEAD }).toString()}`
    expect(rutaDelLead(plantilla, ID)).toBe(`/cotizaciones/nuevo?origen=o1&lead=${ID}`)
  })

  it('sin marcador, la ruta queda igual', () => {
    expect(rutaDelLead('/actividad', ID)).toBe('/actividad')
  })

  it('un id raro no rompe la consulta', () => {
    expect(rutaDelLead(`/x?lead=${MARCADOR_DE_LEAD}`, 'a&b=c')).toBe('/x?lead=a%26b%3Dc')
  })
})
