import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { accesoDeCotizacion, primeraDeCotizacion } from './acceso'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

const permisos = (claves: Partial<Record<ClavePermiso, string[] | 'global'>>): Permisos =>
  Object.entries(claves).flatMap(([clave, donde]) =>
    (donde === 'global' ? [null] : (donde ?? [])).map((origenId) => ({
      clave: clave as ClavePermiso,
      origenId,
      alcance: 'todos' as const,
    })),
  )

describe('accesoDeCotizacion', () => {
  it('los orígenes que configura, en el orden del catálogo', () => {
    const acceso = accesoDeCotizacion(permisos({ 'cotizaciones.configurar': [B] }), [
      { id: A },
      { id: B },
    ])
    expect(acceso).toEqual({ origenes: [B], configura: true, veNiveles: false })
  })

  it('quien ve o gestiona los roles ve los niveles', () => {
    expect(accesoDeCotizacion(permisos({ 'equipo.roles.ver': 'global' }), [{ id: A }])).toEqual({
      origenes: [],
      configura: false,
      veNiveles: true,
    })
    expect(accesoDeCotizacion(permisos({ 'equipo.roles.gestionar': 'global' }), []).veNiveles).toBe(
      true,
    )
  })
})

describe('primeraDeCotizacion', () => {
  it('la pestaña pedida (o la fórmula) del primer origen', () => {
    const acceso = { origenes: [A, B], configura: true, veNiveles: true }
    expect(primeraDeCotizacion(acceso)).toBe(`/configuracion/cotizacion/${A}/formula`)
    expect(primeraDeCotizacion(acceso, 'tablas')).toBe(`/configuracion/cotizacion/${A}/tablas`)
  })

  it('sin orígenes, Colores; sin configurar, Niveles; sin nada, null', () => {
    expect(primeraDeCotizacion({ origenes: [], configura: true, veNiveles: true })).toBe(
      '/configuracion/cotizacion/general/colores',
    )
    expect(primeraDeCotizacion({ origenes: [], configura: false, veNiveles: true })).toBe(
      '/configuracion/cotizacion/general/niveles',
    )
    expect(primeraDeCotizacion({ origenes: [], configura: false, veNiveles: false })).toBeNull()
  })
})
