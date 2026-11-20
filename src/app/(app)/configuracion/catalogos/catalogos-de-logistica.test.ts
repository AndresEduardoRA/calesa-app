import { describe, expect, it } from 'vitest'
import type { CatalogoDeLogistica } from '@/modules/logistica'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { catalogosVisibles } from './catalogos-de-logistica'

const con = (clave: ClavePermiso, origenId: string | null = null): Permisos => [
  { clave, origenId, alcance: 'todos' },
]

const vacio = () => null
const lista: readonly CatalogoDeLogistica[] = [
  {
    clave: 'puertos',
    titulo: 'Puertos',
    descripcion: 'Los puertos.',
    permiso: 'logistica.catalogos.gestionar',
    componente: vacio,
  },
  {
    clave: 'gastos',
    titulo: 'Categorías de gasto',
    descripcion: 'Los gastos.',
    permiso: 'logistica.gastos.editar',
    componente: vacio,
  },
  {
    clave: 'puertos',
    titulo: 'Repetido',
    descripcion: 'Repetido.',
    permiso: 'logistica.catalogos.gestionar',
    componente: vacio,
  },
]

describe('catálogos de logística de Configuración › Catálogos', () => {
  it('transporte llena «Puertos» y «Navieras» y dinero «Categorías de gasto»: los ve quien gestiona los catálogos, en ese orden', () => {
    expect(catalogosVisibles(con('logistica.catalogos.gestionar')).map((c) => c.titulo)).toEqual([
      'Puertos',
      'Navieras',
      'Categorías de gasto',
    ])
  })

  it('sin la clave de gestionar los catálogos no se ve ninguno', () => {
    expect(catalogosVisibles([])).toEqual([])
    expect(catalogosVisibles(con('logistica.gastos.editar'))).toEqual([])
  })

  it('cada catálogo lo ve quien tiene su permiso, en el orden de la lista', () => {
    expect(
      catalogosVisibles(con('logistica.catalogos.gestionar'), lista).map((c) => c.clave),
    ).toEqual(['puertos'])
    const ambas: Permisos = [
      ...con('logistica.catalogos.gestionar'),
      ...con('logistica.gastos.editar'),
    ]
    expect(catalogosVisibles(ambas, lista).map((c) => c.clave)).toEqual(['puertos', 'gastos'])
  })

  it('sin la clave, o con la de otro catálogo, no ve ninguno; la clave en un origen también vale', () => {
    expect(catalogosVisibles([], lista)).toEqual([])
    expect(catalogosVisibles(con('logistica.ver'), lista)).toEqual([])
    expect(catalogosVisibles(con('logistica.catalogos.gestionar', 'o1'), lista)).toHaveLength(1)
  })

  it('una clave repetida deja el primer catálogo', () => {
    const ambas: Permisos = [
      ...con('logistica.catalogos.gestionar'),
      ...con('logistica.gastos.editar'),
    ]
    expect(catalogosVisibles(ambas, lista).find((c) => c.clave === 'puertos')?.titulo).toBe(
      'Puertos',
    )
  })
})
