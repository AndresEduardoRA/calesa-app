import { describe, expect, it, vi } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { paraRelacionadosDe } from './para-relacionados'

// `@/modules/cotizaciones` trae composición con `server-only`: en Vitest el import llega entero y cae.
vi.mock('server-only', () => ({}))

const O1 = '00000000-0000-4000-8000-000000000001'
const O2 = '00000000-0000-4000-8000-000000000002'
const ORIGENES = [
  { id: O1, activo: true },
  { id: O2, activo: false },
]
const permisos = (...claves: { clave: string; origen?: string | null }[]): Permisos =>
  claves.map(({ clave, origen = null }) => ({
    clave,
    origenId: origen,
    alcance: 'todos',
  })) as unknown as Permisos

describe('paraRelacionadosDe', () => {
  it('cotizar sólo donde se puede crear y ver, y el origen está activo', () => {
    const para = paraRelacionadosDe(
      permisos(
        { clave: 'cotizaciones.crear' },
        { clave: 'cotizaciones.ver' },
        { clave: 'leads.editar' },
      ),
      ORIGENES,
    )
    expect(para.cotizarEn.map((uno) => uno.origenId)).toEqual([O1])
    expect(para.cotizarEn[0]?.ruta).toContain(`origen=${O1}`)
    expect(para.rutaDeCotizacion).toBe('/cotizaciones/:id')
    expect(para.editarLeads).toBe(true)
    expect(para.claveDelVehiculo).toBe('vehiculo')
    expect(para.claveDelLead).toBe('lead')
  })

  it('sin cotizaciones.ver no hay ruta de cotización ni dónde cotizar; sin leads.editar no se edita', () => {
    const para = paraRelacionadosDe(permisos({ clave: 'cotizaciones.crear' }), ORIGENES)
    expect(para.cotizarEn).toEqual([])
    expect(para.rutaDeCotizacion).toBeNull()
    expect(para.editarLeads).toBe(false)
  })
})
