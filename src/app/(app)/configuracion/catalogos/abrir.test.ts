import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'

vi.mock('server-only', () => ({}))
const requerirSesion = vi.fn()
vi.mock('@/modules/equipo', () => ({ requerirSesion }))
const redirigir = vi.fn((destino: string) => {
  throw new Error(`redirige a ${destino}`)
})
vi.mock('@/shared/lib/navegacion', () => ({ redirigir }))

const { abrirCatalogo } = await import('./abrir')

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

const conSesion = (permisos: Permisos) => requerirSesion.mockResolvedValue({ permisos })

describe('abrirCatalogo', () => {
  beforeEach(() => {
    requerirSesion.mockReset()
    redirigir.mockClear()
  })

  it('con el permiso de la sub-sección, la abre con su título', async () => {
    conSesion(con('cotizaciones.configurar'))
    const abierto = await abrirCatalogo('colores')
    expect(abierto.sinPermiso).toBe(false)
    expect(abierto.sinPermiso ? null : abierto.sub.titulo).toBe('Colores')
  })

  it('quien configura un flujo lee los tipos de documento', async () => {
    conSesion(con('flujos.configurar'))
    expect((await abrirCatalogo('tipos-de-documento')).sinPermiso).toBe(false)
  })

  it('sin el permiso de esa, lleva a la primera que abre', async () => {
    conSesion(con('equipo.roles.ver'))
    await expect(abrirCatalogo('colores')).rejects.toThrow(
      'redirige a /configuracion/catalogos/niveles',
    )
  })

  it('sin ninguna, «No tienes permiso»', async () => {
    conSesion(con('leads.ver'))
    expect(await abrirCatalogo('vigencia')).toEqual({ sinPermiso: true })
  })
})
