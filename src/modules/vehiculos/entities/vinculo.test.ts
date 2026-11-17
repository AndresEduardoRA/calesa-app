import { describe, expect, it } from 'vitest'
import { LEAD_QUE_NO_VES, leadVinculadoDe, nombreDeLead, vinculosDesde } from './vinculo'

const LEAD = '00000000-0000-4000-8000-000000000001'
const OTRO = '00000000-0000-4000-8000-000000000002'
const vinculo = (lead: string, hasta: string | null, nombre: string | null = 'Ana Quispe') => ({
  lead_id: lead,
  lead_nombre: nombre,
  lead_numero: nombre ? 12 : null,
  lead_numero_propio: null,
  desde: '2026-10-01T12:00:00+00:00',
  hasta,
  por_nombre: 'Rosa Mamani',
})

describe('vinculosDesde', () => {
  it('separa el vínculo vigente de los anteriores', () => {
    const relaciones = vinculosDesde([
      vinculo(LEAD, null),
      vinculo(OTRO, '2026-09-30T12:00:00+00:00', null),
    ])
    expect(relaciones.vinculo).toMatchObject({ leadId: LEAD, leadNombre: 'Ana Quispe' })
    expect(relaciones.historial.map((uno) => uno.leadId)).toEqual([OTRO])
  })

  it('sin un vínculo abierto, el vehículo no es de ningún lead', () => {
    const relaciones = vinculosDesde([vinculo(LEAD, '2026-10-02T12:00:00+00:00')])
    expect(relaciones.vinculo).toBeNull()
    expect(relaciones.historial).toHaveLength(1)
  })
})

describe('nombreDeLead', () => {
  it('el nombre si quien mira ve al lead; si no, lo dice sin nombrarlo', () => {
    expect(nombreDeLead({ leadNombre: 'Ana Quispe' })).toBe('Ana Quispe')
    expect(nombreDeLead({ leadNombre: null })).toBe(LEAD_QUE_NO_VES)
  })
})

describe('leadVinculadoDe', () => {
  it('el lead vigente que quien mira ve, con sus números', () => {
    expect(leadVinculadoDe(vinculosDesde([vinculo(LEAD, null)]))).toEqual({
      id: LEAD,
      nombre: 'Ana Quispe',
      numeros: { numero: 12, numeroPropio: null, creadorDelPropio: null },
    })
  })

  it('un vigente que no se ve no se propone, igual que un vehículo sin vínculo vigente', () => {
    expect(leadVinculadoDe(vinculosDesde([vinculo(LEAD, null, null)]))).toBeNull()
    expect(leadVinculadoDe(vinculosDesde([vinculo(LEAD, '2026-10-02T12:00:00+00:00')]))).toBeNull()
    expect(leadVinculadoDe(vinculosDesde([]))).toBeNull()
  })
})
