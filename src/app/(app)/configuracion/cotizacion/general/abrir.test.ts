import { describe, expect, it, vi } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'

vi.mock('server-only', () => ({}))
vi.mock('@/modules/equipo', () => ({ requerirSesion: vi.fn() }))
vi.mock('@/modules/origenes', () => ({ getOrigenes: vi.fn() }))

const { pestanasGenerales } = await import('./abrir')

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

describe('pestanasGenerales', () => {
  it('con las dos claves, las tres abiertas', () => {
    expect(
      pestanasGenerales(con('cotizaciones.configurar', 'equipo.roles.ver')).map((p) => [
        p.clave,
        p.motivo,
      ]),
    ).toEqual([
      ['colores', undefined],
      ['niveles', undefined],
      ['vigencia', undefined],
    ])
  })

  it('quien configura sin ver los roles, Niveles apagada con su motivo', () => {
    expect(pestanasGenerales(con('cotizaciones.configurar'))[1]).toEqual({
      clave: 'niveles',
      titulo: 'Niveles',
      ruta: '/configuracion/cotizacion/general/niveles',
      motivo: 'Te falta el permiso «Ver roles».',
    })
  })

  it('quien sólo ve los roles, sólo Niveles', () => {
    expect(pestanasGenerales(con('equipo.roles.ver')).map((p) => p.clave)).toEqual(['niveles'])
  })
})
